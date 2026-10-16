import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { auditLogs, importRuns, memberFeeSettings, memberNotes, memberNumbers, members, personIdentities, persons, reprocannCases, reprocannDocuments, session, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { dniLookup } from "@/server/crypto/dni";
import { readPersonDni } from "@/server/identity/person-identity";
import { activateAccount, memberAccountByDni, nextMemberNumber } from "@/server/members";
import { analyse, applyImport, mapRows, parseCsv, parseDate } from "@/server/legacy-import";
import {
  addMemberNote,
  changeDni,
  changeMemberNumber,
  contactInput,
  getMemberProfile,
  inviteToActivate,
  listRegister,
  MemberProfileError,
  membershipInput,
  personalInput,
  updateContact,
  updateMembership,
  updatePersonal,
} from "@/server/member-profile";
import { existingMemberInput, getExistingMemberRequest, linkExistingMember, linkInput, submitExistingMemberRequest } from "@/server/existing-members";
import { cookiesFrom, makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
const baseURL = "https://amaridul.test";
const PASSWORD = "una frase larga y ficticia";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.padron@example.com")).id;
});

const HEADER = "N°,Apellido,Nombre,DNI,Celular,Localidad,Socio/a,Sala,Fecha de vencimiento,Días para vencer,Estado credencial,Credencial,Cuota: fecha de alta,Medio de pago,Observaciones";
const csv = (...lines: string[]) => [HEADER, ...lines].join("\n");
const file = (content: string) => ({ name: "padron-ficticio.csv", content });
async function memberByDni(dni: string) {
  const [i] = await ctx.db.select().from(personIdentities).where(eq(personIdentities.dniLookup, dniLookup(ctx.rings.lookup, dni).value));
  if (!i) return null;
  const [m] = await ctx.db.select().from(members).where(eq(members.personId, i.personId));
  return m ?? null;
}
const memberCount = async () => Number((await ctx.db.select({ n: count() }).from(members))[0].n);

describe("CSV reading", () => {
  it("reads quoted fields, semicolons and Argentine dates", () => {
    const rows = parseCsv('a;b\n"x; y";"dijo ""hola"""\n');
    expect(rows).toEqual([["a", "b"], ["x; y", 'dijo "hola"']]);
    expect(parseDate("17/12/2028")).toBe("2028-12-17");
    expect(parseDate("1/2/27")).toBe("2027-02-01");
    expect(parseDate("")).toBeNull();
    expect(parseDate("31/02/2027")).toBeUndefined();
  });

  it("does not treat the sheet's N° as a member number, and flags missing columns", () => {
    const { rows, missing } = mapRows(parseCsv(csv("7,Ficticia,Persona,99002001,,,SI,,,,,,,,")));
    expect(rows[0]).not.toHaveProperty("memberNumber");
    expect(mapRows(parseCsv("Apellido,Nombre\nA,B")).missing).toEqual(["dni"]);
    expect(missing).toEqual([]);
  });
});

