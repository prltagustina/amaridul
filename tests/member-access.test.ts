// Digital access for members of the historical register: the administration invites them from the
// member page, they create their own password and sign in with DNI like any other member. The
// same mechanism serves «Ya soy socio/a»; the import never sends anything.
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLogs, members, oneTimeTokens, persons, session, user } from "@/server/db/schema";
import type { EmailSender } from "@/server/email/sender";
import { MemoryEmailSender } from "@/server/email/sender";
import { setPersonDni } from "@/server/identity/person-identity";
import { ACTIVATION_KIND, activateAccount, checkActivation, memberAccountByDni, memberOfUser } from "@/server/members";
import { changeDni, getMemberProfile, inviteToActivate, MemberProfileError } from "@/server/member-profile";
import { caseInput, documentInput, addDocument, saveCase } from "@/server/reprocann";
import { applyImport } from "@/server/legacy-import";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
const baseURL = "https://amaridul.test";
const PASSWORD = "una frase larga y ficticia";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];
const later = (s: number) => new Date(Date.now() + s * 1000);

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.acceso@example.com")).id;
});

/** A member of the historical register, as the import leaves it: no account, number or category. */
async function historical(o: { n: number; dni?: string; email?: string }) {
  const [p] = await ctx.db
    .insert(persons)
    .values({ fullName: `Persona Histórica ${o.n}`, firstNames: "Persona", lastNames: `Histórica ${o.n}`, email: o.email ?? null, isFixture: true })
    .returning({ id: persons.id });
  if (o.dni) await setPersonDni(ctx.db, ctx.rings, p.id, o.dni);
  const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy" }).returning({ id: members.id });
  return { memberId: m.id, personId: p.id };
}
const deps = (mail: EmailSender) => ({ email: mail, baseURL });
const usersOf = (personId: string) => ctx.db.select().from(user).where(eq(user.personId, personId));
const linksOf = (memberId: string) => ctx.db.select().from(oneTimeTokens).where(and(eq(oneTimeTokens.kind, ACTIVATION_KIND), eq(oneTimeTokens.subjectId, memberId)));
const live = (rows: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }[]) => rows.filter((r) => !r.usedAt && !r.revokedAt && r.expiresAt > new Date());
const memberRow = async (memberId: string) => (await ctx.db.select().from(members).where(eq(members.id, memberId)))[0];

describe("A. invitation from the member page", () => {
  it("creates the one account for the person, links it to the member and emails the activation link", async () => {
    const h = await historical({ n: 1, dni: "99009001", email: "historica.1@example.com" });
    const mail = new MemoryEmailSender();
    expect(await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).toMatchObject({ status: "sent", resent: false, emailed: true });

    const [u] = await usersOf(h.personId);
    expect(u).toMatchObject({ role: "MEMBER", status: "pending_activation", personId: h.personId, email: `socio.${u.id}@socios.amaridul.invalid` });
    expect((await memberRow(h.memberId)).userId).toBe(u.id);

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "historica.1@example.com", template: "existing_member_access", subject: "Tu acceso a Amarí Dul está listo" });
    expect(mail.sent[0].text).toMatch(/habilitó tu acceso digital/);
    expect(mail.sent[0].text).toMatch(/creando una contraseña/);
    expect(mail.sent[0].text).toMatch(/con tu DNI y esa contraseña/);
    expect(mail.sent[0].text).not.toMatch(/99009001|99\.009\.001/);
    expect(mail.sent[0].text).not.toMatch(/verificó la actualización de tu legajo/);

    const access = (await getMemberProfile(ctx.db, ctx.rings, h.memberId))!.access;
    expect(access).toMatchObject({ state: "pending_activation", missing: null, destination: "hi•••@example.com", link: "live" });
    expect(access.lastSentAt).toBeInstanceOf(Date);

    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, h.memberId));
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(["member.account_created", "member.activation_sent"]));
    expect(logs.every((l) => l.actorUserId === adminId)).toBe(true);
    expect(JSON.stringify(logs)).not.toMatch(/99009001|#t=|password/);
  });
});

describe("B, C. what is missing is said, and nothing is created", () => {
  it("B: without an email there is no account, no link and no email", async () => {
    const h = await historical({ n: 2, dni: "99009002" });
    const mail = new MemoryEmailSender();
    await expect(inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).rejects.toThrow(/email de contacto/);
    expect(await usersOf(h.personId)).toHaveLength(0);
    expect(await linksOf(h.memberId)).toHaveLength(0);
    expect(mail.sent).toHaveLength(0);
    expect((await getMemberProfile(ctx.db, ctx.rings, h.memberId))!.access).toMatchObject({ state: "none", missing: "email", destination: null });
  });

  it("C: without a DNI there is no account, no link and no email", async () => {
    const h = await historical({ n: 3, email: "historica.3@example.com" });
    const mail = new MemoryEmailSender();
    await expect(inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).rejects.toThrow(/DNI/);
    expect(await usersOf(h.personId)).toHaveLength(0);
    expect(await linksOf(h.memberId)).toHaveLength(0);
    expect(mail.sent).toHaveLength(0);
    expect((await getMemberProfile(ctx.db, ctx.rings, h.memberId))!.access).toMatchObject({ state: "none", missing: "dni" });
  });
});

