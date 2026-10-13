import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { account, admissionDecisions, admissions, auditLogs, members, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { admissionInput, elevateToCommission, submitAdmission } from "@/server/admissions";
import { createPreAdmission, inviteToAdmission, preAdmissionInput } from "@/server/pre-admissions";
import {
  activateAccount,
  activeMemberAccountByDni,
  checkActivation,
  decisionInput,
  InvalidDecisionError,
  latestDecision,
  memberEmailOf,
  memberOfUser,
  recordDecision,
  resendActivation,
} from "@/server/members";
import { cookiesFrom, makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.socios@example.com")).id;
});

/** A formal request already in Comisión, for a fictitious person with this DNI. */
async function inCommission(dni: string, email = `persona.${dni}@example.com`) {
  const { id: preId } = await createPreAdmission(
    ctx.db,
    { field: ctx.rings.field, email: new MemoryEmailSender() },
    preAdmissionInput.parse({ nombre: "Persona Ficticia", email, telefono: "+54 9 000 000-0001", provincia: "Santa Fe", localidad: "Localidad", intereses: ["comunidad"], reprocann: "", participacion: "si", privacidad: true }),
  );
  const invite = new MemoryEmailSender();
  await inviteToAdmission(ctx.db, { email: invite, baseURL }, adminId, preId);
  const r = await submitAdmission(
    ctx.db,
    { rings: ctx.rings, email: new MemoryEmailSender() },
    tokenIn(invite.sent[0].text),
    admissionInput.parse({
      nombres: "Persona",
      apellidos: "Ficticia",
      dni,
      nacimiento: "1990-05-12",
      nacionalidad: "Argentina",
      domicilio: "Calle Ficticia 123",
      localidad: "Localidad",
      provincia: "Santa Fe",
      cp: "2000",
      email,
      telefono: "+54 9 000 000-0001",
      emailNotificaciones: "",
      categoria: "adherente",
      interes: "",
      obligaciones: true,
      pacienteAcompanamiento: false,
      pacienteReprocann: "",
      pacienteInformado: false,
      estatuto: true,
      cuota: true,
      veracidad: true,
      cambios: true,
      datos: true,
      novedades: false,
      confirmacion: true,
    }),
  );
  const [adm] = await ctx.db.select({ id: admissions.id }).from(admissions).where(eq(admissions.reference, (r as { reference: string }).reference));
  await elevateToCommission(ctx.db, adminId, adm.id);
  return adm.id;
}

const approve = (category = "adherente") => decisionInput.parse({ decision: "aprobada", meetingDate: "2026-10-10", minutes: "Libro 1, folio 23", category });

describe("decision input", () => {
  it("requires the category only when approving, and a past meeting date", () => {
    expect(decisionInput.safeParse({ decision: "aprobada", meetingDate: "2026-10-10", minutes: "Acta 5", category: "" }).success).toBe(false);
    expect(decisionInput.safeParse({ decision: "rechazada", meetingDate: "2026-10-10", minutes: "Acta 5", category: "" }).success).toBe(true);
    expect(decisionInput.safeParse({ decision: "diferida", meetingDate: "2999-01-01", minutes: "Acta 5", category: "" }).success).toBe(false);
    expect(decisionInput.safeParse({ decision: "rechazada", meetingDate: "2026-10-10", minutes: " ", category: "" }).success).toBe(false);
  });
});

