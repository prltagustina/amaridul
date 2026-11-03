// REPROCANN documents: sent by a member or loaded by the association. The server decides by the
// file's content and size, each member only reaches their own files, nothing is verified by
// uploading, a declared expiry is not treated as verified, the reason for an observation (for the
// member) stays apart from the internal note, and the association's loads check identity against
// the register and never duplicate or overwrite documents.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { admissions, auditLogs, existingMemberRequests, members, persons, preAdmissions, reprocannDocumentFiles, reprocannDocuments } from "@/server/db/schema";
import { dniLookup } from "@/server/crypto/dni";
import { addDocument, documentInput, ReprocannError, reviewDocument, reviewInput } from "@/server/reprocann";
import {
  addAdminDocument,
  adminUploadInput,
  countDocumentsToReview,
  detectFileType,
  discardUnregisteredFiles,
  documentsToReview,
  isMemberFileKey,
  MAX_FILE_BYTES,
  MAX_UPLOADS_PER_DAY,
  memberFolder,
  memberUploadInput,
  openDocumentFile,
  previewImport,
  registerMemberUpload,
  sha256Hex,
} from "@/server/reprocann-files";
import { memberReprocann } from "@/server/member-portal";
import { listAuditRows } from "@/server/audit/view";
import { credentialStatus } from "@/lib/credential-validity";
import { LocalObjectStorage } from "@/server/storage/object-storage";
import { documentStorage, uploadMode } from "@/server/storage";
import { PrivateBlobStorage } from "@/server/storage/private-blob-storage";
import { makeContext } from "./helpers/context";

const PDF = new TextEncoder().encode("%PDF-1.7\n% credencial ficticia\n%%EOF\n");
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
/** A distinct fictitious JPEG each time (two pages are two different files). */
const jpg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...randomBytes(24)]);
const pdf = () => new TextEncoder().encode(`%PDF-1.7\n% hoja ficticia ${randomUUID()}\n%%EOF\n`);

let ctx: Awaited<ReturnType<typeof makeContext>>;
let storage: LocalObjectStorage;
let adminId: string;
let n = 0;

beforeAll(async () => {
  ctx = await makeContext();
  storage = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-reprocann-")));
  adminId = (await ctx.createAdmin("admin.reprocann@example.com")).id;
});

/** A member with their own account and DNI, as the portal sees them. */
async function memberWithAccount(status: "activo" | "suspendido" = "activo") {
  n += 1;
  const dni = `9905${String(n).padStart(4, "0")}`;
  const { userId, personId } = await ctx.createMember({ n: 500 + n, dni, password: "frase ficticia larga" });
  const [m] = await ctx.db.insert(members).values({ personId, userId, status, origin: "legacy", memberNumber: `R-${String(n).padStart(3, "0")}` }).returning({ id: members.id });
  return { memberId: m.id, userId, dni };
}

/** A file already in the member's folder (the browser put it there). */
async function stored(memberId: string, bytes: Uint8Array) {
  const key = memberFolder(memberId) + randomUUID();
  await storage.put(key, bytes, "application/pdf");
  return key;
}
const sent = async (who: { memberId: string }, bytes: Uint8Array, expiresOn = "2027-06-30") => memberUploadInput.parse({ key: await stored(who.memberId, bytes), expiresOn });
const filesOf = (documentId: string) => ctx.db.select().from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, documentId)).orderBy(reprocannDocumentFiles.page);

describe("el archivo se decide por su contenido", () => {
  it("recognizes PDF, PNG and JPG by their first bytes, and nothing else", () => {
    expect(detectFileType(PDF)).toBe("application/pdf");
    expect(detectFileType(PNG)).toBe("image/png");
    expect(detectFileType(jpg())).toBe("image/jpeg");
    for (const other of [HTML, new TextEncoder().encode("MZ\x90\x00"), new Uint8Array(), new TextEncoder().encode("%PD"), Uint8Array.from([0xff, 0xd8])]) expect(detectFileType(other)).toBeNull();
  });

  it("each member's files live in their own folder, under a random name", () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(isMemberFileKey(`${memberFolder(a)}${randomUUID()}`, a)).toBe(true);
    expect(isMemberFileKey(`${memberFolder(b)}${randomUUID()}`, a)).toBe(false);
    expect(isMemberFileKey(`${memberFolder(a)}../${b}/${randomUUID()}`, a)).toBe(false);
    expect(isMemberFileKey(`${memberFolder(a)}credencial-juan-perez.pdf`, a)).toBe(false);
  });
});

