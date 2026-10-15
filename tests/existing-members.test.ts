import { beforeAll, describe, expect, it } from "vitest";
import { and, count, eq, sql } from "drizzle-orm";
import { admissions, auditLogs, existingMemberRequests, members, oneTimeTokens, persons, preAdmissions, referenceCounters, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { activateAccount, memberAccountByDni } from "@/server/members";
import { createPreAdmission, inviteToAdmission, preAdmissionInput, INVITATION_KIND } from "@/server/pre-admissions";
import {
  checkUpdateLink,
  convertPreAdmission,
  ExistingMemberError,
  existingMemberInput,
  getExistingMemberRequest,
  institutionalInput,
  linkExistingMember,
  linkInput,
  markNeedsReview,
  registerExistingMember,
  rejectExistingMemberRequest,
  RequestStateError,
  resendUpdateLink,
  submitExistingMemberRequest,
} from "@/server/existing-members";
import { makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];
const PASSWORD = "una frase larga y ficticia";

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.existentes@example.com")).id;
});

const form = (dni: string, patch: Record<string, unknown> = {}) =>
  existingMemberInput.parse({
    nombres: "Persona",
    apellidos: "Histórica",
    dni,
    email: `historica.${dni}@example.com`,
    nacimiento: "1985-03-02",
    domicilio: "Calle Ficticia 456",
    localidad: "Localidad Ficticia",
    provincia: "Santa Fe",
    cp: "3000",
    numeroSocio: "",
    privacidad: true,
    confirmacion: true,
    ...patch,
  });
const institutional = (patch: Record<string, unknown> = {}) =>
  institutionalInput.parse({ numberMode: "historic", memberNumber: "", category: "paciente", since: "2019-06-01", minutesReference: "Libro 1, folio 4", status: "activo", ...patch });

async function submit(dni: string, patch: Record<string, unknown> = {}, mail = new MemoryEmailSender()) {
  const r = await submitExistingMemberRequest(ctx.db, { rings: ctx.rings, email: mail }, form(dni, patch), null);
  if (!r.ok) throw new Error("submit failed");
  const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, r.reference));
  return { ...r, id: row.id, mail };
}
const deps = (mail = new MemoryEmailSender()) => ({ email: mail, baseURL, rings: ctx.rings });
const countOf = async (table: typeof members | typeof user | typeof persons) => Number((await ctx.db.select({ n: count() }).from(table))[0].n);
const memberCount = () => countOf(members);
const userCount = () => countOf(user);

describe("the public update form", () => {
  it("does not ask for a category nor an admission, and takes the member number as optional", () => {
    expect(existingMemberInput.safeParse({ ...form("99000501"), categoria: "activo" }).success).toBe(true);
    expect(form("99000501")).not.toHaveProperty("categoria");
    expect(existingMemberInput.safeParse({ ...form("99000501"), numeroSocio: undefined }).success).toBe(true);
    expect(existingMemberInput.safeParse({ ...form("99000501"), privacidad: false }).success).toBe(false);
    expect(existingMemberInput.safeParse({ ...form("99000501"), dni: "abc" }).success).toBe(false);
  });

  it("TEST F: someone saying they are a member gets nothing until the admin verifies", async () => {
    const before = { m: await memberCount(), u: await userCount() };
    const r = await submit("99000502");
    const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(row.status).toBe("pending_verification");
    expect(row.dniEncrypted).not.toContain("99000502");
    expect({ m: await memberCount(), u: await userCount() }).toEqual(before);
    expect(await memberAccountByDni(ctx.db, ctx.rings, "99000502")).toBeNull();
    const res = await ctx.post("/sign-in/dni", { dni: "99000502", password: PASSWORD });
    expect(res.ok).toBe(false);
    expect(r.mail.sent).toHaveLength(1);
    expect(r.mail.sent[0].subject).toBe("Recibimos la actualización de tu legajo");
    expect(r.mail.sent[0].idempotencyKey).toBe(`existing_member_received:${r.reference}`);
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id));
    expect(logs.map((l) => l.action)).toEqual(["existing_member.request_received"]);
    expect(JSON.stringify(logs)).not.toContain("99000502");
  });
});