describe("D, E, F. administrative data and REPROCANN do not hold the account back", () => {
  it("invites a member without number, without category and with REPROCANN pending", async () => {
    const h = await historical({ n: 4, dni: "99009004", email: "historica.4@example.com" });
    await saveCase(ctx.db, adminId, h.memberId, caseInput.parse({ permitStatus: "pendiente_aprobacion", managementSource: "association", responsibleName: "", linkageStatus: "pendiente" }));
    await addDocument(ctx.db, ctx.rings.field, adminId, h.memberId, documentInput.parse({ kind: "credencial", issuedOn: "", expiresOn: "2027-01-01", source: "aportado_por_socio", notes: "" }));
    const m = await memberRow(h.memberId);
    expect(m).toMatchObject({ memberNumber: null, category: null });
    const mail = new MemoryEmailSender();
    expect(await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).toMatchObject({ status: "sent", emailed: true });
    expect(mail.sent[0].text).not.toMatch(/número de socio/i);
  });
});

describe("G. one account per person", () => {
  it("an active account is never replaced, and the person is told to use «Olvidé mi contraseña»", async () => {
    const h = await historical({ n: 5, dni: "99009005", email: "historica.5@example.com" });
    const mail = new MemoryEmailSender();
    await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId);
    expect(await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).toEqual({ ok: true });
    await expect(inviteToActivate(ctx.db, deps(new MemoryEmailSender()), adminId, h.memberId, { now: later(60) })).rejects.toThrow(/ya está activa[\s\S]*Olvidé mi contraseña/);
    expect(await usersOf(h.personId)).toHaveLength(1);
    expect(live(await linksOf(h.memberId))).toHaveLength(0);
  });

  it("a person who already has a member account that was never linked gets that same account", async () => {
    const h = await historical({ n: 6, dni: "99009006", email: "historica.6@example.com" });
    const [orphan] = await ctx.db
      .insert(user)
      .values({ name: "Persona Histórica 6", email: "socio.huerfana@socios.amaridul.invalid", role: "MEMBER", status: "pending_activation", personId: h.personId })
      .returning({ id: user.id });
    await inviteToActivate(ctx.db, deps(new MemoryEmailSender()), adminId, h.memberId);
    expect(await usersOf(h.personId)).toHaveLength(1);
    expect((await memberRow(h.memberId)).userId).toBe(orphan.id);
    const actions = (await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, h.memberId))).map((l) => l.action);
    expect(actions).toContain("member.account_linked");
    expect(actions).not.toContain("member.account_created");
  });
});

describe("H, I. resending and repeated requests", () => {
  it("H: a resend keeps the account, issues a new link and the previous one stops working", async () => {
    const h = await historical({ n: 7, dni: "99009007", email: "historica.7@example.com" });
    const first = new MemoryEmailSender();
    await inviteToActivate(ctx.db, deps(first), adminId, h.memberId);
    const userId = (await memberRow(h.memberId)).userId;
    const second = new MemoryEmailSender();
    expect(await inviteToActivate(ctx.db, deps(second), adminId, h.memberId, { now: later(60) })).toMatchObject({ status: "sent", resent: true, emailed: true });
    expect((await memberRow(h.memberId)).userId).toBe(userId);
    expect(await usersOf(h.personId)).toHaveLength(1);
    expect(await checkActivation(ctx.db, ctx.rings, tokenIn(first.sent[0].text))).toEqual({ status: "invalid" });
    expect(await checkActivation(ctx.db, ctx.rings, tokenIn(second.sent[0].text))).toMatchObject({ status: "ok", origin: "legacy" });
    expect(live(await linksOf(h.memberId))).toHaveLength(1);
    expect((await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, h.memberId))).map((l) => l.action)).toContain("member.activation_resent");
  });

  it("I: a double click (two requests at once, or one right after the other) creates one account and sends one email", async () => {
    const h = await historical({ n: 8, dni: "99009008", email: "historica.8@example.com" });
    const mail = new MemoryEmailSender();
    const results = await Promise.all([inviteToActivate(ctx.db, deps(mail), adminId, h.memberId), inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)]);
    expect(results.map((r) => r.status).sort()).toEqual(["already_sent", "sent"]);
    expect(await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).toEqual({ status: "already_sent" });
    expect(await usersOf(h.personId)).toHaveLength(1);
    expect(live(await linksOf(h.memberId))).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
    expect((await memberRow(h.memberId)).userId).toBe((await usersOf(h.personId))[0].id);
  });

  it("an email that could not be sent leaves no live link, so the admin can retry right away", async () => {
    const h = await historical({ n: 9, dni: "99009009", email: "historica.9@example.com" });
    const failing: EmailSender = {
      send: async () => {
        throw new Error("proveedor caído");
      },
    };
    expect(await inviteToActivate(ctx.db, deps(failing), adminId, h.memberId)).toMatchObject({ status: "sent", emailed: false });
    expect(live(await linksOf(h.memberId))).toHaveLength(0);
    const mail = new MemoryEmailSender();
    expect(await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).toMatchObject({ status: "sent", emailed: true });
    expect(mail.sent).toHaveLength(1);
  });

  it("an email shared with another record needs the admin's confirmation, and never says whose it is", async () => {
    await historical({ n: 10, dni: "99009010", email: "compartido@example.com" });
    const h = await historical({ n: 11, dni: "99009011", email: "compartido@example.com" });
    const mail = new MemoryEmailSender();
    const refused = inviteToActivate(ctx.db, deps(mail), adminId, h.memberId);
    await expect(refused).rejects.toBeInstanceOf(MemberProfileError);
    await expect(inviteToActivate(ctx.db, deps(mail), adminId, h.memberId)).rejects.toThrow(/otro registro del padrón/);
    expect(await usersOf(h.personId)).toHaveLength(0);
    expect((await getMemberProfile(ctx.db, ctx.rings, h.memberId))!.access.emailShared).toBe(true);
    expect(await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId, { confirmSharedEmail: true })).toMatchObject({ status: "sent", emailed: true });
  });
});

