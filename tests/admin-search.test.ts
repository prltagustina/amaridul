// The admin's global search: members by name (without accents, words in any order), whole DNI,
// member number (also a previous one) and email; requests and admissions; REPROCANN procedures;
// products by name or variety. Every group is bounded, LIKE wildcards are taken literally, and a
// partial DNI never matches.
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { admissions, existingMemberRequests, memberNumbers, members, persons, preAdmissions, products, varieties } from "@/server/db/schema";
import { setPersonDni } from "@/server/identity/person-identity";
import { dniLookup } from "@/server/crypto/dni";
import { addDocument, documentInput } from "@/server/reprocann";
import { parseQuery, searchAdmissions, searchExistingRequests, searchMembers, searchPreAdmissions, searchProcedures, searchProducts, type SearchQuery } from "@/server/admin-search";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let juan: string;
let ana: string;
const q = (text: string) => parseQuery(text, ctx.rings) as SearchQuery;

async function member(o: { first: string; last: string; email: string; number: string | null; dni?: string }) {
  const [p] = await ctx.db.insert(persons).values({ fullName: `${o.first} ${o.last}`, firstNames: o.first, lastNames: o.last, email: o.email, isFixture: true }).returning({ id: persons.id });
  if (o.dni) await setPersonDni(ctx.db, ctx.rings, p.id, o.dni);
  const [m] = await ctx.db.insert(members).values({ personId: p.id, memberNumber: o.number, status: "activo", origin: "legacy" }).returning({ id: members.id });
  return { memberId: m.id, personId: p.id };
}

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.busqueda@example.com")).id;
  const j = await member({ first: "Juan Carlos", last: "Pérez Ficticio", email: "juan.ficticio@example.com", number: "BQ-0101", dni: "99120101" });
  juan = j.memberId;
  await ctx.db.insert(memberNumbers).values({ memberId: juan, number: "VIEJO-77", assignedAt: new Date("2020-01-01"), replacedAt: new Date("2026-01-01") });
  ana = (await member({ first: "Ana", last: "Muñoz Ficticia", email: "ana.ficticia@example.com", number: null, dni: "99120202" })).memberId;
  for (let i = 0; i < 9; i++) await member({ first: `Persona${i}`, last: "Repetida Ficticia", email: `repetida${i}@example.com`, number: `BQ-2${i}` });
  await member({ first: "Cien", last: "Por Ciento", email: "cien%@example.com", number: "BQ-100%" });

  // A procedure for Juan, with a credential waiting for review.
  await addDocument(ctx.db, ctx.rings.field, adminId, juan, documentInput.parse({ kind: "credencial", permitIdentifier: "", issuedOn: "", expiresOn: "2027-09-30", source: "en_poder_de_la_asociacion", notes: "" }));

  // A pre-admission, its formal admission (another person) and a «Ya soy socio/a» request.
  const preId = randomUUID();
  const at = new Date("2026-10-20T12:00:00Z");
  await ctx.db.insert(preAdmissions).values({ id: preId, reference: "PRE-2026-0909", fullName: "Lucía Gómez Ficticia", email: "lucia.ficticia@example.com", province: "Santa Fe", locality: "Ficticia", wantsToParticipate: true, motivationEncrypted: "x", privacyAcceptedAt: at });
  const [p] = await ctx.db.insert(persons).values({ fullName: "Lucía Gómez Ficticia", firstNames: "Lucía", lastNames: "Gómez Ficticia", email: "lucia.ficticia@example.com", isFixture: true }).returning({ id: persons.id });
  await setPersonDni(ctx.db, ctx.rings, p.id, "99120303");
  await ctx.db.insert(admissions).values({
    id: randomUUID(), reference: "ADM-2026-0909", preAdmissionId: preId, personId: p.id, firstNames: "Lucía", lastNames: "Gómez Ficticia", address: "Calle Ficticia 1", postalCode: "0000", category: "adherente", healthEncrypted: "x", statuteVersion: "v1",
    obligationsAcceptedAt: at, statuteAcceptedAt: at, feeAcknowledgedAt: at, truthfulnessDeclaredAt: at, changesCommitmentAt: at, privacyAcceptedAt: at, submittedAt: at,
  });
  const lookup = dniLookup(ctx.rings.lookup, "99120404");
  await ctx.db.insert(existingMemberRequests).values({ id: randomUUID(), reference: "SOC-2026-0909", fullName: "Raúl Díaz Ficticio", firstNames: "Raúl", lastNames: "Díaz Ficticio", email: "raul.ficticio@example.com", dniLookup: lookup.value, dniLookupKeyVersion: lookup.version, dniEncrypted: "x", declaredMemberNumber: "H-55" });

  const [v] = await ctx.db.insert(varieties).values({ code: "TG-FIC", name: "Tangie Ficticia" }).returning({ id: varieties.id });
  await ctx.db.insert(products).values({ name: "Flores Ficticias CC", type: "inflorescencia", varietyId: v.id, status: "activo" });
});