describe("historical register import", () => {
  const content = csv(
    "1,Ficticia,Persona 01,99002001,+54 9 342 000 0001,Santa Fe,SI,Sala Norte,17/12/2028,,ACTIVA,https://ejemplo.invalid/credencial,01/03/2024,Transferencia,Falta copia del DNI",
    "2,Ficticio,Persona 02,99002002,,Paraná,SI,,,,,,,,",
    "3,Ficticia,Persona 03,,,Santa Fe,SI,,,,,,,,",
    "4,Ficticio,Persona 04,99002004,,Santa Fe,NO,,,,,,,,",
    "5,Ficticia,Persona 05,12AB,,Santa Fe,SI,,,,,,,,",
    ",,,,,,,,,,,,,,",
  );

  it("dry run reports every row and writes nothing (G, H)", async () => {
    const before = await memberCount();
    const { rows } = mapRows(parseCsv(content));
    const { results, summary, blocking } = await analyse(ctx.db, ctx.rings, rows);
    expect(blocking).toBe(false);
    expect(summary).toMatchObject({ rows: 6, create: 3, review: 2, skip: 1, withoutDni: 1, invalidDni: 1 });
    expect(results.find((r) => r.line === 4)!.reason).toMatch(/Sin DNI/);
    // "Socio/a" does not decide membership: every row of the register is a member.
    expect(results.find((r) => r.line === 5)!.outcome).toBe("create");
    expect(results[0].dniMasked).not.toContain("99002001");
    expect(await memberCount()).toBe(before);
  });

  it("A, C, S: creates historical members without account, without emails, with conservative REPROCANN data", async () => {
    const out = await applyImport(ctx.db, ctx.rings, file(content));
    expect(out).toMatchObject({ created: 3, updated: 0 });
    expect(ctx.email.sent).toHaveLength(0);

    const m = (await memberByDni("99002001"))!;
    expect(m).toMatchObject({ origin: "legacy", userId: null, memberNumber: null, category: null, since: null, room: "Sala Norte", importRunId: out.runId });
    const [p] = await ctx.db.select().from(persons).where(eq(persons.id, m.personId));
    expect(p).toMatchObject({ firstNames: "Persona 01", lastNames: "Ficticia", phone: "+54 9 342 000 0001", locality: "Santa Fe" });
    const [fee] = await ctx.db.select().from(memberFeeSettings).where(eq(memberFeeSettings.memberId, m.id));
    expect(fee).toBeUndefined(); // fee columns wait for their institutional mapping: not imported yet
    const [note] = await ctx.db.select().from(memberNotes).where(eq(memberNotes.memberId, m.id));
    expect(note).toMatchObject({ source: "import", authorId: null, body: "Falta copia del DNI" });

    // P: a future date is "vigente", but nobody reviewed it: still pending. The sheet's link is not kept.
    const [c] = await ctx.db.select().from(reprocannCases).where(eq(reprocannCases.memberId, m.id));
    const [doc] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.caseId, c.id));
    expect(doc).toMatchObject({ source: "en_poder_de_la_asociacion", reviewStatus: "pendiente", expiresOn: "2028-12-17", fileKey: null });
    expect(c.permitStatus).toBe("no_informado"); // not "sin permiso": the sheet does not say
    expect(JSON.stringify(doc)).not.toContain("ejemplo.invalid");
    const profile = await getMemberProfile(ctx.db, ctx.rings, m.id, "2026-10-15");
    expect(profile!.validity).toMatchObject({ state: "valid" });
    expect(profile!.credential!.reviewStatus).toBe("pendiente");
    expect(profile!.account).toBe("none");
    expect(profile!.membership.legajo).toBe("imported");

    const [run] = await ctx.db.select().from(importRuns).where(eq(importRuns.id, out.runId));
    expect(run).toMatchObject({ rows: 6, created: 3, kind: "legacy_members" });
    expect(run.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(await ctx.db.select().from(auditLogs))).not.toContain("99002001");
  });

  it("D: running the same file again creates nothing", async () => {
    const before = await memberCount();
    const out = await applyImport(ctx.db, ctx.rings, file(content));
    expect(out).toMatchObject({ created: 0, updated: 0 });
    expect(out.results.filter((r) => r.outcome === "match")).toHaveLength(3);
    expect(await memberCount()).toBe(before);
    const m = (await memberByDni("99002001"))!;
    expect(await ctx.db.select().from(memberNotes).where(eq(memberNotes.memberId, m.id))).toHaveLength(1);
  });

  it("E, F: a member already on file is matched by DNI; only empty fields are filled", async () => {
    const m = (await memberByDni("99002002"))!;
    await updateMembership(ctx.db, adminId, m.id, membershipInput.parse({ category: "adherente", since: "2019-01-01", status: "activo", minutesReference: "Acta 3", room: "" }));
    const before = await memberCount();
    const out = await applyImport(ctx.db, ctx.rings, file(csv("1,Ficticio,Persona 02,99.002.002,+54 9 343 000 0002,Paraná,SI,Sala Sur,,,,,,Efectivo,")));
    expect(out).toMatchObject({ created: 0, updated: 1 });
    expect(await memberCount()).toBe(before);
    const [after] = await ctx.db.select().from(members).where(eq(members.id, m.id));
    expect(after).toMatchObject({ room: "Sala Sur", category: "adherente", since: "2019-01-01", minutesReference: "Acta 3" });
  });

  it("refuses to apply with a repeated DNI", async () => {
    await expect(applyImport(ctx.db, ctx.rings, file(csv("1,A,B,99002010,,,SI,,,,,,,,", "2,C,D,99002010,,,SI,,,,,,,,")))).rejects.toThrow(/conflictos/);
    expect(await memberByDni("99002010")).toBeNull();
  });

  it("a person on file without membership is left for manual review", async () => {
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Ficticia 12", isFixture: true }).returning({ id: persons.id });
    const { setPersonDni } = await import("@/server/identity/person-identity");
    await setPersonDni(ctx.db, ctx.rings, p.id, "99002012");
    const { results } = await analyse(ctx.db, ctx.rings, mapRows(parseCsv(csv("1,Ficticia,Persona 12,99002012,,,SI,,,,,,,,"))).rows);
    expect(results[0]).toMatchObject({ outcome: "review" });
  });
});