describe("carga del socio", () => {
  it("records the credential pending review, with the checked type, size and fingerprint, and logs it without the file name", async () => {
    const a = await memberWithAccount();
    const input = await sent(a, PDF);
    const r = await registerMemberUpload(ctx.db, storage, a, input);
    if (!r.ok) throw new Error(r.error);
    const [doc] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, r.documentId));
    expect(doc).toMatchObject({ kind: "credencial", reviewStatus: "pendiente", source: "aportado_por_socio", createdBy: a.userId, verifiedOn: null, reviewedBy: null, expiresOn: "2027-06-30" });
    expect(await filesOf(r.documentId)).toEqual([expect.objectContaining({ page: 1, fileKey: input.key, contentType: "application/pdf", size: PDF.byteLength, sha256: sha256Hex(PDF), uploadedBy: a.userId })]);
    const [log] = await ctx.db.select().from(auditLogs).where(and(eq(auditLogs.action, "reprocann.document_uploaded"), eq(auditLogs.actorUserId, a.userId)));
    expect(log.metadata).toMatchObject({ document: r.documentId, kind: "credencial", pages: 1, contentType: "application/pdf" });
    expect(JSON.stringify(log.metadata)).not.toContain(input.key);
    expect((await documentsToReview(ctx.db)).map((d) => d.id)).toContain(r.documentId);
    expect((await listAuditRows(ctx.db, 30)).find((x) => x.action === "Documento REPROCANN enviado por el socio")).toMatchObject({ actor: "El socio, desde su cuenta", area: "REPROCANN" });
  });

  it("a file whose content is not a PDF, JPG or PNG is removed, whatever it was declared as; so is one over 10 MB or empty", async () => {
    const a = await memberWithAccount();
    const fake = await sent(a, HTML);
    expect(await registerMemberUpload(ctx.db, storage, a, fake)).toEqual({ ok: false, error: "El archivo tiene que ser un PDF, JPG o PNG." });
    expect(await storage.get(fake.key)).toBeNull();
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(PDF);
    const tooBig = await sent(a, big);
    expect(await registerMemberUpload(ctx.db, storage, a, tooBig)).toEqual({ ok: false, error: "El archivo pesa más de 10 MB." });
    expect(await storage.get(tooBig.key)).toBeNull();
    const exact = new Uint8Array(MAX_FILE_BYTES);
    exact.set(PDF);
    expect((await registerMemberUpload(ctx.db, storage, a, await sent(a, exact))).ok).toBe(true);
    expect(await registerMemberUpload(ctx.db, storage, a, await sent(a, new Uint8Array()))).toEqual({ ok: false, error: "El archivo está vacío." });
  });

  it("a member cannot claim another member's file, and a suspended member cannot send", async () => {
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const ofA = await sent(a, PDF);
    expect(await registerMemberUpload(ctx.db, storage, b, ofA)).toEqual({ ok: false, error: "No encontramos el archivo. Volvé a cargarlo." });
    expect(await storage.get(ofA.key)).not.toBeNull();
    expect((await registerMemberUpload(ctx.db, storage, { memberId: a.memberId, userId: b.userId }, ofA)).ok).toBe(false);
    const s = await memberWithAccount("suspendido");
    expect((await registerMemberUpload(ctx.db, storage, s, await sent(s, PDF))).ok).toBe(false);
  });

  it("sending the same upload twice records it once", async () => {
    const a = await memberWithAccount();
    const input = await sent(a, jpg());
    const first = await registerMemberUpload(ctx.db, storage, a, input);
    expect(await registerMemberUpload(ctx.db, storage, a, input)).toEqual(first);
    expect(await ctx.db.select().from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.fileKey, input.key))).toHaveLength(1);
  });

  it("asks only for the file and an optional, sensible expiry; members send credentials only", () => {
    const key = `${memberFolder(randomUUID())}${randomUUID()}`;
    expect(memberUploadInput.safeParse({ key, expiresOn: "" }).success).toBe(true);
    expect(memberUploadInput.safeParse({ key, expiresOn: "2205-01-01" }).success).toBe(false);
    expect(memberUploadInput.safeParse({ key, expiresOn: "1999-01-01" }).success).toBe(false);
    expect(memberUploadInput.parse({ key, expiresOn: "", kind: "constancia_vinculacion" })).not.toHaveProperty("kind");
  });

  it("stops a flood: at most ten files a day per account (a proposed limit)", async () => {
    const a = await memberWithAccount();
    for (let i = 0; i < MAX_UPLOADS_PER_DAY; i++) expect((await registerMemberUpload(ctx.db, storage, a, await sent(a, jpg()))).ok).toBe(true);
    const extra = await sent(a, jpg());
    expect((await registerMemberUpload(ctx.db, storage, a, extra)).ok).toBe(false);
    expect(await storage.get(extra.key)).toBeNull();
  });
});

