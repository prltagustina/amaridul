import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { admissions, auditLogs, members, oneTimeTokens, personIdentities, persons, preAdmissions, session, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { admissionInput, elevateToCommission, submitAdmission } from "@/server/admissions";
import { activateAccount, decisionInput, recordDecision } from "@/server/members";
import { addPreAdmissionNote, createPreAdmission, inviteToAdmission, preAdmissionInput } from "@/server/pre-admissions";
import { DeleteNotAllowedError, deleteTestRequest } from "@/server/test-data";
import { cookiesFrom, makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.borrado@example.com")).id;
});

async function preadmission() {
  return createPreAdmission(
    ctx.db,
    { field: ctx.rings.field, email: new MemoryEmailSender() },
    preAdmissionInput.parse({ nombre: "Persona Ficticia", email: "persona.borrado@example.com", telefono: "+54 9 000 000-0001", provincia: "Santa Fe", localidad: "Localidad", intereses: ["comunidad"], reprocann: "", participacion: "si", privacidad: true }),
  );
}

/** A test request taken all the way to an active member who has signed in. */
async function fullMember(dni: string) {
  const { id: preId, reference } = await preadmission();
  await addPreAdmissionNote(ctx.db, adminId, preId, "Nota de prueba");
  const invite = new MemoryEmailSender();
  await inviteToAdmission(ctx.db, { email: invite, baseURL }, adminId, preId);
  const formal = admissionInput.parse({
    nombres: "Persona", apellidos: "Ficticia", dni, nacimiento: "1990-05-12", nacionalidad: "Argentina", domicilio: "Calle 1", localidad: "Localidad",
    provincia: "Santa Fe", cp: "2000", email: "persona.borrado@example.com", telefono: "+54 9 000 000-0001", emailNotificaciones: "", categoria: "adherente",
    interes: "", obligaciones: true, pacienteAcompanamiento: false, pacienteReprocann: "", pacienteInformado: false, estatuto: true, cuota: true,
    veracidad: true, cambios: true, datos: true, novedades: false, confirmacion: true,
  });
  const r = await submitAdmission(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, tokenIn(invite.sent[0].text), formal);
  const [adm] = await ctx.db.select().from(admissions).where(eq(admissions.reference, (r as { reference: string }).reference));
  await elevateToCommission(ctx.db, adminId, adm.id);
  const approval = new MemoryEmailSender();
  await recordDecision(ctx.db, { email: approval, baseURL }, adminId, adm.id, decisionInput.parse({ decision: "aprobada", meetingDate: "2026-10-10", minutes: "Acta 1", category: "adherente" }));
  await activateAccount(ctx.db, tokenIn(approval.sent[0].text), "una frase larga y ficticia");
  const signedIn = await ctx.post("/sign-in/dni", { dni, password: "una frase larga y ficticia" });
  const [m] = await ctx.db.select().from(members).where(eq(members.admissionId, adm.id));
  return { preId, reference, adm, member: m, cookie: cookiesFrom(signedIn) };
}

describe("deleting a test request", () => {
  it("removes everything that came from it and leaves the audit trail", async () => {
    const { preId, reference, adm, member, cookie } = await fullMember("99000401");
    expect((await ctx.sessionOf(cookie))?.user).toBeTruthy();

    const r = await deleteTestRequest(ctx.db, adminId, preId, ` ${reference.toLowerCase()} `);
    expect(r.reference).toBe(reference);
    expect(r.memberNumber).toMatch(/^AD-/);

    expect(await ctx.db.select().from(preAdmissions).where(eq(preAdmissions.id, preId))).toHaveLength(0);
    expect(await ctx.db.select().from(admissions).where(eq(admissions.id, adm.id))).toHaveLength(0);
    expect(await ctx.db.select().from(members).where(eq(members.id, member.id))).toHaveLength(0);
    expect(await ctx.db.select().from(user).where(eq(user.id, member.userId))).toHaveLength(0);
    expect(await ctx.db.select().from(session).where(eq(session.userId, member.userId))).toHaveLength(0);
    expect(await ctx.db.select().from(persons).where(eq(persons.id, adm.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(personIdentities).where(eq(personIdentities.personId, adm.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(oneTimeTokens).where(eq(oneTimeTokens.subjectId, preId))).toHaveLength(0);
    expect(await ctx.sessionOf(cookie)).toBeNull();

    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, preId));
    expect(logs.map((l) => l.action)).toContain("test_request.deleted");
    expect(await ctx.db.select().from(auditLogs).where(eq(auditLogs.actorUserId, member.userId))).toHaveLength(0);

    // The same DNI can be used again for a new test.
    const again = await fullMember("99000401");
    expect(again.member.memberNumber).not.toBe(member.memberNumber);
  });

  it("deletes a request that never got past the preadmission", async () => {
    const { id, reference } = await preadmission();
    await deleteTestRequest(ctx.db, adminId, id, reference);
    expect(await ctx.db.select().from(preAdmissions).where(eq(preAdmissions.id, id))).toHaveLength(0);
  });

  it("requires typing the exact reference and never touches admins", async () => {
    const { id } = await preadmission();
    await expect(deleteTestRequest(ctx.db, adminId, id, "PRE-0000-0000")).rejects.toBeInstanceOf(DeleteNotAllowedError);
    expect(await ctx.db.select().from(preAdmissions).where(eq(preAdmissions.id, id))).toHaveLength(1);
    expect(await ctx.db.select().from(user).where(eq(user.id, adminId))).toHaveLength(1);
  });
});
