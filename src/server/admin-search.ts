// The admin's global search: one query across the panel's records, grouped by kind. Each group is
// a bounded query (a page of results and whether there are more): the database never travels to
// the browser. Names match without accents and in any order («perez juan» finds «Juan Pérez»);
// a DNI matches only whole, through its lookup, as everywhere else. Only for admins: the callers
// check it. The query itself is never logged nor stored, because it may be a DNI.
import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Database } from "@/server/db/client";
import { admissions, existingMemberRequests, memberNumbers, members, personIdentities, persons, preAdmissions, products, reprocannCases, reprocannDocuments, varieties } from "@/server/db/schema";
import type { Keyrings } from "@/server/identity/person-identity";
import { dniLookupCandidates } from "@/server/crypto/dni";
import { credentialStatus, currentCredential, type CredentialStatus } from "@/lib/credential-validity";
import { CREDENTIAL_KINDS } from "@/server/reprocann";

export const SEARCH_GROUPS = ["socios", "tramites", "preadmisiones", "admisiones", "solicitudes", "productos"] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];
/** What matched, when it is not the name. */
export type SearchMatch = "dni" | "numero" | "numero_anterior" | "email" | "referencia" | "variedad" | null;

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 80;

// Accents (and ñ, ç) folded the same way on both sides, so «Pérez», «perez» and «PEREZ» match.
const FROM = "áàäâãéèëêíìïîóòöôõúùüûñç";
const TO = "aaaaaeeeeiiiiooooouuuunc";
const FOLD = new Map([...FROM].map((c, i) => [c, TO[i]]));
export const foldText = (s: string) => [...s.toLowerCase()].map((c) => FOLD.get(c) ?? c).join("");
const folded = (expr: SQL | AnyPgColumn) => sql`translate(lower(coalesce(${expr}, '')), ${FROM}, ${TO})`;
/** `%term%`, with LIKE's own wildcards taken literally. */
const contains = (term: string) => `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const like = (expr: SQL | AnyPgColumn, term: string) => sql`${folded(expr)} like ${contains(term)}`;
/** Every word of the query somewhere in the name. */
const allWords = (expr: SQL, words: string[]) => and(...words.map((w) => like(expr, w)))!;

export type SearchQuery = { text: string; words: string[]; dniLookups: string[] };

/** The query as typed, cleaned up; null when it is too short to search. */
export function parseQuery(raw: string, rings: Keyrings): SearchQuery | null {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  if (text.length < MIN_QUERY_LENGTH) return null;
  const words = foldText(text).split(" ").filter(Boolean);
  // A DNI is searched whole (7 or 8 digits, with or without dots), never by part.
  const digits = text.replace(/[\s.-]/g, "");
  let dniLookups: string[] = [];
  if (/^\d{7,8}$/.test(digits)) {
    try {
      dniLookups = dniLookupCandidates(rings.lookup, digits).map((c) => c.value);
    } catch {
      dniLookups = [];
    }
  }
  return { text, words, dniLookups };
}

const page = <T,>(rows: T[], limit: number) => ({ rows: rows.slice(0, limit), more: rows.length > limit });
const name = (r: { fullName: string; firstNames: string | null; lastNames: string | null }) => (r.lastNames && r.firstNames ? `${r.lastNames}, ${r.firstNames}` : r.fullName);
const personName = sql`concat_ws(' ', ${persons.fullName}, ${persons.firstNames}, ${persons.lastNames})`;
const exact = (expr: SQL | AnyPgColumn, text: string) => sql`${folded(expr)} = ${foldText(text)}`;
const anyIn = (column: AnyPgColumn, values: string[]) => (values.length ? inArray(column, values) : sql`false`);

export type MemberHit = { id: string; name: string; memberNumber: string | null; status: "activo" | "suspendido" | "baja"; category: string | null; match: SearchMatch };

/** Members: by name, DNI, member number (also a previous one) or email. */
export async function searchMembers(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const one = q.words.join(" ");
  const previous = db.select({ memberId: memberNumbers.memberId }).from(memberNumbers).where(like(memberNumbers.number, one));
  const rows = await db
    .select({
      id: members.id,
      fullName: persons.fullName,
      firstNames: persons.firstNames,
      lastNames: persons.lastNames,
      memberNumber: members.memberNumber,
      status: members.status,
      category: members.category,
      byDni: q.dniLookups.length ? sql<boolean>`${inArray(personIdentities.dniLookup, q.dniLookups)}` : sql<boolean>`false`,
      byNumber: sql<boolean>`${like(members.memberNumber, one)}`,
      byPrevious: sql<boolean>`${inArray(members.id, previous)}`,
      byEmail: sql<boolean>`(${like(persons.email, one)} or ${like(admissions.notificationEmail, one)})`,
      byName: sql<boolean>`${allWords(personName, q.words)}`,
    })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(personIdentities, eq(personIdentities.personId, members.personId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .where(
      or(
        allWords(personName, q.words),
        anyIn(personIdentities.dniLookup, q.dniLookups),
        like(members.memberNumber, one),
        inArray(members.id, previous),
        like(persons.email, one),
        like(admissions.notificationEmail, one),
      ),
    )
    // The closest first: a whole DNI or number, then names, then everything else, alphabetically.
    .orderBy(
      sql`case when ${anyIn(personIdentities.dniLookup, q.dniLookups)} or ${exact(members.memberNumber, q.text)} then 0 when ${allWords(personName, q.words)} then 1 else 2 end`,
      asc(sql`coalesce(${persons.lastNames}, ${persons.fullName})`),
      asc(persons.fullName),
    )
    .limit(limit + 1)
    .offset(offset);
  return page(
    rows.map(
      (r): MemberHit => ({
        id: r.id,
        name: name(r),
        memberNumber: r.memberNumber,
        status: r.status,
        category: r.category,
        match: r.byDni ? "dni" : r.byNumber ? "numero" : r.byPrevious ? "numero_anterior" : r.byName ? null : r.byEmail ? "email" : null,
      }),
    ),
    limit,
  );
}

export type ProcedureHit = { memberId: string; name: string; memberNumber: string | null; credential: CredentialStatus; reviewDocumentId: string | null; linkage: "pendiente" | "verificada"; codeReceived: boolean };

/**
 * REPROCANN procedures of the members that match: the credential in force with its status (and
 * the document to review, if any) and the linkage. Same matching as members.
 */
export async function searchProcedures(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const found = await searchMembers(db, q, limit + offset + 1, 0);
  const ids = found.rows.map((m) => m.id);
  if (!ids.length) return { rows: [] as ProcedureHit[], more: false };
  const cases = await db
    .select({ id: reprocannCases.id, memberId: reprocannCases.memberId, linkage: reprocannCases.linkageStatus, code: reprocannCases.linkCodeEncrypted })
    .from(reprocannCases)
    .where(inArray(reprocannCases.memberId, ids));
  const docs = cases.length
    ? await db
        .select({ caseId: reprocannDocuments.caseId, id: reprocannDocuments.id, kind: reprocannDocuments.kind, reviewStatus: reprocannDocuments.reviewStatus, expiresOn: reprocannDocuments.expiresOn, createdAt: reprocannDocuments.createdAt })
        .from(reprocannDocuments)
        .where(and(inArray(reprocannDocuments.caseId, cases.map((c) => c.id)), inArray(reprocannDocuments.kind, [...CREDENTIAL_KINDS]), isNull(reprocannDocuments.replacedBy), isNull(reprocannDocuments.withdrawnAt)))
        .orderBy(desc(reprocannDocuments.createdAt))
    : [];
  const hits = found.rows.flatMap((m): ProcedureHit[] => {
    const c = cases.find((x) => x.memberId === m.id);
    if (!c) return [];
    const current = currentCredential(docs.filter((d) => d.caseId === c.id));
    return [{ memberId: m.id, name: m.name, memberNumber: m.memberNumber, credential: credentialStatus(current), reviewDocumentId: current?.reviewStatus === "pendiente" ? current.id : null, linkage: c.linkage, codeReceived: !!c.code }];
  });
  return page(hits.slice(offset), limit);
}

/** Pre-admissions: by name, email or reference. */
export async function searchPreAdmissions(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const one = q.words.join(" ");
  const rows = await db
    .select({ id: preAdmissions.id, reference: preAdmissions.reference, fullName: preAdmissions.fullName, status: preAdmissions.status, createdAt: preAdmissions.createdAt, byName: sql<boolean>`${allWords(sql`${preAdmissions.fullName}`, q.words)}`, byReference: sql<boolean>`${like(preAdmissions.reference, one)}` })
    .from(preAdmissions)
    .where(or(allWords(sql`${preAdmissions.fullName}`, q.words), like(preAdmissions.email, one), like(preAdmissions.reference, one)))
    .orderBy(desc(preAdmissions.createdAt))
    .limit(limit + 1)
    .offset(offset);
  return page(rows.map((r) => ({ id: r.id, reference: r.reference, name: r.fullName, status: r.status, createdAt: r.createdAt, match: (r.byReference ? "referencia" : r.byName ? null : "email") as SearchMatch })), limit);
}

/** Formal admissions: by name, DNI, email or reference. */
export async function searchAdmissions(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const one = q.words.join(" ");
  const admissionName = sql`concat_ws(' ', ${admissions.firstNames}, ${admissions.lastNames}, ${persons.fullName})`;
  const rows = await db
    .select({
      id: admissions.id,
      reference: admissions.reference,
      firstNames: admissions.firstNames,
      lastNames: admissions.lastNames,
      status: admissions.status,
      submittedAt: admissions.submittedAt,
      byDni: q.dniLookups.length ? sql<boolean>`${inArray(personIdentities.dniLookup, q.dniLookups)}` : sql<boolean>`false`,
      byName: sql<boolean>`${allWords(admissionName, q.words)}`,
      byReference: sql<boolean>`${like(admissions.reference, one)}`,
    })
    .from(admissions)
    .innerJoin(persons, eq(persons.id, admissions.personId))
    .leftJoin(personIdentities, eq(personIdentities.personId, admissions.personId))
    .where(or(allWords(admissionName, q.words), anyIn(personIdentities.dniLookup, q.dniLookups), like(admissions.reference, one), like(admissions.notificationEmail, one), like(persons.email, one)))
    .orderBy(desc(admissions.submittedAt))
    .limit(limit + 1)
    .offset(offset);
  return page(rows.map((r) => ({ id: r.id, reference: r.reference, name: `${r.lastNames}, ${r.firstNames}`, status: r.status, submittedAt: r.submittedAt, match: (r.byDni ? "dni" : r.byReference ? "referencia" : r.byName ? null : "email") as SearchMatch })), limit);
}

/** «Ya soy socio/a» requests: by name, DNI, email, reference or the member number they declared. */
export async function searchExistingRequests(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const one = q.words.join(" ");
  const requestName = sql`concat_ws(' ', ${existingMemberRequests.fullName}, ${existingMemberRequests.firstNames}, ${existingMemberRequests.lastNames})`;
  const rows = await db
    .select({
      id: existingMemberRequests.id,
      reference: existingMemberRequests.reference,
      fullName: existingMemberRequests.fullName,
      firstNames: existingMemberRequests.firstNames,
      lastNames: existingMemberRequests.lastNames,
      status: existingMemberRequests.status,
      createdAt: existingMemberRequests.createdAt,
      byDni: q.dniLookups.length ? sql<boolean>`${inArray(existingMemberRequests.dniLookup, q.dniLookups)}` : sql<boolean>`false`,
      byName: sql<boolean>`${allWords(requestName, q.words)}`,
      byReference: sql<boolean>`${like(existingMemberRequests.reference, one)}`,
      byNumber: sql<boolean>`${like(existingMemberRequests.declaredMemberNumber, one)}`,
    })
    .from(existingMemberRequests)
    .where(or(allWords(requestName, q.words), anyIn(existingMemberRequests.dniLookup, q.dniLookups), like(existingMemberRequests.email, one), like(existingMemberRequests.reference, one), like(existingMemberRequests.declaredMemberNumber, one)))
    .orderBy(desc(existingMemberRequests.createdAt))
    .limit(limit + 1)
    .offset(offset);
  return page(rows.map((r) => ({ id: r.id, reference: r.reference, name: name(r), status: r.status, createdAt: r.createdAt, match: (r.byDni ? "dni" : r.byReference ? "referencia" : r.byNumber ? "numero" : r.byName ? null : "email") as SearchMatch })), limit);
}

/** Products: by name or variety (code or name). */
export async function searchProducts(db: Database, q: SearchQuery, limit: number, offset = 0) {
  const one = q.words.join(" ");
  const varietyText = sql`concat_ws(' ', ${varieties.code}, ${varieties.name})`;
  const rows = await db
    .select({ id: products.id, name: products.name, type: products.type, status: products.status, varietyCode: varieties.code, varietyName: varieties.name, byName: sql<boolean>`${allWords(sql`${products.name}`, q.words)}` })
    .from(products)
    .leftJoin(varieties, eq(varieties.id, products.varietyId))
    .where(or(allWords(sql`${products.name}`, q.words), like(varietyText, one)))
    .orderBy(asc(products.name))
    .limit(limit + 1)
    .offset(offset);
  return page(rows.map((r) => ({ ...r, match: (r.byName ? null : "variedad") as SearchMatch })), limit);
}