describe("observación, reemplazo y fecha declarada", () => {
  it("the member reads the reason, never the internal note; a new file replaces the observed one, starts pending, and the old version cannot be reviewed by mistake", async () => {
    const a = await memberWithAccount();
    const first = await registerMemberUpload(ctx.db, storage, a, await sent(a, PDF));
    if (!first.ok) throw new Error(first.error);
    expect(reviewInput.safeParse({ reviewStatus: "observada", verifiedOn: "" }).success).toBe(false);
    await reviewDocument(ctx.db, ctx.rings.field, adminId, first.documentId, reviewInput.parse({ reviewStatus: "observada", verifiedOn: "", memberMessage: "La foto está cortada: falta el vencimiento.", notes: "Nota del equipo, reservada" }));
    const [raw] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, first.documentId));
    expect(JSON.stringify(raw)).not.toMatch(/foto está cortada|reservada/);

    const observed = await memberReprocann(ctx.db, ctx.rings.field, a.memberId);
    expect(observed?.status.key).toBe("observed");
    expect(observed?.credential).toMatchObject({ review: "observada", memberMessage: "La foto está cortada: falta el vencimiento." });
    expect(JSON.stringify(observed)).not.toContain("reservada");

    const second = await registerMemberUpload(ctx.db, storage, a, await sent(a, PNG));
    if (!second.ok) throw new Error(second.error);
    const [old] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, first.documentId));
    expect(old).toMatchObject({ replacedBy: second.documentId, reviewStatus: "observada" });
    const now = await memberReprocann(ctx.db, ctx.rings.field, a.memberId);
    expect(now?.credential).toMatchObject({ id: second.documentId, review: "pendiente", memberMessage: null });
    expect(now?.status.key).toBe("pending");
    expect(now?.documents.find((d) => d.id === first.documentId)).toMatchObject({ replaced: true });

    // An admin with the old version still on screen cannot approve it: the current one is the new file.
    await expect(reviewDocument(ctx.db, ctx.rings.field, adminId, first.documentId, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-03" }))).rejects.toBeInstanceOf(ReprocannError);
    const [stillPending] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, second.documentId));
    expect(stillPending.reviewStatus).toBe("pendiente");
    const queue = (await documentsToReview(ctx.db)).map((d) => d.id);
    expect(queue).toContain(second.documentId);
    expect(queue).not.toContain(first.documentId);
  });

  it("replacing without retyping the expiry keeps the one on record while it is ahead, never an expired one", async () => {
    const a = await memberWithAccount();
    const first = await registerMemberUpload(ctx.db, storage, a, await sent(a, pdf(), "2027-06-30"));
    if (!first.ok) throw new Error(first.error);
    const second = await registerMemberUpload(ctx.db, storage, a, memberUploadInput.parse({ key: await stored(a.memberId, pdf()), expiresOn: "" }));
    if (!second.ok) throw new Error(second.error);
    const [kept] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, second.documentId));
    expect(kept.expiresOn).toBe("2027-06-30");
    const b = await memberWithAccount();
    await addDocument(ctx.db, ctx.rings.field, adminId, b.memberId, documentInput.parse({ kind: "credencial", permitIdentifier: "", issuedOn: "", expiresOn: "2026-01-10", source: "en_poder_de_la_asociacion", notes: "" }));
    const renewal = await registerMemberUpload(ctx.db, storage, b, memberUploadInput.parse({ key: await stored(b.memberId, pdf()), expiresOn: "" }));
    if (!renewal.ok) throw new Error(renewal.error);
    const [fresh] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, renewal.documentId));
    expect(fresh.expiresOn).toBeNull();
  });

  it("a declared expiry is shown as unverified until the document is verified, and an expired one as expired", () => {
    expect(credentialStatus({ reviewStatus: "pendiente", expiresOn: "2027-06-30" }, "2026-11-03")).toMatchObject({ key: "pending", label: "En revisión", expiry: { date: "2027-06-30", verified: false } });
    expect(credentialStatus({ reviewStatus: "verificada", expiresOn: "2027-06-30" }, "2026-11-03")).toMatchObject({ key: "verified", tone: "success", expiry: { verified: true } });
    expect(credentialStatus({ reviewStatus: "verificada", expiresOn: "2026-11-20" }, "2026-11-03")).toMatchObject({ key: "expiring" });
    expect(credentialStatus({ reviewStatus: "pendiente", expiresOn: "2026-09-01" }, "2026-11-03")).toMatchObject({ key: "expired", tone: "error" });
    expect(credentialStatus(null)).toMatchObject({ key: "none" });
  });

  it("verifying hides the reason; the internal note changes only when sent; the admin can correct the declared expiry", async () => {
    const a = await memberWithAccount();
    const r = await registerMemberUpload(ctx.db, storage, a, await sent(a, PDF, "2030-01-01"));
    if (!r.ok) throw new Error(r.error);
    await reviewDocument(ctx.db, ctx.rings.field, adminId, r.documentId, reviewInput.parse({ reviewStatus: "observada", verifiedOn: "", memberMessage: "Falta el dorso.", notes: "Primera nota" }));
    await reviewDocument(ctx.db, ctx.rings.field, adminId, r.documentId, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-03", expiresOn: "2027-03-15" }));
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, r.documentId));
    expect(row).toMatchObject({ reviewStatus: "verificada", verifiedOn: "2026-11-03", memberMessageEncrypted: null, expiresOn: "2027-03-15" });
    expect(row.notesEncrypted).not.toBeNull();
    expect((await memberReprocann(ctx.db, ctx.rings.field, a.memberId))?.credential).toMatchObject({ review: "verificada", memberMessage: null });
    const logs = await ctx.db.select().from(auditLogs).where(and(eq(auditLogs.action, "reprocann.document_reviewed"), eq(auditLogs.entityId, row.caseId)));
    expect(logs.map((l) => l.metadata)).toContainEqual(expect.objectContaining({ expiresOn_before: "2030-01-01", expiresOn_after: "2027-03-15" }));
    expect(await countDocumentsToReview(ctx.db)).toBe((await documentsToReview(ctx.db)).length);
  });
});