describe("TEST B: an existing member not on file", () => {
  it("is registered with the historical data, activates the account and reaches the same portal", async () => {
    const r = await submit("99000510", { numeroSocio: "123" });
    const mail = new MemoryEmailSender();
    const out = await registerExistingMember(ctx.db, deps(mail), adminId, r.id, institutional({ memberNumber: "123" }));
    expect(out.memberNumber).toBe("123");

    const [m] = await ctx.db.select().from(members).where(eq(members.memberNumber, "123"));
    expect(m).toMatchObject({ origin: "legacy", admissionId: null, category: "paciente", since: "2019-06-01", minutesReference: "Libro 1, folio 4", digitalOnboardingCompletedAt: null });
    const [u] = await ctx.db.select().from(user).where(eq(user.id, m.userId));
    expect(u.status).toBe("pending_activation");
    const [p] = await ctx.db.select().from(persons).where(eq(persons.id, m.personId));
    expect(p).toMatchObject({ fullName: "Persona Histórica", email: "historica.99000510@example.com" });
    expect((await ctx.db.select().from(admissions).where(eq(admissions.personId, m.personId))).length).toBe(0);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "historica.99000510@example.com", subject: "Tu acceso a Amarí Dul está listo", template: "existing_member_access" });

    // TEST I: the account works only after this verification, and the historical date never moves.
    expect((await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).ok).toBe(true);
    const [after] = await ctx.db.select().from(members).where(eq(members.id, m.id));
    expect(after.since).toBe("2019-06-01");
    expect(after.digitalOnboardingCompletedAt).not.toBeNull();
    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(req.status).toBe("completed");
    const res = await ctx.post("/sign-in/dni", { dni: "99.000.510", password: PASSWORD });
    expect(res.ok).toBe(true);

    const actions = (await ctx.db.select().from(auditLogs).where(sql`${auditLogs.entityId} in (${r.id}, ${m.id})`)).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["existing_member.registered", "member.account_created", "member.activation_sent", "existing_member.completed"]));
  });

  it("keeps the historical date empty when it is not available", async () => {
    const r = await submit("99000511");
    await registerExistingMember(ctx.db, deps(), adminId, r.id, institutional({ numberMode: "next", since: "", minutesReference: "" }));
    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    const [m] = await ctx.db.select().from(members).where(eq(members.id, req.linkedMemberId!));
    expect(m.since).toBeNull();
    expect(m.minutesReference).toBeNull();
    expect(m.memberNumber).toMatch(/^AD-\d{4}$/);
  });

  it("the automatic number skips a historical number typed in that looks like it", async () => {
    const [counter] = await ctx.db.select({ last: referenceCounters.lastValue }).from(referenceCounters).where(and(eq(referenceCounters.kind, "member"), eq(referenceCounters.year, 0)));
    const nextFree = `AD-${String((counter?.last ?? 0) + 1).padStart(4, "0")}`;
    await registerExistingMember(ctx.db, deps(), adminId, (await submit("99000512")).id, institutional({ memberNumber: nextFree }));
    const out = await registerExistingMember(ctx.db, deps(), adminId, (await submit("99000513")).id, institutional({ numberMode: "next" }));
    expect(out.memberNumber).not.toBe(nextFree);
  });

  it("refuses a historical number that already belongs to another member", async () => {
    const r = await submit("99000514");
    await expect(registerExistingMember(ctx.db, deps(), adminId, r.id, institutional({ memberNumber: "123" }))).rejects.toBeInstanceOf(ExistingMemberError);
    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(req.status).toBe("pending_verification");
  });

  it("a double click registers once and sends one email", async () => {
    const r = await submit("99000515");
    const mail = new MemoryEmailSender();
    await registerExistingMember(ctx.db, deps(mail), adminId, r.id, institutional({ numberMode: "next" }));
    const before = await memberCount();
    await expect(registerExistingMember(ctx.db, deps(mail), adminId, r.id, institutional({ numberMode: "next" }))).rejects.toBeInstanceOf(RequestStateError);
    expect(await memberCount()).toBe(before);
    expect(mail.sent).toHaveLength(1);
  });
});

