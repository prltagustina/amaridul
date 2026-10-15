import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, reprocannCases, reprocannDocuments } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { existingMemberInput, institutionalInput, registerExistingMember, submitExistingMemberRequest } from "@/server/existing-members";
import { addDocument, caseInput, documentInput, getReprocann, ReprocannError, reviewDocument, reviewInput, saveCase } from "@/server/reprocann";
import { existingMemberRequests } from "@/server/db/schema";
import { makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
let memberId: string;

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.reprocann@example.com")).id;
  const r = await submitExistingMemberRequest(
    ctx.db,
    { rings: ctx.rings, email: new MemoryEmailSender() },
    existingMemberInput.parse({ nombres: "Paciente", apellidos: "Ficticia", dni: "99000601", email: "paciente.ficticia@example.com", nacimiento: "1980-01-01", domicilio: "Calle 1", localidad: "Localidad", provincia: "Santa Fe", cp: "2000", numeroSocio: "", privacidad: true, confirmacion: true }),
    null,
  );
  const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, (r as { reference: string }).reference));
  await registerExistingMember(ctx.db, { email: new MemoryEmailSender(), baseURL: "https://amaridul.test", rings: ctx.rings }, adminId, row.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "paciente", since: "", minutesReference: "", status: "activo" }));
  memberId = (await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, row.id)))[0].linkedMemberId!;
});

const doc = (patch: Record<string, unknown> = {}) =>
  documentInput.parse({ kind: "credencial", permitIdentifier: "ID-FICTICIO-0001", issuedOn: "2026-01-10", expiresOn: "2027-01-10", source: "en_poder_de_la_asociacion", notes: "Copia entregada en la sede.", ...patch });

describe("REPROCANN documents loaded by the admin", () => {
  it("TEST J: a document the association holds is recorded, pending review, encrypted, and enables nothing", async () => {
    const id = await addDocument(ctx.db, ctx.rings.field, adminId, memberId, doc());
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, id));
    expect(row.reviewStatus).toBe("pendiente");
    expect(row.permitIdentifierEncrypted).not.toContain("ID-FICTICIO");
    expect(row.notesEncrypted).not.toContain("sede");
    expect(row.fileKey).toBeNull();

    const r = await getReprocann(ctx.db, ctx.rings.field, memberId);
    expect(r!.documents[0]).toMatchObject({ permitIdentifier: "ID-FICTICIO-0001", notes: "Copia entregada en la sede.", source: "en_poder_de_la_asociacion" });
    // No eligibility is stored anywhere: the case keeps its separate dimensions only.
    expect(Object.keys(r!.case)).not.toEqual(expect.arrayContaining(["eligible", "habilitada", "dispenseEligible"]));
    expect(r!.case.permitStatus).toBe("sin_permiso");

    const logs = JSON.stringify(await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_added")));
    expect(logs).not.toContain("ID-FICTICIO");
    expect(logs).not.toContain("sede");
  });

  it("rejects dates that do not make sense", () => {
    expect(documentInput.safeParse({ ...doc(), issuedOn: "2999-01-01" }).success).toBe(false);
    expect(documentInput.safeParse({ ...doc(), issuedOn: "2026-05-01", expiresOn: "2026-01-01" }).success).toBe(false);
  });

  it("a verification needs its date and is recorded with before and after", async () => {
    const id = await addDocument(ctx.db, ctx.rings.field, adminId, memberId, doc({ kind: "constancia_vinculacion", permitIdentifier: "" }));
    await expect(reviewDocument(ctx.db, adminId, id, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "" }))).rejects.toBeInstanceOf(ReprocannError);
    await reviewDocument(ctx.db, adminId, id, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-10-14" }));
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, id));
    expect(row).toMatchObject({ reviewStatus: "verificada", verifiedOn: "2026-10-14", reviewedBy: adminId });
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_reviewed"));
    expect(log.metadata).toMatchObject({ reviewStatus_before: "pendiente", reviewStatus_after: "verificada" });
  });

  it("keeps 'informed by the medical team' apart from 'approved', and records each change", async () => {
    await saveCase(ctx.db, adminId, memberId, caseInput.parse({ permitStatus: "iniciado_informado", managementSource: "association", responsibleName: "Equipo médico", linkageStatus: "pendiente" }));
    await saveCase(ctx.db, adminId, memberId, caseInput.parse({ permitStatus: "aprobado", managementSource: "association", responsibleName: "Equipo médico", linkageStatus: "pendiente" }));
    const [c] = await ctx.db.select().from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
    expect(c).toMatchObject({ permitStatus: "aprobado", managementSource: "association", linkageStatus: "pendiente" });
    const history = (await getReprocann(ctx.db, ctx.rings.field, memberId))!.history.filter((h) => h.action === "reprocann.case_updated");
    expect(history.map((h) => [h.metadata?.permitStatus_before, h.metadata?.permitStatus_after])).toEqual([
      ["sin_permiso", "iniciado_informado"],
      ["iniciado_informado", "aprobado"],
    ]);
  });
});