describe("carga desde administración", () => {
  const load = (memberId: string, raw: Record<string, unknown>) => addAdminDocument(ctx.db, storage, ctx.rings, adminId, memberId, adminUploadInput.parse({ target: "nuevo", kind: "credencial", expiresOn: "", ...raw }));

  it("a document of two pages is one document: neither page replaces the other, the member sees both, and it stays pending", async () => {
    const a = await memberWithAccount();
    const [p1, p2] = [jpg(), jpg()];
    const r = await load(a.memberId, { dni: a.dni, pages: [await stored(a.memberId, p1), await stored(a.memberId, p2)] });
    if (!r.ok) throw new Error(r.error);
    expect(r.pages).toBe(2);
    const pages = await filesOf(r.documentId);
    expect(pages.map((f) => [f.page, f.sha256, f.uploadedBy])).toEqual([
      [1, sha256Hex(p1), adminId],
      [2, sha256Hex(p2), adminId],
    ]);
    const [doc] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, r.documentId));
    expect(doc).toMatchObject({ reviewStatus: "pendiente", source: "en_poder_de_la_asociacion", createdBy: adminId, verifiedOn: null });
    const portal = await memberReprocann(ctx.db, ctx.rings.field, a.memberId);
    expect(portal?.credential).toMatchObject({ fromMember: false, files: [{ page: 1 }, { page: 2 }] });
    // The member opens each page from their account; nobody has to upload it again.
    for (const f of pages) expect(await openDocumentFile(ctx.db, storage, f.id, { role: "member", userId: a.userId, memberId: a.memberId })).toMatchObject({ contentType: "image/jpeg", filename: `reprocann-credencial-hoja-${f.page}.jpg` });
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_files_added"));
    expect(log).toMatchObject({ actorUserId: adminId, metadata: expect.objectContaining({ pages: 2, identityChecked: true, attached: false }) });
    expect(JSON.stringify(log.metadata)).not.toContain(a.dni);
  });

  it("checks identity with the DNI on the register, not with the file name; a wrong DNI loads nothing", async () => {
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const key = await stored(a.memberId, pdf());
    const wrong = await load(a.memberId, { dni: b.dni, pages: [key] });
    expect(wrong).toMatchObject({ ok: false, error: expect.stringContaining("no coincide") });
    expect(await storage.get(key)).toBeNull();
    expect((await load(a.memberId, { dni: "12", pages: [await stored(a.memberId, pdf())] })).ok).toBe(false);
    expect((await load(a.memberId, { dni: a.dni.replace(/^(\d{2})(\d{3})/, "$1.$2."), pages: [await stored(a.memberId, pdf())] })).ok).toBe(true);
    // A member without DNI on the register cannot get documentation by name.
    const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Sin DNI", isFixture: true }).returning({ id: persons.id });
    const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy" }).returning({ id: members.id });
    expect(await load(m.id, { dni: a.dni, pages: [await stored(m.id, pdf())] })).toMatchObject({ ok: false, error: expect.stringContaining("no tiene DNI") });
  });

  it("completes a record kept without its file, keeping its date and its pending review", async () => {
    const a = await memberWithAccount();
    const recordId = await addDocument(ctx.db, ctx.rings.field, adminId, a.memberId, documentInput.parse({ kind: "credencial", permitIdentifier: "", issuedOn: "", expiresOn: "2028-12-17", source: "en_poder_de_la_asociacion", notes: "" }));
    const r = await load(a.memberId, { target: recordId, dni: a.dni, pages: [await stored(a.memberId, pdf())] });
    if (!r.ok) throw new Error(r.error);
    expect(r.documentId).toBe(recordId);
    const [doc] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, recordId));
    expect(doc).toMatchObject({ expiresOn: "2028-12-17", reviewStatus: "pendiente" });
    // It already has its file now: a second load cannot overwrite it.
    expect(await load(a.memberId, { target: recordId, dni: a.dni, pages: [await stored(a.memberId, pdf())] })).toMatchObject({ ok: false, error: expect.stringContaining("ya tiene archivos") });
  });

  it("never duplicates: the same file again, for the same or another member, or twice in one load, is stopped and shown where it is", async () => {
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const bytes = pdf();
    const first = await load(a.memberId, { dni: a.dni, pages: [await stored(a.memberId, bytes)] });
    if (!first.ok) throw new Error(first.error);
    expect(await load(a.memberId, { dni: a.dni, pages: [await stored(a.memberId, bytes)] })).toMatchObject({ ok: false, duplicates: [{ page: 1, documentId: first.documentId, sameMember: true }] });
    expect(await load(b.memberId, { dni: b.dni, pages: [await stored(b.memberId, bytes)] })).toMatchObject({ ok: false, error: expect.stringContaining("otro socio"), duplicates: [{ sameMember: false, memberId: a.memberId }] });
    const twice = pdf();
    expect(await load(b.memberId, { dni: b.dni, pages: [await stored(b.memberId, twice), await stored(b.memberId, twice)] })).toMatchObject({ ok: false, error: expect.stringContaining("mismo archivo dos veces") });
    expect(await load(b.memberId, { dni: b.dni, pages: [await stored(b.memberId, pdf())], expectedSha256: [sha256Hex(pdf())] })).toMatchObject({ ok: false, error: expect.stringContaining("no son los mismos") });
  });
});

