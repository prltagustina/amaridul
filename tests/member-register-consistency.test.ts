// Consistency pass before production: canonical contact email, members without account, number or
// category end to end, and what the import reports but does not write.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { admissions, existingMemberRequests, memberFeeSettings, members, persons } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { admissionInput, elevateToCommission, submitAdmission } from "@/server/admissions";
import { createPreAdmission, inviteToAdmission, preAdmissionInput } from "@/server/pre-admissions";
import { activateAccount, decisionInput, memberEmailOf, memberOfUser, recordDecision, resendActivation } from "@/server/members";
import { setPersonDni } from "@/server/identity/person-identity";
import { analyse, applyImport, mapRows, parseCsv } from "@/server/legacy-import";
import {
  changeMemberNumber,
  contactInput,
  feeInput,
  getMemberProfile,
  inviteToActivate,
  listRegister,
  membershipInput,
  personalInput,
  updateContact,
  updateFee,
  updateMembership,
  updatePersonal,
} from "@/server/member-profile";
import { existingMemberInput, getExistingMemberRequest, linkExistingMember, linkInput, submitExistingMemberRequest } from "@/server/existing-members";
import { PRECHECK_EMAIL } from "../scripts/lib/precheck-padron";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
const baseURL = "https://amaridul.test";
const PASSWORD = "una frase larga y ficticia";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.consistencia@example.com")).id;
});