describe("member page editing", () => {
  it("I: names and contact belong to the person; the address is not written to the log", async () => {
    const m = (await memberByDni("99002001"))!;
    await updatePersonal(ctx.db, adminId, m.id, personalInput.parse({ firstNames: "Persona", lastNames: "Ficticia Uno", birthDate: "1980-05-05" }));
    await updateContact(ctx.db, adminId, m.id, contactInput.parse({ email: "persona.01@example.com", phone: "+54 9 342 000 0001", address: "Calle Ficticia 1", locality: "Santa Fe", province: "Santa Fe", postalCode: "3000" }));
    const [p] = await ctx.db.select().from(persons).where(eq(persons.id, m.personId));
    expect(p).toMatchObject({ fullName: "Persona Ficticia Uno", email: "persona.01@example.com", address: "Calle Ficticia 1", postalCode: "3000" });
    const logs = JSON.stringify(await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, m.id)));
    expect(logs).toContain("member.contact_updated");
    expect(logs).not.toContain("Calle Ficticia 1");
    expect(logs).not.toContain("1980-05-05");
  });

  it("M: category and membership data are edited and audited", async () => {
    const m = (await memberByDni("99002001"))!;
    await updateMembership(ctx.db, adminId, m.id, membershipInput.parse({ category: "paciente", since: "", status: "activo", minutesReference: "", room: "Sala Norte" }));
    const [after] = await ctx.db.select().from(members).where(eq(members.id, m.id));
    expect(after.category).toBe("paciente");
    const [log] = (await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "member.institutional_data_updated"))).filter((l) => l.entityId === m.id);
    expect(log.metadata).toMatchObject({ category_before: null, category_after: "paciente" });
  });

  it("Q: notes are internal and their text never reaches the log", async () => {
    const m = (await memberByDni("99002001"))!;
    await addMemberNote(ctx.db, adminId, m.id, "Prefiere que lo llamen por la tarde.");
    const profile = await getMemberProfile(ctx.db, ctx.rings, m.id);
    expect(profile!.notes.map((n) => n.body)).toContain("Prefiere que lo llamen por la tarde.");
    expect(JSON.stringify(await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "member.note_added")))).not.toContain("tarde");
  });

  it("K, L: correcting the number keeps the account, and the old number is never reused", async () => {
    const m = (await memberByDni("99002001"))!;
    await changeMemberNumber(ctx.db, adminId, m.id, "H-0101");
    await inviteToActivate(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, m.id);
    const [withAccount] = await ctx.db.select().from(members).where(eq(members.id, m.id));
    const accountId = withAccount.userId!;
    const [u] = await ctx.db.select().from(user).where(eq(user.id, accountId));
    expect(u.email).not.toContain("h-0101"); // the internal address does not depend on the number

    await changeMemberNumber(ctx.db, adminId, m.id, "H-0102");
    const [after] = await ctx.db.select().from(members).where(eq(members.id, m.id));
    expect(after).toMatchObject({ memberNumber: "H-0102", userId: accountId });
    expect((await ctx.db.select().from(user).where(eq(user.id, accountId)))[0].email).toBe(u.email);
    const history = await ctx.db.select().from(memberNumbers).where(eq(memberNumbers.memberId, m.id));
    expect(history.map((h) => [h.number, !!h.replacedAt]).sort()).toEqual([
      ["H-0101", true],
      ["H-0102", false],
    ]);

    const other = (await memberByDni("99002002"))!;
    await expect(changeMemberNumber(ctx.db, adminId, other.id, "h-0101")).rejects.toBeInstanceOf(MemberProfileError);
    await expect(changeMemberNumber(ctx.db, adminId, other.id, "H-0102")).rejects.toBeInstanceOf(MemberProfileError);
    // A member may go back to a number that was theirs.
    await changeMemberNumber(ctx.db, adminId, m.id, "H-0101");
    expect((await ctx.db.select().from(members).where(eq(members.id, m.id)))[0].memberNumber).toBe("H-0101");
  });

  it("the automatic AD number skips numbers kept in the history", async () => {
    const m = (await memberByDni("99002002"))!;
    const next = await nextMemberNumber(ctx.db);
    await changeMemberNumber(ctx.db, adminId, m.id, next.replace(/\d+$/, (d) => String(+d + 1).padStart(4, "0")));
    await changeMemberNumber(ctx.db, adminId, m.id, "H-0200");
    const reserved = next.replace(/\d+$/, (d) => String(+d + 1).padStart(4, "0"));
    expect(await nextMemberNumber(ctx.db)).not.toBe(reserved);
  });

  it("B, J: activation after the invitation; a DNI change moves the login, closes sessions and stays unique", async () => {
    const m = (await memberByDni("99002001"))!;
    const mail = new MemoryEmailSender();
    await inviteToActivate(ctx.db, { email: mail, baseURL }, adminId, m.id);
    expect(mail.sent[0]).toMatchObject({ to: "persona.01@example.com", template: "existing_member_access" });
    expect(await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).toEqual({ ok: true });
    const res = await ctx.post("/sign-in/dni", { dni: "99002001", password: PASSWORD });
    expect(res.ok).toBe(true);
    const cookie = cookiesFrom(res);

    const userId = (await ctx.db.select().from(members).where(eq(members.id, m.id)))[0].userId!;
    await expect(changeDni(ctx.db, ctx.rings, adminId, m.id, "99002002")).rejects.toThrow(/otra persona/);
    const r = await changeDni(ctx.db, ctx.rings, adminId, m.id, "99.002.091");
    expect(r).toEqual({ changed: true, sessionsRevoked: 1 });
    expect(await readPersonDni(ctx.db, ctx.rings, m.personId)).toBe("99002091");
    expect(await ctx.db.select().from(session).where(eq(session.userId, userId))).toHaveLength(0);
    expect(await ctx.sessionOf(cookie)).toBeNull();
    expect((await ctx.post("/sign-in/dni", { dni: "99002001", password: PASSWORD })).ok).toBe(false);
    expect((await ctx.post("/sign-in/dni", { dni: "99002091", password: PASSWORD })).ok).toBe(true);
    expect((await memberAccountByDni(ctx.db, ctx.rings, "99002091"))!.userId).toBe(userId);
    const logs = JSON.stringify(await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "member.identity_updated")));
    expect(logs).not.toContain("99002091");
    expect(logs).not.toContain("99002001");
  });

  it("the register list shows membership, account, legajo and credential apart", async () => {
    const rows = await listRegister(ctx.db, "2026-10-15");
    const row = rows.find((r) => r.memberNumber === "H-0101")!;
    expect(row).toMatchObject({ account: "active", legajo: "updated", review: "pendiente", room: "Sala Norte" });
    expect(row.validity.state).toBe("valid");
    const imported = rows.find((r) => r.name === "Ficticio, Persona 02")!;
    expect(imported).toMatchObject({ account: "none", legajo: "imported" });
  });
});