describe("una carga que falla a mitad de camino", () => {
  it("removes the pages already sent that no document uses, never a recorded file or another member's", async () => {
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const ok = await addAdminDocument(ctx.db, storage, ctx.rings, adminId, a.memberId, adminUploadInput.parse({ target: "nuevo", kind: "credencial", expiresOn: "", dni: a.dni, pages: [await stored(a.memberId, pdf())] }));
    if (!ok.ok) throw new Error(ok.error);
    const [recorded] = await filesOf(ok.documentId);
    // Page 1 arrived, page 2 did not: page 1 is left over.
    const leftover = await stored(a.memberId, jpg());
    const othersFile = await stored(b.memberId, jpg());

    expect(await discardUnregisteredFiles(ctx.db, storage, a.memberId, [leftover, recorded.fileKey, othersFile, "../../etc/passwd"])).toBe(1);
    expect(await storage.get(leftover)).toBeNull();
    expect(await storage.get(recorded.fileKey)).not.toBeNull();
    expect(await storage.get(othersFile)).not.toBeNull();
    // The document that was recorded is still complete.
    expect(await filesOf(ok.documentId)).toHaveLength(1);
  });
});

describe("previsualización de una importación", () => {
  it("matches by DNI against the register, groups pages, flags existing, duplicated and ambiguous cases, and stores nothing", async () => {
    const fresh = await memberWithAccount();
    const withRecord = await memberWithAccount();
    const withFile = await memberWithAccount();
    const recordId = await addDocument(ctx.db, ctx.rings.field, adminId, withRecord.memberId, documentInput.parse({ kind: "credencial", permitIdentifier: "", issuedOn: "", expiresOn: "2028-01-10", source: "en_poder_de_la_asociacion", notes: "" }));
    const loaded = pdf();
    const ok = await addAdminDocument(ctx.db, storage, ctx.rings, adminId, withFile.memberId, adminUploadInput.parse({ target: "nuevo", kind: "credencial", expiresOn: "", dni: withFile.dni, pages: [await stored(withFile.memberId, loaded)] }));
    if (!ok.ok) throw new Error(ok.error);
    const row = (dni: string, page: number, bytes = pdf(), type = "application/pdf") => ({ dni, page, sha256: sha256Hex(bytes), size: bytes.byteLength, type });

    const counts = async () => [(await ctx.db.select({ n: count() }).from(reprocannDocuments))[0].n, (await ctx.db.select({ n: count() }).from(reprocannDocumentFiles))[0].n];
    const before = await counts();
    const groups = await previewImport(ctx.db, ctx.rings, [
      row(fresh.dni, 1, jpg(), "image/jpeg"),
      row(fresh.dni, 2, jpg(), "image/jpeg"),
      row(withRecord.dni, 1),
      row("99999999", 1),
      row(withRecord.dni.slice(0, 3), 1),
      row(withFile.dni, 1, loaded),
    ]);
    expect(await counts()).toEqual(before);

    const byMember = (id: string) => groups.filter((g) => g.member?.id === id);
    expect(byMember(fresh.memberId)).toEqual([expect.objectContaining({ status: "confirmado", rows: [0, 1], target: { kind: "nuevo" } })]);
    expect(byMember(withRecord.memberId)).toEqual([expect.objectContaining({ status: "confirmado", target: { kind: "adjuntar", documentId: recordId, expiresOn: "2028-01-10" } })]);
    expect(byMember(withFile.memberId)).toEqual([expect.objectContaining({ status: "duplicado" })]);
    expect(groups.filter((g) => g.status === "ambiguo").map((g) => g.reason)).toEqual(expect.arrayContaining([expect.stringContaining("Ningún socio del padrón tiene ese DNI."), "Falta el DNI o no es válido."]));
    // Pages must be 1, 2…: a lone page 3 is a case to review.
    const [gap] = await previewImport(ctx.db, ctx.rings, [row(fresh.dni, 3)]);
    expect(gap.status).toBe("ambiguo");
    // The DNI is only shown masked.
    expect(JSON.stringify(groups)).not.toContain(fresh.dni);
  });

  it("says why a DNI has no member (a request in progress, or nobody) and stops one file going to two people", async () => {
    // Someone whose admission is with the Comisión: registered with their DNI, not a member yet.
    n += 1;
    const k = n;
    const applicantDni = `9905${String(k).padStart(4, "0")}`;
    const { personId } = await ctx.createMember({ n: 500 + k, dni: applicantDni, password: "frase ficticia larga" });
    const preId = randomUUID();
    const at = new Date();
    await ctx.db.insert(preAdmissions).values({ id: preId, reference: `PRE-T-${k}`, fullName: "Persona Ficticia", email: `pre${k}@example.com`, province: "Córdoba", locality: "Córdoba", wantsToParticipate: false, motivationEncrypted: "x", privacyAcceptedAt: at });
    await ctx.db.insert(admissions).values({
      id: randomUUID(), reference: `ADM-T-${k}`, preAdmissionId: preId, personId, status: "comision", firstNames: "Persona", lastNames: "Ficticia", address: "Calle Ficticia 1", postalCode: "5000",
      category: "adherente", healthEncrypted: "x", statuteVersion: "v1", obligationsAcceptedAt: at, statuteAcceptedAt: at, feeAcknowledgedAt: at, truthfulnessDeclaredAt: at, changesCommitmentAt: at, privacyAcceptedAt: at, submittedAt: at,
    });
    // Someone who said «Ya soy socio/a» and is waiting to be verified.
    const claimantDni = "99059901";
    const lookup = dniLookup(ctx.rings.lookup, claimantDni);
    await ctx.db.insert(existingMemberRequests).values({ id: randomUUID(), reference: `SOC-T-${k}`, fullName: "Otra Persona Ficticia", email: `soc${k}@example.com`, dniLookup: lookup.value, dniLookupKeyVersion: lookup.version });
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const shared = pdf();
    const row = (dni: string, bytes = pdf()) => ({ dni, page: 1, sha256: sha256Hex(bytes), size: bytes.byteLength, type: "application/pdf" });

    const groups = await previewImport(ctx.db, ctx.rings, [row(applicantDni), row(claimantDni), row("99059902"), row(a.dni, shared), row(b.dni, shared)]);
    expect(groups.map((g) => [g.status, g.reason, g.member?.id ?? null])).toEqual([
      ["ambiguo", expect.stringContaining(`solicitud de alta ADM-T-${k} en curso`), null],
      ["ambiguo", expect.stringContaining(`«Ya soy socio/a» SOC-T-${k} sin resolver`), null],
      ["ambiguo", expect.stringContaining("Ningún socio del padrón tiene ese DNI"), null],
      ["duplicado", expect.stringContaining("otra fila con otro DNI"), a.memberId],
      ["duplicado", expect.stringContaining("otra fila con otro DNI"), b.memberId],
    ]);
  });

  it("a member who already has a credential with its file is a case to review, not an import", async () => {
    const a = await memberWithAccount();
    const ok = await registerMemberUpload(ctx.db, storage, a, await sent(a, pdf()));
    if (!ok.ok) throw new Error(ok.error);
    const fresh = pdf();
    const [g] = await previewImport(ctx.db, ctx.rings, [{ dni: a.dni, page: 1, sha256: sha256Hex(fresh), size: fresh.byteLength, type: "application/pdf" }]);
    expect(g).toMatchObject({ status: "existente", member: { id: a.memberId } });
  });
});