/** A formal request in Comisión for a fictitious person, optionally with a separate notification email. */
async function inCommission(dni: string, notification = "") {
  const email = `persona.${dni}@example.com`;
  const { id: preId } = await createPreAdmission(
    ctx.db,
    { field: ctx.rings.field, email: new MemoryEmailSender() },
    preAdmissionInput.parse({ nombre: "Persona Ficticia", email, provincia: "Santa Fe", localidad: "Localidad", intereses: ["comunidad"], reprocann: "", participacion: "si", privacidad: true }),
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
      emailNotificaciones: notification,
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
  const [adm] = await ctx.db.select({ id: admissions.id, personId: admissions.personId }).from(admissions).where(eq(admissions.reference, (r as { reference: string }).reference));
  await elevateToCommission(ctx.db, adminId, adm.id);
  return adm;
}
const approve = () => decisionInput.parse({ decision: "aprobada", meetingDate: "2026-10-10", minutes: "Libro 1, folio 23", category: "adherente" });

async function approved(dni: string, notification = "") {
  const adm = await inCommission(dni, notification);
  const mail = new MemoryEmailSender();
  await recordDecision(ctx.db, { email: mail, baseURL }, adminId, adm.id, approve());
  const [m] = await ctx.db.select().from(members).where(eq(members.admissionId, adm.id));
  return { ...adm, member: m, mail };
}
const personEmail = async (personId: string) => (await ctx.db.select({ email: persons.email }).from(persons).where(eq(persons.id, personId)))[0].email;

// The statement of migration 0010 that completes persons.email, run as written in the file.
const BACKFILL_EMAIL = readFileSync("drizzle/0010_padron_socios.sql", "utf8")
  .split("--> statement-breakpoint")
  .find((s) => s.includes("-- Backfill 3"))!;
const rowsOf = (r: unknown) => (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as Record<string, unknown>[];

describe("1. canonical contact email (persons.email)", () => {
  it("a normal approval keeps the contact email; the declared notification email stays on the admission and gets the mails", async () => {
    const a = await approved("99008001", "avisos.99008001@example.com");
    expect(await personEmail(a.personId)).toBe("persona.99008001@example.com");
    const [adm] = await ctx.db.select({ n: admissions.notificationEmail }).from(admissions).where(eq(admissions.id, a.id));
    expect(adm.n).toBe("avisos.99008001@example.com");
    expect(a.mail.sent[0].to).toBe("avisos.99008001@example.com"); // unchanged delivery rule
    expect(await memberEmailOf(ctx.db, a.member.userId!)).toBe("avisos.99008001@example.com");
    const profile = await getMemberProfile(ctx.db, ctx.rings, a.member.id);
    expect(profile!.contact).toMatchObject({ email: "persona.99008001@example.com", notificationEmail: "avisos.99008001@example.com" });
  });

  it("without a separate notification email nothing differs and nothing is flagged", async () => {
    const a = await approved("99008002");
    expect(a.mail.sent[0].to).toBe("persona.99008002@example.com");
    expect((await getMemberProfile(ctx.db, ctx.rings, a.member.id))!.contact.notificationEmail).toBeNull();
  });

  it("the 0010 backfill only completes empty emails: equal → nothing, different → kept; notification_email untouched", async () => {
    const fill = await approved("99008011", "completar.99008011@example.com");
    const same = await approved("99008012", "persona.99008012@example.com");
    const diff = await approved("99008013", "otro.99008013@example.com");
    await ctx.db.update(persons).set({ email: null }).where(eq(persons.id, fill.personId));
    // An old row with an unusable value (today's form would reject it) is not copied.
    const invalid = await approved("99008014");
    await ctx.db.update(admissions).set({ notificationEmail: "no-es-un-email" }).where(eq(admissions.id, invalid.id));
    await ctx.db.update(persons).set({ email: "" }).where(eq(persons.id, invalid.personId));

    const [count] = rowsOf(await ctx.db.execute(sql.raw(PRECHECK_EMAIL)));
    expect(count).toMatchObject({ completar: 1, coinciden: 1 });
    expect(Number(count.conflicto)).toBeGreaterThanOrEqual(2); // this one plus the first test's

    const notificationsBefore = await ctx.db.select({ id: admissions.id, n: admissions.notificationEmail }).from(admissions);
    await ctx.db.execute(sql.raw(BACKFILL_EMAIL));
    expect(await personEmail(fill.personId)).toBe("completar.99008011@example.com");
    expect(await personEmail(same.personId)).toBe("persona.99008012@example.com");
    expect(await personEmail(diff.personId)).toBe("persona.99008013@example.com");
    expect(await personEmail(invalid.personId)).toBe("");
    expect(await ctx.db.select({ id: admissions.id, n: admissions.notificationEmail }).from(admissions)).toEqual(notificationsBefore);
    // Running it again changes nothing.
    await ctx.db.execute(sql.raw(BACKFILL_EMAIL));
    expect(await personEmail(diff.personId)).toBe("persona.99008013@example.com");
  });
});

describe("3. historical member imported without account, number or category", () => {
  let memberId: string;
  let personId: string;

  beforeAll(async () => {
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Histórica", firstNames: "Persona", lastNames: "Histórica", isFixture: true }).returning({ id: persons.id });
    personId = p.id;
    await setPersonDni(ctx.db, ctx.rings, personId, "99008101");
    const [m] = await ctx.db.insert(members).values({ personId, origin: "legacy", status: "activo" }).returning();
    expect(m).toMatchObject({ userId: null, memberNumber: null, category: null });
    memberId = m.id;
  });

  it("shows in the register as 'Sin cuenta' with number and category pending", async () => {
    const row = (await listRegister(ctx.db, "2026-10-15")).find((r) => r.id === memberId)!;
    expect(row).toMatchObject({ account: "none", memberNumber: null, category: null, legajo: "pending_update" });
    expect(row.validity.state).toBe("none");
    const profile = (await getMemberProfile(ctx.db, ctx.rings, memberId))!;
    expect(profile).toMatchObject({ account: "none", membership: { memberNumber: null, category: null, previousNumbers: [] } });
  });

  it("every block can be edited with the fields still empty", async () => {
    await updatePersonal(ctx.db, adminId, memberId, personalInput.parse({ firstNames: "Persona", lastNames: "Histórica", birthDate: "1970-02-02" }));
    await updateContact(ctx.db, adminId, memberId, contactInput.parse({ email: "persona.historica@example.com", phone: "", address: "", locality: "", province: "", postalCode: "" }));
    await updateMembership(ctx.db, adminId, memberId, membershipInput.parse({ category: "", since: "", status: "activo", minutesReference: "", room: "" }));
    await updateFee(ctx.db, adminId, memberId, feeInput.parse({ feeEnrollmentDate: "", paymentMethod: "" }));
    const [m] = await ctx.db.select().from(members).where(eq(members.id, memberId));
    expect(m).toMatchObject({ userId: null, memberNumber: null, category: null });
  });

  it("can be invited, activates and reaches the same portal, with number and category 'A confirmar'", async () => {
    const mail = new MemoryEmailSender();
    expect(await inviteToActivate(ctx.db, { email: mail, baseURL }, adminId, memberId)).toMatchObject({ emailed: true });
    expect(mail.sent[0]).toMatchObject({ to: "persona.historica@example.com", template: "existing_member_access" });
    expect(mail.sent[0].text).not.toMatch(/número de socio|null|A confirmar/i);
    expect(await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).toEqual({ ok: true });
    expect((await ctx.post("/sign-in/dni", { dni: "99008101", password: PASSWORD })).ok).toBe(true);
    const [m] = await ctx.db.select().from(members).where(eq(members.id, memberId));
    const portal = await memberOfUser(ctx.db, m.userId!);
    expect(portal).toMatchObject({ memberNumber: null, category: null, categoryLabel: null, firstName: "Persona" });
    // A number assigned later does not touch the account or the login.
    await changeMemberNumber(ctx.db, adminId, memberId, "H-8101");
    expect((await ctx.post("/sign-in/dni", { dni: "99008101", password: PASSWORD })).ok).toBe(true);
    expect((await memberOfUser(ctx.db, m.userId!))!.memberNumber).toBe("H-8101");
  });

  it("a pending account without number gets its activation resent (password recovery path)", async () => {
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Pendiente", email: "persona.pendiente@example.com", isFixture: true }).returning({ id: persons.id });
    await setPersonDni(ctx.db, ctx.rings, p.id, "99008102");
    const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy" }).returning({ id: members.id });
    await inviteToActivate(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, m.id);
    const mail = new MemoryEmailSender();
    expect(await resendActivation(ctx.db, { email: mail, baseURL }, null, m.id)).toMatchObject({ emailed: true });
    expect(mail.sent[0].text).not.toMatch(/null/);
  });

  it("can be linked from /sumate ('Ya soy socio/a') while still without number", async () => {
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Vinculable", isFixture: true }).returning({ id: persons.id });
    await setPersonDni(ctx.db, ctx.rings, p.id, "99008103");
    const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy" }).returning({ id: members.id });
    const req = await submitExistingMemberRequest(
      ctx.db,
      { rings: ctx.rings, email: new MemoryEmailSender() },
      existingMemberInput.parse({ nombres: "Persona", apellidos: "Vinculable", dni: "99008103", email: "persona.vinculable@example.com", nacimiento: "1980-01-01", domicilio: "Calle 3", localidad: "Santa Fe", provincia: "Santa Fe", cp: "3000", numeroSocio: "", privacidad: true, confirmacion: true }),
      null,
    );
    const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, req.reference!));
    expect((await getExistingMemberRequest(ctx.db, ctx.rings, row.id))!.match.member).toMatchObject({ id: m.id, memberNumber: null, accountStatus: "none" });
    const mail = new MemoryEmailSender();
    const out = await linkExistingMember(ctx.db, { email: mail, baseURL, rings: ctx.rings }, adminId, row.id, linkInput.parse({ updateContact: true, category: "activo", since: "", minutesReference: "", status: "activo" }));
    expect(out).toMatchObject({ memberNumber: null, emailed: true });
    // Once linked, the person is not listed as having "the same email" as herself.
    expect((await getExistingMemberRequest(ctx.db, ctx.rings, row.id))!.match.emailConflicts).toEqual([]);
    expect(await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).toEqual({ ok: true });
    expect((await ctx.post("/sign-in/dni", { dni: "99008103", password: PASSWORD })).ok).toBe(true);
  });
});