describe("J, K. from the email to the portal, and a later DNI correction", () => {
  it("J: the member creates the password, signs in with DNI and reaches the same portal", async () => {
    const h = await historical({ n: 12, dni: "99009012", email: "historica.12@example.com" });
    const mail = new MemoryEmailSender();
    await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId);
    const token = tokenIn(mail.sent[0].text);
    expect(await checkActivation(ctx.db, ctx.rings, token)).toMatchObject({ status: "ok", memberNumber: null, origin: "legacy", dniMasked: "**.***.012" });
    expect(await activateAccount(ctx.db, token, PASSWORD)).toEqual({ ok: true });
    expect(await activateAccount(ctx.db, token, PASSWORD)).toEqual({ ok: false, error: "invalid_link" }); // single use
    const res = await ctx.post("/sign-in/dni", { dni: "99009012", password: PASSWORD });
    expect(res.ok).toBe(true);
    const userId = (await memberRow(h.memberId)).userId!;
    expect(await memberOfUser(ctx.db, userId)).toMatchObject({ id: h.memberId, memberNumber: null, category: null });
    const access = (await getMemberProfile(ctx.db, ctx.rings, h.memberId))!.access;
    expect(access.state).toBe("active");
    expect(access.activatedAt).toBeInstanceOf(Date);
    expect((await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, userId))).map((l) => l.action)).toContain("member.activated");
  });

  it("K: correcting the DNI keeps the same account, moves the login and closes open sessions", async () => {
    const h = await historical({ n: 13, dni: "99009013", email: "historica.13@example.com" });
    const mail = new MemoryEmailSender();
    await inviteToActivate(ctx.db, deps(mail), adminId, h.memberId);
    await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD);
    const userId = (await memberRow(h.memberId)).userId!;
    expect((await ctx.post("/sign-in/dni", { dni: "99009013", password: PASSWORD })).ok).toBe(true);
    expect(await changeDni(ctx.db, ctx.rings, adminId, h.memberId, "99009113")).toEqual({ changed: true, sessionsRevoked: 1 });
    expect(await ctx.db.select().from(session).where(eq(session.userId, userId))).toHaveLength(0);
    expect((await ctx.post("/sign-in/dni", { dni: "99009013", password: PASSWORD })).ok).toBe(false);
    expect((await ctx.post("/sign-in/dni", { dni: "99009113", password: PASSWORD })).ok).toBe(true);
    expect((await memberAccountByDni(ctx.db, ctx.rings, "99009113"))!.userId).toBe(userId);
    expect(await usersOf(h.personId)).toHaveLength(1);
  });
});

describe("M. the import never gives access", () => {
  it("imported members have no account, no activation link and nobody is emailed", async () => {
    const content = ["Apellido,Nombre,DNI,Email,Socio/a", "Ficticia,Importada Uno,99009201,importada.1@example.com,SI", "Ficticia,Importada Dos,99009202,importada.2@example.com,NO"].join("\n");
    const sentBefore = ctx.email.sent.length;
    const out = await applyImport(ctx.db, ctx.rings, { name: "padron.csv", content });
    expect(out.created).toBe(2);
    const imported = await ctx.db.select().from(members).where(eq(members.importRunId, out.runId));
    expect(imported).toHaveLength(2);
    for (const m of imported) {
      expect(m.userId).toBeNull();
      expect(await usersOf(m.personId)).toHaveLength(0);
      expect(await linksOf(m.id)).toHaveLength(0);
    }
    expect(ctx.email.sent.length).toBe(sentBefore);
  });
});