describe("quién puede abrir un archivo", () => {
  it("the member it belongs to and an admin looking at that member; nobody else, without saying whether it exists", async () => {
    const a = await memberWithAccount();
    const b = await memberWithAccount();
    const r = await registerMemberUpload(ctx.db, storage, a, await sent(a, PDF));
    if (!r.ok) throw new Error(r.error);
    const [file] = await filesOf(r.documentId);
    const own = await openDocumentFile(ctx.db, storage, file.id, { role: "member", userId: a.userId, memberId: a.memberId });
    expect(own).toMatchObject({ contentType: "application/pdf", filename: "reprocann-credencial-hoja-1.pdf" });
    expect(Buffer.from(own!.bytes).equals(Buffer.from(PDF))).toBe(true);
    expect(await openDocumentFile(ctx.db, storage, file.id, { role: "member", userId: b.userId, memberId: b.memberId })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, file.id, { role: "admin", userId: adminId, memberId: a.memberId })).not.toBeNull();
    expect(await openDocumentFile(ctx.db, storage, file.id, { role: "admin", userId: adminId, memberId: b.memberId })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, r.documentId, { role: "member", userId: a.userId, memberId: a.memberId })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, "../../etc/passwd", { role: "member", userId: a.userId, memberId: a.memberId })).toBeNull();
    const views = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_viewed"));
    expect(views.map((v) => v.metadata)).toEqual(expect.arrayContaining([{ document: r.documentId, page: 1, by: "member" }, { document: r.documentId, page: 1, by: "admin" }]));
  });

  it("a stored file that no longer matches what was checked is not served", async () => {
    const a = await memberWithAccount();
    const input = await sent(a, PDF);
    const r = await registerMemberUpload(ctx.db, storage, a, input);
    if (!r.ok) throw new Error(r.error);
    const [file] = await filesOf(r.documentId);
    await storage.put(input.key, pdf(), "application/pdf");
    expect(await openDocumentFile(ctx.db, storage, file.id, { role: "member", userId: a.userId, memberId: a.memberId })).toBeNull();
  });
});