describe("TEST C, D, G: a member already on file", () => {
  it("TEST G: a second request with the same DNI is flagged and cannot create another member", async () => {
    const first = await submit("99000520");
    const second = await submit("99000520", { email: "otra.direccion@example.com" });
    const detail = await getExistingMemberRequest(ctx.db, ctx.rings, second.id);
    expect(detail!.match.duplicates.map((d) => d.reference)).toContain(first.reference);
    expect(detail!.request.dniMasked).not.toContain("99000520");

    await registerExistingMember(ctx.db, deps(), adminId, first.id, institutional({ numberMode: "next" }));
    const before = { m: await memberCount(), u: await userCount() };
    await expect(registerExistingMember(ctx.db, deps(), adminId, second.id, institutional({ numberMode: "next" }))).rejects.toThrow(/vincul/);
    expect({ m: await memberCount(), u: await userCount() }).toEqual(before);
  });

  it("TEST C: links to the member on file, reusing member, person and account", async () => {
    const r = await submit("99000520", { email: "nueva.direccion@example.com" });
    const detail = await getExistingMemberRequest(ctx.db, ctx.rings, r.id);
    const member = detail!.match.member!;
    expect(member).not.toBeNull();
    const before = { m: await memberCount(), u: await userCount(), p: await countOf(persons) };
    const mail = new MemoryEmailSender();
    const out = await linkExistingMember(ctx.db, deps(mail), adminId, r.id, linkInput.parse({ updateContact: true, category: "activo", since: "2018-02-10", minutesReference: "", status: "activo" }));
    expect(out.account).toBe("pending_activation");
    expect({ m: await memberCount(), u: await userCount(), p: await countOf(persons) }).toEqual(before);
    const [m] = await ctx.db.select().from(members).where(eq(members.id, member.id));
    expect(m).toMatchObject({ category: "activo", since: "2018-02-10" });
    const [p] = await ctx.db.select().from(persons).where(eq(persons.id, member.personId));
    expect(p.email).toBe("nueva.direccion@example.com");
    // Pending account: a new activation link, with the existing-member wording.
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].template).toBe("existing_member_access");
    const changes = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "member.institutional_data_updated"));
    expect(changes.at(-1)!.metadata).toMatchObject({ category_after: "activo", since_after: "2018-02-10" });
  });

  it("keeps the email on file unless the admin updates it, and sends the activation there", async () => {
    const first = await submit("99000525");
    await registerExistingMember(ctx.db, deps(), adminId, first.id, institutional({ numberMode: "next" }));
    // Someone else sends a request with that DNI and their own email.
    const intruder = await submit("99000525", { email: "otra.persona@example.com" });
    const mail = new MemoryEmailSender();
    await linkExistingMember(ctx.db, deps(mail), adminId, intruder.id, linkInput.parse({ category: "paciente", since: "", minutesReference: "", status: "activo" }));
    expect(mail.sent[0].to).toBe("historica.99000525@example.com");
    const detail = await getExistingMemberRequest(ctx.db, ctx.rings, intruder.id);
    const [p] = await ctx.db.select().from(persons).where(eq(persons.id, detail!.linkedMember ? (await ctx.db.select().from(members).where(eq(members.id, detail!.linkedMember.id)))[0].personId : ""));
    expect(p.email).toBe("historica.99000525@example.com");
  });

  it("TEST D: a member whose account is already active gets no second account and no email", async () => {
    const first = await submit("99000530");
    const mail = new MemoryEmailSender();
    await registerExistingMember(ctx.db, deps(mail), adminId, first.id, institutional({ numberMode: "next" }));
    await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD);

    const again = await submit("99000530");
    const usersBefore = await userCount();
    const mail2 = new MemoryEmailSender();
    const out = await linkExistingMember(ctx.db, deps(mail2), adminId, again.id, linkInput.parse({ category: "paciente", since: "2019-06-01", minutesReference: "", status: "activo" }));
    expect(out).toMatchObject({ account: "active", emailed: false });
    expect(mail2.sent).toHaveLength(0);
    expect(await userCount()).toBe(usersBefore);
    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, again.id));
    expect(req.status).toBe("completed");
  });

  it("refuses to link when there is no member for the DNI", async () => {
    const r = await submit("99000540");
    await expect(linkExistingMember(ctx.db, deps(), adminId, r.id, linkInput.parse({ category: "activo", since: "", minutesReference: "", status: "activo" }))).rejects.toBeInstanceOf(ExistingMemberError);
  });
});

describe("TEST H: email shared with someone else", () => {
  it("is shown to the admin, not to the public, and does not block", async () => {
    const shared = "compartido@example.com";
    await ctx.db.insert(persons).values({ fullName: "Otra Persona Ficticia", email: shared, isFixture: true });
    const mail = new MemoryEmailSender();
    const r = await submitExistingMemberRequest(ctx.db, { rings: ctx.rings, email: mail }, form("99000550", { email: shared }), null);
    expect(r).toMatchObject({ ok: true });
    const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, (r as { reference: string }).reference));
    const detail = await getExistingMemberRequest(ctx.db, ctx.rings, row.id);
    expect(detail!.match.emailConflicts.map((c) => c.name)).toContain("Otra Persona Ficticia");
  });
});