describe("4–6. what the import reports without writing", () => {
  const HEADER = "N°,Apellido,Nombre,DNI,Email,Socio/a,Fecha de vencimiento,Credencial,Cuota: fecha de alta,Medio de pago";

  it("fee columns are 'pendiente de mapeo institucional' and never stored; a bad fee date does not block the row", async () => {
    const content = [HEADER, "1,Ficticia,Cuota Uno,99008201,,SI,,,01/03/2024,Transferencia", "2,Ficticia,Cuota Dos,99008202,,SI,,,no es fecha,"].join("\n");
    const { summary, results } = await analyse(ctx.db, ctx.rings, mapRows(parseCsv(content)).rows);
    expect(summary).toMatchObject({ create: 2, review: 0, feePendingMapping: 2 });
    expect(results[0].warnings.join()).toMatch(/pendiente de mapeo institucional/);
    await applyImport(ctx.db, ctx.rings, { name: "cuota.csv", content });
    expect(await ctx.db.select().from(memberFeeSettings)).toEqual(expect.not.arrayContaining([expect.objectContaining({ paymentMethod: "Transferencia" })]));
    const rows = await ctx.db.select({ m: memberFeeSettings.memberId }).from(memberFeeSettings).innerJoin(members, eq(members.id, memberFeeSettings.memberId)).where(sql`${members.importRunId} is not null`);
    expect(rows).toHaveLength(0);
  });

  it("email conflicts are reported and the email on file is kept", async () => {
    const [p] = await ctx.db.insert(persons).values({ fullName: "Ficticia Registrada", lastNames: "Ficticia", email: "registrada@example.com", isFixture: true }).returning({ id: persons.id });
    await setPersonDni(ctx.db, ctx.rings, p.id, "99008301");
    await ctx.db.insert(members).values({ personId: p.id, origin: "legacy" });
    const content = [
      HEADER,
      "1,Ficticia,Registrada,99008301,otra@example.com,SI,,,,", // differs from the one on file
      "2,Ficticia,Nueva,99008302,registrada@example.com,SI,,,,", // belongs to another person
      "3,Ficticia,Limpia,99008303,limpia@example.com,SI,,,,",
    ].join("\n");
    const { summary } = await analyse(ctx.db, ctx.rings, mapRows(parseCsv(content)).rows);
    expect(summary).toMatchObject({ emailConflict: 2, create: 2 });
    await applyImport(ctx.db, ctx.rings, { name: "emails.csv", content });
    expect(await personEmail(p.id)).toBe("registrada@example.com");
    const emails = (await ctx.db.select({ email: persons.email }).from(persons)).map((r) => r.email);
    expect(emails.filter((e) => e === "registrada@example.com")).toHaveLength(1);
    expect(emails).toContain("limpia@example.com");
    expect(emails).not.toContain("otra@example.com");
  });

  it("a historical credential is metadata only: no file, no link, pending review", async () => {
    const content = [HEADER, "1,Ficticia,Credencial,99008401,,SI,17/12/2028,https://ejemplo.invalid/ver,,"].join("\n");
    const { summary } = await analyse(ctx.db, ctx.rings, mapRows(parseCsv(content)).rows);
    expect(summary.historicalCredential).toBe(1);
    const out = await applyImport(ctx.db, ctx.rings, { name: "credencial.csv", content });
    const [m] = await ctx.db.select().from(members).where(eq(members.importRunId, out.runId));
    const profile = (await getMemberProfile(ctx.db, ctx.rings, m.id, "2026-10-15"))!;
    expect(profile.credential).toMatchObject({ source: "en_poder_de_la_asociacion", reviewStatus: "pendiente", expiresOn: "2028-12-17", fileKey: null });
    expect(profile.validity.state).toBe("valid");
    expect(JSON.stringify(profile)).not.toContain("ejemplo.invalid");
  });
});