describe("almacenamiento privado, sin alternativa pública", () => {
  it("a deployment without a private store neither stores nor accepts files", () => {
    expect(documentStorage({ VERCEL: "1" })).toBeNull();
    expect(uploadMode({ VERCEL: "1" })).toBe("unavailable");
    expect(documentStorage({ VERCEL: "1", BLOB_READ_WRITE_TOKEN: "x" })).toBeInstanceOf(PrivateBlobStorage);
    expect(uploadMode({ VERCEL: "1", BLOB_READ_WRITE_TOKEN: "x" })).toBe("unavailable");
    expect(uploadMode({ VERCEL: "1", BLOB_READ_WRITE_TOKEN: "x", REPROCANN_UPLOADS: "on" })).toBe("blob");
    expect(documentStorage({ APP_ENV: "production" })).toBeNull();
    expect(uploadMode({ APP_ENV: "production" })).toBe("unavailable");
    expect(uploadMode({ APP_ENV: "local" })).toBe("local");
    expect(documentStorage({ APP_ENV: "local", STORAGE_DIR: ".data/storage" })).toBeInstanceOf(LocalObjectStorage);
  });
});

it("fixture people only", async () => {
  expect((await ctx.db.select().from(persons).where(eq(persons.isFixture, false))).length).toBe(0);
});