describe("TEST E: an existing member who used the preadmission form", () => {
  async function preadmission(email: string) {
    const { id } = await createPreAdmission(
      ctx.db,
      { field: ctx.rings.field, email: new MemoryEmailSender() },
      preAdmissionInput.parse({ nombre: "Socia Histórica", email, provincia: "Santa Fe", localidad: "Localidad", intereses: ["comunidad"], reprocann: "", participacion: "si", privacidad: true }),
    );
    return id;
  }

  it("is moved to the legajo update: kept, invitation revoked, no Comisión, personal link", async () => {
    const preId = await preadmission("socia.historica@example.com");
    await inviteToAdmission(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, preId);
    const mail = new MemoryEmailSender();
    const out = await convertPreAdmission(ctx.db, { email: mail, baseURL }, adminId, preId);

    const [pre] = await ctx.db.select().from(preAdmissions).where(eq(preAdmissions.id, preId));
    expect(pre.status).toBe("derivada");
    expect(pre.fullName).toBe("Socia Histórica");
    const liveInvites = await ctx.db.select().from(oneTimeTokens).where(sql`${oneTimeTokens.kind} = ${INVITATION_KIND} and ${oneTimeTokens.subjectId} = ${preId} and ${oneTimeTokens.revokedAt} is null`);
    expect(liveInvites).toHaveLength(0);
    expect((await ctx.db.select().from(admissions).where(eq(admissions.preAdmissionId, preId))).length).toBe(0);

    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, out.id));
    expect(req).toMatchObject({ status: "awaiting_data", source: "preadmission", preAdmissionId: preId, email: "socia.historica@example.com" });
    expect(mail.sent[0]).toMatchObject({ subject: "Actualizá tu legajo en Amarí Dul", template: "existing_member_update_link" });
    const token = tokenIn(mail.sent[0].text);
    expect(mail.sent[0].text).toContain(`${baseURL}/sumate/socio-existente#t=`);
    expect(await checkUpdateLink(ctx.db, token)).toEqual({ status: "ok", firstName: "Socia", email: "socia.historica@example.com" });

    // The person completes the legajo through the link: same request, now pending verification.
    const done = await submitExistingMemberRequest(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, form("99000560"), token);
    expect(done).toEqual({ ok: true, reference: out.reference });
    const [completed] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, out.id));
    expect(completed.status).toBe("pending_verification");
    // The link was single use.
    expect(await submitExistingMemberRequest(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, form("99000560"), token)).toEqual({ ok: false, error: "invalid_link" });

    const actions = (await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, preId))).map((l) => l.action);
    expect(actions).toContain("pre_admission.marked_existing_member");
  });

  it("cannot be converted twice, and a resend revokes the previous link", async () => {
    const preId = await preadmission("otra.historica@example.com");
    const first = new MemoryEmailSender();
    const out = await convertPreAdmission(ctx.db, { email: first, baseURL }, adminId, preId);
    await expect(convertPreAdmission(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, preId)).rejects.toBeInstanceOf(ExistingMemberError);
    const second = new MemoryEmailSender();
    await resendUpdateLink(ctx.db, { email: second, baseURL }, adminId, out.id);
    expect(await checkUpdateLink(ctx.db, tokenIn(first.sent[0].text))).toEqual({ status: "invalid" });
    expect((await checkUpdateLink(ctx.db, tokenIn(second.sent[0].text))).status).toBe("ok");
    expect(first.sent[0].idempotencyKey).not.toBe(second.sent[0].idempotencyKey);
  });
});

describe("other resolutions", () => {
  it("'Requiere revisión' and 'No corresponde' create nothing", async () => {
    const r = await submit("99000570");
    const before = { m: await memberCount(), u: await userCount() };
    await markNeedsReview(ctx.db, adminId, r.id, "El número no figura en el libro.");
    await rejectExistingMemberRequest(ctx.db, adminId, r.id, "No figura como socio.");
    const [req] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(req.status).toBe("rejected");
    expect({ m: await memberCount(), u: await userCount() }).toEqual(before);
    await expect(linkExistingMember(ctx.db, deps(), adminId, r.id, linkInput.parse({ category: "activo", since: "", minutesReference: "", status: "activo" }))).rejects.toBeInstanceOf(RequestStateError);
  });

  it("never writes the DNI to the audit log", async () => {
    const logs = await ctx.db.select().from(auditLogs);
    const text = JSON.stringify(logs);
    for (const dni of ["99000510", "99000520", "99000530", "99000560"]) expect(text).not.toContain(dni);
  });
});
