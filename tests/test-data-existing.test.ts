// The temporary test-deletion tool for «Ya soy socio/a» requests: it removes the request and what
// it created (member, account, person and DNI), never a member who was already on the register,
// and says why when it refuses.
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, existingMemberRequests, members, oneTimeTokens, personIdentities, persons, reprocannDocuments, user } from "@/server/db/schema";
import { addDocument, documentInput } from "@/server/reprocann";
import { addAdminDocument, adminUploadInput, memberFolder } from "@/server/reprocann-files";
import { LocalObjectStorage } from "@/server/storage/object-storage";
import { MemoryEmailSender } from "@/server/email/sender";
import { activateAccount } from "@/server/members";
import { existingMemberInput, institutionalInput, linkExistingMember, linkInput, registerExistingMember, submitExistingMemberRequest } from "@/server/existing-members";
import { DeleteNotAllowedError, deleteTestExistingMemberRequest } from "@/server/test-data";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.borrado.existentes@example.com")).id;
});

async function request(dni: string) {
  const r = await submitExistingMemberRequest(
    ctx.db,
    { rings: ctx.rings, email: new MemoryEmailSender() },
    existingMemberInput.parse({ nombres: "Persona", apellidos: "De Prueba", dni, email: `prueba.${dni}@example.com`, nacimiento: "", domicilio: "", localidad: "", provincia: "", cp: "", numeroSocio: "", privacidad: true, confirmacion: true }),
    null,
  );
  if (!r.ok) throw new Error("submit failed");
  const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, r.reference!));
  return row;
}
const deps = (mail = new MemoryEmailSender()) => ({ email: mail, baseURL, rings: ctx.rings });

describe("borrar una solicitud «Ya soy socio/a» de prueba", () => {
  it("removes the request, the member it registered with their activated account, and the person and DNI it created", async () => {
    const r = await request("99070001");
    const mail = new MemoryEmailSender();
    await registerExistingMember(ctx.db, deps(mail), adminId, r.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "paciente", since: "", minutesReference: "", status: "activo" }));
    const [m] = await ctx.db.select().from(members).where(eq(members.id, (await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id)))[0].linkedMemberId!));
    await activateAccount(ctx.db, tokenIn(mail.sent.at(-1)!.text), "una frase larga y ficticia");

    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, r.id, "SOC-0000-0000")).rejects.toThrow(/no coincide/);
    const out = await deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference.toLowerCase());
    expect(out).toEqual({ reference: r.reference, memberNumber: m.memberNumber });

    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(0);
    expect(await ctx.db.select().from(members).where(eq(members.id, m.id))).toHaveLength(0);
    expect(await ctx.db.select().from(user).where(eq(user.id, m.userId!))).toHaveLength(0);
    expect(await ctx.db.select().from(persons).where(eq(persons.id, m.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(personIdentities).where(eq(personIdentities.personId, m.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(oneTimeTokens).where(eq(oneTimeTokens.subjectId, r.id))).toHaveLength(0);
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "test_request.deleted"));
    expect(log).toMatchObject({ actorUserId: adminId, entityType: "existing_member_request", metadata: { reference: r.reference, memberNumber: m.memberNumber } });
    // The history stays, without pointing at the deleted account.
    expect((await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id))).length).toBeGreaterThan(1);
    expect(await ctx.db.select().from(auditLogs).where(eq(auditLogs.actorUserId, m.userId!))).toHaveLength(0);
  });

  it("never deletes a member who was already on the register", async () => {
    const first = await request("99070002");
    await registerExistingMember(ctx.db, deps(), adminId, first.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "adherente", since: "", minutesReference: "", status: "activo" }));
    const [registered] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, first.id));
    const second = await request("99070002");
    await linkExistingMember(ctx.db, deps(), adminId, second.id, linkInput.parse({ category: "adherente", since: "", minutesReference: "", status: "activo" }));

    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, second.id, second.reference)).rejects.toThrow(/ya estaba en el padrón/);
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, first.id, first.reference)).rejects.toThrow(/otras solicitudes vinculadas/);
    expect(await ctx.db.select().from(members).where(eq(members.id, registered.linkedMemberId!))).toHaveLength(1);
  });

  it("deletes a request nobody registered yet, and says why when it refuses", async () => {
    const r = await request("99070003");
    await deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference);
    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(0);
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference)).rejects.toBeInstanceOf(DeleteNotAllowedError);
  });
});

describe("las herramientas de borrado no alcanzan registros reales", () => {
  afterEach(() => vi.unstubAllEnvs());
  const registered = async (dni: string) => {
    const r = await request(dni);
    await registerExistingMember(ctx.db, deps(), adminId, r.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "paciente", since: "", minutesReference: "", status: "activo" }));
    const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    return { r, memberId: row.linkedMemberId! };
  };

  it("are off on a deployment unless TEST_DELETION=on is set for a testing session", async () => {
    const r = await request("99070004");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_ENV", "production");
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference)).rejects.toThrow(/no está habilitado en este entorno/);
    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(1);
    vi.stubEnv("TEST_DELETION", "on");
    await deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference);
    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(0);
  });

  it("never delete someone with REPROCANN files; records without files go, replaced ones included", async () => {
    const storage = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-borrado-")));
    const withFiles = await registered("99070005");
    const key = memberFolder(withFiles.memberId) + randomUUID();
    await storage.put(key, new TextEncoder().encode(`%PDF-1.7\n% ficticio ${randomUUID()}\n%%EOF\n`), "application/pdf");
    const loaded = await addAdminDocument(ctx.db, storage, ctx.rings, adminId, withFiles.memberId, adminUploadInput.parse({ target: "nuevo", kind: "credencial", expiresOn: "", dni: "99070005", pages: [key] }));
    expect(loaded.ok).toBe(true);
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, withFiles.r.id, withFiles.r.reference)).rejects.toThrow(/documentación REPROCANN con archivos/);
    expect(await ctx.db.select().from(members).where(eq(members.id, withFiles.memberId))).toHaveLength(1);

    const withRecords = await registered("99070006");
    const record = () => addDocument(ctx.db, ctx.rings.field, adminId, withRecords.memberId, documentInput.parse({ kind: "credencial", permitIdentifier: "", issuedOn: "", expiresOn: "2027-01-10", source: "en_poder_de_la_asociacion", notes: "" }));
    const older = await record();
    const newer = await record();
    await ctx.db.update(reprocannDocuments).set({ replacedBy: newer }).where(eq(reprocannDocuments.id, older));
    await deleteTestExistingMemberRequest(ctx.db, adminId, withRecords.r.id, withRecords.r.reference);
    expect(await ctx.db.select().from(members).where(eq(members.id, withRecords.memberId))).toHaveLength(0);
    expect(await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, older))).toHaveLength(0);
  });
});