describe("la búsqueda del admin", () => {
  it("needs at least two characters, and keeps at most 80", () => {
    expect(parseQuery("", ctx.rings)).toBeNull();
    expect(parseQuery(" a ", ctx.rings)).toBeNull();
    expect(parseQuery("x".repeat(200), ctx.rings)!.text).toHaveLength(80);
  });

  it("finds members by name without accents, in any order, and by part of a name", async () => {
    for (const text of ["perez", "PÉREZ", "juan perez", "pérez juan", "ficticio jua"]) {
      expect((await searchMembers(ctx.db, q(text), 6)).rows.map((r) => r.id)).toContain(juan);
    }
    expect((await searchMembers(ctx.db, q("munoz"), 6)).rows.map((r) => r.id)).toEqual([ana]);
    expect((await searchMembers(ctx.db, q("juan muñoz"), 6)).rows).toEqual([]);
  });

  it("finds a member by whole DNI only (with or without dots), and says so", async () => {
    const r = await searchMembers(ctx.db, q("99.120.101"), 6);
    expect(r.rows).toEqual([expect.objectContaining({ id: juan, match: "dni" })]);
    expect((await searchMembers(ctx.db, q("99120101"), 6)).rows[0].id).toBe(juan);
    // Part of a DNI is not a search by DNI.
    expect((await searchMembers(ctx.db, q("120101"), 6)).rows).toEqual([]);
  });

  it("finds by member number, by a previous number and by email", async () => {
    expect((await searchMembers(ctx.db, q("bq-0101"), 6)).rows).toEqual([expect.objectContaining({ id: juan, match: "numero" })]);
    expect((await searchMembers(ctx.db, q("viejo-77"), 6)).rows).toEqual([expect.objectContaining({ id: juan, match: "numero_anterior" })]);
    expect((await searchMembers(ctx.db, q("ana.ficticia@"), 6)).rows).toEqual([expect.objectContaining({ id: ana, match: "email" })]);
  });

  it("each group is bounded and says whether there are more; pages follow", async () => {
    const first = await searchMembers(ctx.db, q("repetida"), 6);
    expect(first.rows).toHaveLength(6);
    expect(first.more).toBe(true);
    const next = await searchMembers(ctx.db, q("repetida"), 6, 6);
    expect(next.rows).toHaveLength(3);
    expect(next.more).toBe(false);
    expect(new Set([...first.rows, ...next.rows].map((r) => r.id)).size).toBe(9);
  });

  it("takes LIKE wildcards literally", async () => {
    expect((await searchMembers(ctx.db, q("%%"), 50)).rows).toEqual([]);
    expect((await searchMembers(ctx.db, q("__"), 50)).rows).toEqual([]);
    expect((await searchMembers(ctx.db, q("100%"), 50)).rows.map((r) => r.name)).toEqual(["Por Ciento, Cien"]);
  });

  it("finds the REPROCANN procedure of a member, with the document to review", async () => {
    const r = await searchProcedures(ctx.db, q("perez"), 6);
    expect(r.rows).toEqual([expect.objectContaining({ memberId: juan, linkage: "pendiente", codeReceived: false })]);
    expect(r.rows[0].credential.key).toBe("pending");
    expect(r.rows[0].reviewDocumentId).toBeTruthy();
    // A member without a procedure has none.
    expect((await searchProcedures(ctx.db, q("munoz"), 6)).rows).toEqual([]);
  });

  it("finds pre-admissions, admissions and «Ya soy socio/a» requests by their own fields", async () => {
    expect((await searchPreAdmissions(ctx.db, q("gomez"), 6)).rows.map((r) => r.reference)).toEqual(["PRE-2026-0909"]);
    expect((await searchPreAdmissions(ctx.db, q("pre-2026-0909"), 6)).rows[0].match).toBe("referencia");
    expect((await searchAdmissions(ctx.db, q("lucia gomez"), 6)).rows.map((r) => r.reference)).toEqual(["ADM-2026-0909"]);
    expect((await searchAdmissions(ctx.db, q("99120303"), 6)).rows[0]).toMatchObject({ reference: "ADM-2026-0909", match: "dni" });
    expect((await searchExistingRequests(ctx.db, q("diaz raul"), 6)).rows.map((r) => r.reference)).toEqual(["SOC-2026-0909"]);
    expect((await searchExistingRequests(ctx.db, q("99120404"), 6)).rows[0]).toMatchObject({ reference: "SOC-2026-0909", match: "dni" });
    expect((await searchExistingRequests(ctx.db, q("h-55"), 6)).rows[0].match).toBe("numero");
  });

  it("finds products by name or variety", async () => {
    expect((await searchProducts(ctx.db, q("flores ficticias"), 6)).rows.map((r) => r.name)).toEqual(["Flores Ficticias CC"]);
    expect((await searchProducts(ctx.db, q("tangie"), 6)).rows[0]).toMatchObject({ name: "Flores Ficticias CC", match: "variedad" });
  });
});