describe("from approval to the member portal", () => {
  it("approving creates the member and emails a one-time activation link to the real address", async () => {
    const admissionId = await inCommission("99000301");
    const mail = new MemoryEmailSender();
    const r = await recordDecision(ctx.db, { email: mail, baseURL }, adminId, admissionId, approve());
    expect(r).toMatchObject({ decision: "aprobada", emailed: true });
    const memberNumber = (r as { memberNumber: string }).memberNumber;
    expect(memberNumber).toMatch(/^AD-\d{4}$/);

    const [m] = await ctx.db.select().from(members).where(eq(members.admissionId, admissionId));
    expect(m.category).toBe("adherente");
    expect(m.since).toBe("2026-10-10");
    const [u] = await ctx.db.select().from(user).where(eq(user.id, m.userId));
    expect(u.status).toBe("pending_activation");
    expect(u.role).toBe("MEMBER");
    expect(await ctx.db.select().from(account).where(eq(account.userId, u.id))).toHaveLength(0);

    expect(mail.sent[0].to).toBe("persona.99000301@example.com");
    expect(mail.sent[0].text).toContain(memberNumber);
    expect(mail.sent[0].text).toContain(`${baseURL}/qr/activar#t=`);
    expect(await memberEmailOf(ctx.db, u.id)).toBe("persona.99000301@example.com");

    const token = tokenIn(mail.sent[0].text);
    expect(await checkActivation(ctx.db, ctx.rings, token)).toEqual({ status: "ok", firstName: "Persona", memberNumber, dniMasked: "**.***.301" });

    expect(await activateAccount(ctx.db, token, "corta")).toEqual({ ok: false, error: "weak_password" });
    expect(await activateAccount(ctx.db, token, "una frase larga y ficticia")).toEqual({ ok: true });
    expect(await activateAccount(ctx.db, token, "una frase larga y ficticia")).toEqual({ ok: false, error: "invalid_link" });
    expect(await checkActivation(ctx.db, ctx.rings, token)).toEqual({ status: "invalid" });

    // The member signs in with the DNI and that password, through the Fase 0 endpoint.
    const res = await ctx.post("/sign-in/dni", { dni: "99.000.301", password: "una frase larga y ficticia" });
    expect(res.status).toBe(200);
    const session = await ctx.sessionOf(cookiesFrom(res));
    expect(session.user.id).toBe(u.id);
    expect((await memberOfUser(ctx.db, u.id))?.memberNumber).toBe(memberNumber);

    const decision = await latestDecision(ctx.db, admissionId);
    expect(decision).toMatchObject({ decision: "aprobada", minutes: "Libro 1, folio 23", approvedCategory: "adherente" });
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, admissionId));
    expect(logs.map((l) => l.action)).toContain("admission.approved");
    expect(JSON.stringify(logs)).not.toContain("99000301");
  });

  it("password recovery by DNI reaches the member's real email", async () => {
    const admissionId = await inCommission("99000302", "persona.real@example.com");
    const mail = new MemoryEmailSender();
    await recordDecision(ctx.db, { email: mail, baseURL }, adminId, admissionId, approve());
    await activateAccount(ctx.db, tokenIn(mail.sent[0].text), "otra frase larga y ficticia");

    const found = await activeMemberAccountByDni(ctx.db, ctx.rings, "99.000.302");
    expect(found).not.toBeNull();
    expect(found?.email).not.toBe("persona.real@example.com");
    const before = ctx.email.sent.length;
    await ctx.auth.api.requestPasswordReset({ body: { email: found!.email } });
    expect(ctx.email.sent.at(-1)?.to).toBe("persona.real@example.com");
    expect(ctx.email.sent.length).toBe(before + 1);
    expect(await activeMemberAccountByDni(ctx.db, ctx.rings, "99000399")).toBeNull();
    expect(await activeMemberAccountByDni(ctx.db, ctx.rings, "abc")).toBeNull();
  });

  it("a resend revokes the previous activation link; an active account cannot be resent", async () => {
    const admissionId = await inCommission("99000303");
    const first = new MemoryEmailSender();
    await recordDecision(ctx.db, { email: first, baseURL }, adminId, admissionId, approve("activo"));
    const [m] = await ctx.db.select().from(members).where(eq(members.admissionId, admissionId));
    const second = new MemoryEmailSender();
    await resendActivation(ctx.db, { email: second, baseURL }, adminId, m.id);
    expect(await checkActivation(ctx.db, ctx.rings, tokenIn(first.sent[0].text))).toEqual({ status: "invalid" });
    expect(await activateAccount(ctx.db, tokenIn(second.sent[0].text), "una frase larga y ficticia")).toEqual({ ok: true });
    await expect(resendActivation(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, m.id)).rejects.toBeInstanceOf(InvalidDecisionError);
  });

  it("a member sharing an email with another account (e.g. the admin's) is created anyway", async () => {
    const admissionId = await inCommission("99000304", "admin.socios@example.com");
    const r = await recordDecision(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, admissionId, approve());
    expect(r.decision).toBe("aprobada");
  });
});

describe("other decisions", () => {
  it("rejecting closes the request and notifies the person; nothing is created", async () => {
    const admissionId = await inCommission("99000305");
    const mail = new MemoryEmailSender();
    await recordDecision(ctx.db, { email: mail, baseURL }, adminId, admissionId, decisionInput.parse({ decision: "rechazada", meetingDate: "2026-10-10", minutes: "Acta 6", category: "" }));
    const [a] = await ctx.db.select().from(admissions).where(eq(admissions.id, admissionId));
    expect(a.status).toBe("rechazada");
    expect(await ctx.db.select().from(members).where(eq(members.admissionId, admissionId))).toHaveLength(0);
    expect(mail.sent[0].subject).toBe("Sobre tu solicitud de admisión");
    await expect(recordDecision(ctx.db, { email: mail, baseURL }, adminId, admissionId, approve())).rejects.toBeInstanceOf(InvalidDecisionError);
  });

  it("deferring keeps it in Comisión and leaves the decision on record", async () => {
    const admissionId = await inCommission("99000306");
    await recordDecision(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, admissionId, decisionInput.parse({ decision: "diferida", meetingDate: "2026-10-10", minutes: "Acta 7", category: "" }));
    const [a] = await ctx.db.select().from(admissions).where(eq(admissions.id, admissionId));
    expect(a.status).toBe("comision");
    await recordDecision(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, admissionId, approve());
    expect(await ctx.db.select().from(admissionDecisions).where(eq(admissionDecisions.admissionId, admissionId))).toHaveLength(2);
  });

  it("a request not in Comisión cannot be decided", async () => {
    await expect(recordDecision(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, "00000000-0000-4000-8000-000000000000", approve())).rejects.toBeInstanceOf(InvalidDecisionError);
  });
});