describe("W: an imported member who later uses 'Ya soy socio/a'", () => {
  it("is matched and linked: no new member, institutional data kept, account created then", async () => {
    await applyImport(ctx.db, ctx.rings, file(csv("1,Ficticia,Persona 30,99002030,,Santa Fe,SI,Sala Este,,,,,,,")));
    const imported = (await memberByDni("99002030"))!;
    await changeMemberNumber(ctx.db, adminId, imported.id, "H-0300");
    const before = await memberCount();

    const req = await submitExistingMemberRequest(
      ctx.db,
      { rings: ctx.rings, email: new MemoryEmailSender() },
      existingMemberInput.parse({ nombres: "Persona", apellidos: "Ficticia Treinta", dni: "99002030", email: "persona.30@example.com", nacimiento: "1979-01-01", domicilio: "Calle 30", localidad: "Santa Fe", provincia: "Santa Fe", cp: "3000", numeroSocio: "H-9999", privacidad: true, confirmacion: true }),
      null,
    );
    const [row] = await ctx.db.select().from((await import("@/server/db/schema")).existingMemberRequests).where(eq((await import("@/server/db/schema")).existingMemberRequests.reference, req.reference!));
    const detail = await getExistingMemberRequest(ctx.db, ctx.rings, row.id);
    expect(detail!.match.member).toMatchObject({ id: imported.id, accountStatus: "none" });

    const mail = new MemoryEmailSender();
    const out = await linkExistingMember(ctx.db, { email: mail, baseURL, rings: ctx.rings }, adminId, row.id, linkInput.parse({ updateContact: true, category: "activo", since: "", minutesReference: "", status: "activo" }));
    expect(out.emailed).toBe(true);
    expect(await memberCount()).toBe(before);
    const [after] = await ctx.db.select().from(members).where(eq(members.id, imported.id));
    expect(after.memberNumber).toBe("H-0300"); // the declared H-9999 does not replace the institutional number
    expect(after.userId).not.toBeNull();
    expect(await activateAccount(ctx.db, tokenIn(mail.sent[0].text), PASSWORD)).toEqual({ ok: true });
    expect((await ctx.post("/sign-in/dni", { dni: "99002030", password: PASSWORD })).ok).toBe(true);
    const profile = await getMemberProfile(ctx.db, ctx.rings, imported.id);
    expect(profile!.membership).toMatchObject({ declaredNumber: "H-9999", memberNumber: "H-0300", legajo: "updated" });
    expect(profile!.contact.email).toBe("persona.30@example.com");
  });
});

// The real check (no session, member session, admin) is in member-register-auth.test.ts; this one
// keeps any new action on the page from skipping the shared gate.
describe("R: only admins can change the register", () => {
  it("every member-page action goes through the admin check", () => {
    const source = readFileSync("src/app/admin/(panel)/socios/[id]/actions.ts", "utf8");
    expect(source).toMatch(/async function run\([\s\S]*?await requireAdmin\(\)/);
    const exported = [...source.matchAll(/export const (\w+) = async/g)].map((m) => m[1]);
    expect(exported.length).toBeGreaterThanOrEqual(8);
    for (const name of exported) expect(source).toMatch(new RegExp(`export const ${name} = async [^=]*=>\\s*run\\(`));
  });
});
