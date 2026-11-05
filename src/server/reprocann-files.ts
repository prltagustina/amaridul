// REPROCANN documents and their files, sent by a member from their account or loaded by the
// association from the member's page. Every file goes to private storage and is checked on the
// server (its real type, by its first bytes, its size and its SHA-256), and is served only to the
// member it belongs to and to the association's admins. Sending or loading a document never
// verifies it, never enables anything and is not a condition to be a member. Nothing is deleted
// automatically: how long documents are kept is not defined yet.
import { createHash, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { admissions, auditLogs, existingMemberRequests, members, personIdentities, persons, reprocannCases, reprocannDocumentFiles, reprocannDocuments } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookupCandidates, InvalidDniError, maskDni, normalizeDni } from "@/server/crypto/dni";
import type { Keyrings } from "@/server/identity/person-identity";
import { DOCUMENT_KIND, ensureCase, labelIn } from "@/server/reprocann";
import type { ObjectStorage } from "@/server/storage/object-storage";
import { todayInArgentina } from "@/lib/credential-validity";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Proposed, not agreed: stops a flood from one account. See docs/seguimiento-etapa-1.md. */
export const MAX_UPLOADS_PER_DAY = 10;
export const FILE_EXTENSION = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as const;
export type FileType = keyof typeof FILE_EXTENSION;
export const FILE_TYPES = Object.keys(FILE_EXTENSION) as FileType[];

/** The real type of a file, read from its first bytes, whatever its name or declared type say. */
export function detectFileType(bytes: Uint8Array): FileType | null {
  const startsWith = (signature: number[]) => bytes.length >= signature.length && signature.every((b, i) => bytes[i] === b);
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

export const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Each member's files live in their own folder, under a random name: no personal data in it. */
export const memberFolder = (memberId: string) => `reprocann/${memberId}/`;
export const isMemberFileKey = (key: string, memberId: string) => UUID.test(memberId) && key.startsWith(memberFolder(memberId)) && UUID.test(key.slice(memberFolder(memberId).length));
/** The member a file key belongs to, if the key has the expected shape. */
export const memberOfFileKey = (key: string) => {
  const m = /^reprocann\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/.exec(key);
  return m && UUID.test(m[1]) && UUID.test(m[2]) ? m[1] : null;
};

/**
 * What a member can send from their account: their REPROCANN credential. Other documents
 * (linkage proof, other receipts) are a pending decision, so members cannot send them yet.
 */
export const MEMBER_DOCUMENT_KINDS = [{ value: "credencial", label: "Credencial REPROCANN" }] as const;
export const documentKindLabel = (kind: string) => (kind === "credencial" ? "Credencial REPROCANN" : labelIn(DOCUMENT_KIND, kind));

const latestExpiry = () => `${Number(todayInArgentina().slice(0, 4)) + 5}${todayInArgentina().slice(4)}`;
const expiryDate = z
  .union([z.iso.date({ error: "Revisá la fecha de vencimiento." }), z.literal("")])
  .transform((v) => v || null)
  .refine((v) => !v || (v >= "2017-01-01" && v <= latestExpiry()), { message: "Revisá la fecha de vencimiento." });

/** Only what the document needs: the file and, if it has one, the expiry date the member reads on it. */
export const memberUploadInput = z.object({ key: z.string().max(120), expiresOn: expiryDate });
export type MemberUploadInput = z.infer<typeof memberUploadInput>;

export type UploadResult = { ok: true; documentId: string } | { ok: false; error: string };

const NOT_FOUND = "No encontramos el archivo. Volvé a cargarlo.";

type CheckedFile = { key: string; bytes: Uint8Array; type: FileType; sha256: string };

/** Reads a stored file and checks it. Anything that is not a PDF, JPG or PNG of up to 10 MB is removed. */
async function checkStoredFile(storage: ObjectStorage, key: string): Promise<CheckedFile | { error: string }> {
  const bytes = await storage.get(key);
  if (!bytes) return { error: NOT_FOUND };
  const reject = async (error: string) => {
    await storage.delete(key);
    return { error };
  };
  if (bytes.byteLength === 0) return reject("El archivo está vacío.");
  if (bytes.byteLength > MAX_FILE_BYTES) return reject("El archivo pesa más de 10 MB.");
  const type = detectFileType(bytes);
  if (!type) return reject("El archivo tiene que ser un PDF, JPG o PNG.");
  return { key, bytes, type, sha256: sha256Hex(bytes) };
}

async function insertPages(t: Database, documentId: string, files: CheckedFile[], uploadedBy: string, now: Date, firstPage = 1) {
  await t.insert(reprocannDocumentFiles).values(
    files.map((f, i) => ({ id: randomUUID(), documentId, page: firstPage + i, fileKey: f.key, contentType: f.type, size: f.bytes.byteLength, sha256: f.sha256, uploadedBy, uploadedAt: now })),
  );
}

/**
 * Records a credential the member already put in their folder of the private storage. The file is
 * checked here, on the server; if it fails, it is removed and nothing is recorded. The document
 * starts pending review, with the expiry the member declared (not verified until reviewed). An
 * earlier credential the member sent that is still unverified (pending or observed) is marked as
 * replaced by this one; it is kept, and so is its review.
 */
export async function registerMemberUpload(db: Database, storage: ObjectStorage, who: { memberId: string; userId: string }, input: MemberUploadInput, now = new Date()): Promise<UploadResult> {
  if (!isMemberFileKey(input.key, who.memberId)) return { ok: false, error: NOT_FOUND };
  const [member] = await db.select({ status: members.status, userId: members.userId }).from(members).where(eq(members.id, who.memberId));
  if (!member || member.userId !== who.userId || member.status !== "activo") return { ok: false, error: "Tu membresía no está activa: comunicate con la asociación." };

  // Sent twice (a double click, a retry): the first one counts.
  const [already] = await db.select({ documentId: reprocannDocumentFiles.documentId }).from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.fileKey, input.key));
  if (already) return { ok: true, documentId: already.documentId };

  const file = await checkStoredFile(storage, input.key);
  if ("error" in file) return { ok: false, error: file.error };

  const [{ sent }] = await db
    .select({ sent: count() })
    .from(reprocannDocumentFiles)
    .where(and(eq(reprocannDocumentFiles.uploadedBy, who.userId), gte(reprocannDocumentFiles.uploadedAt, new Date(now.getTime() - 86_400_000))));
  if (sent >= MAX_UPLOADS_PER_DAY) {
    await storage.delete(input.key);
    return { ok: false, error: "Ya enviaste muchos archivos hoy. Probá de nuevo mañana o comunicate con la asociación." };
  }

  try {
    const documentId = await db.transaction(async (tx) => {
      const t = tx as unknown as Database;
      const caseId = await ensureCase(t, who.userId, who.memberId, now);
      const id = randomUUID();
      // Left empty, the expiry the association already has for the current credential carries over,
      // if it has not passed: the form says so. It stays unverified until the review.
      const [current] = await t
        .select({ expiresOn: reprocannDocuments.expiresOn })
        .from(reprocannDocuments)
        .where(and(eq(reprocannDocuments.caseId, caseId), inArray(reprocannDocuments.kind, ["credencial", "certificado"]), isNull(reprocannDocuments.replacedBy), isNull(reprocannDocuments.withdrawnAt)))
        .orderBy(desc(reprocannDocuments.createdAt))
        .limit(1);
      const expiresOn = input.expiresOn ?? (current?.expiresOn && current.expiresOn >= todayInArgentina(now) ? current.expiresOn : null);
      const previous = await t
        .select({ id: reprocannDocuments.id })
        .from(reprocannDocuments)
        .where(
          and(
            eq(reprocannDocuments.caseId, caseId),
            eq(reprocannDocuments.kind, "credencial"),
            eq(reprocannDocuments.createdBy, who.userId),
            isNull(reprocannDocuments.replacedBy),
            isNull(reprocannDocuments.withdrawnAt),
            inArray(reprocannDocuments.reviewStatus, ["pendiente", "observada"]),
          ),
        )
        .for("update");
      await t.insert(reprocannDocuments).values({
        id,
        caseId,
        kind: "credencial",
        expiresOn,
        source: "aportado_por_socio",
        reviewStatus: "pendiente",
        createdBy: who.userId,
        createdAt: now,
        updatedAt: now,
      });
      await insertPages(t, id, [file], who.userId, now);
      const replaced = previous.length
        ? await t
            .update(reprocannDocuments)
            .set({ replacedBy: id, updatedAt: now })
            .where(and(inArray(reprocannDocuments.id, previous.map((p) => p.id)), isNull(reprocannDocuments.replacedBy), isNull(reprocannDocuments.withdrawnAt), inArray(reprocannDocuments.reviewStatus, ["pendiente", "observada"])))
            .returning({ id: reprocannDocuments.id })
        : [];
      // What was sent and how big; never the file name, which may carry personal data.
      await audit(t, {
        actorUserId: who.userId,
        action: "reprocann.document_uploaded",
        entityType: "reprocann_case",
        entityId: caseId,
        metadata: { document: id, kind: "credencial", pages: 1, contentType: file.type, size: file.bytes.byteLength, expiresOn, expiryCarriedOver: !input.expiresOn && !!expiresOn, replaces: replaced.map((p) => p.id).join(",") || null },
      });
      return id;
    });
    return { ok: true, documentId };
  } catch (e) {
    // The same file registered at the same instant by a second request.
    const [again] = await db.select({ documentId: reprocannDocumentFiles.documentId }).from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.fileKey, input.key));
    if (again) return { ok: true, documentId: again.documentId };
    throw e;
  }
}

// ── Loaded by the association ────────────────────────────────────────────────────────────────

/**
 * A document the association already received, loaded from the member's page: a new document, or
 * the files of a document already recorded without them (for example, a credential imported from
 * the historical register). `dni` is the one printed on the document: it must match the member's
 * DNI on the register. It is compared through its lookup and never stored nor logged.
 */
export const adminUploadInput = z.object({
  target: z.union([z.literal("nuevo"), z.uuid()]),
  kind: z.enum(["credencial", "certificado", "constancia_vinculacion", "otro"], { error: "Elegí el tipo de documento." }),
  expiresOn: expiryDate,
  dni: z.string().trim().min(1, "Escribí el DNI que figura en el documento.").max(20),
  pages: z.array(z.string().max(120)).min(1, "Elegí al menos un archivo.").max(20, "Hasta 20 hojas por documento."),
  /** From an import preview: each page must be exactly the file that was reviewed. */
  expectedSha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)).optional(),
});
export type AdminUploadInput = z.infer<typeof adminUploadInput>;

/** The same file is already on record: where, so the admin can review the case. */
export type DuplicateFile = { page: number; documentId: string; memberId: string; sameMember: boolean };

export type AdminUploadResult = { ok: true; documentId: string; pages: number } | { ok: false; error: string; duplicates?: DuplicateFile[] };

/** Does the DNI printed on a document belong to this member, according to the register? */
export async function documentDniMatches(db: Database, rings: Keyrings, memberId: string, rawDni: string): Promise<"match" | "mismatch" | "invalid" | "no_dni"> {
  let dni: string;
  try {
    dni = normalizeDni(rawDni);
  } catch (e) {
    if (e instanceof InvalidDniError) return "invalid";
    throw e;
  }
  const [m] = await db.select({ personId: members.personId }).from(members).where(eq(members.id, memberId));
  if (!m) return "mismatch";
  const [identity] = await db.select({ lookup: personIdentities.dniLookup }).from(personIdentities).where(eq(personIdentities.personId, m.personId));
  if (!identity) return "no_dni";
  return dniLookupCandidates(rings.lookup, dni).some((c) => c.value === identity.lookup) ? "match" : "mismatch";
}

/** Files already stored with any of these hashes, and whose they are. */
async function storedDuplicates(db: Database, hashes: string[], memberId: string): Promise<DuplicateFile[]> {
  if (!hashes.length) return [];
  const rows = await db
    .select({ sha256: reprocannDocumentFiles.sha256, documentId: reprocannDocumentFiles.documentId, memberId: reprocannCases.memberId })
    .from(reprocannDocumentFiles)
    .innerJoin(reprocannDocuments, eq(reprocannDocuments.id, reprocannDocumentFiles.documentId))
    .innerJoin(reprocannCases, eq(reprocannCases.id, reprocannDocuments.caseId))
    .where(inArray(reprocannDocumentFiles.sha256, hashes));
  return hashes.flatMap((h, i) => rows.filter((r) => r.sha256 === h).map((r) => ({ page: i + 1, documentId: r.documentId, memberId: r.memberId, sameMember: r.memberId === memberId })));
}

const IDENTITY_ERRORS = {
  invalid: "Revisá el DNI: tiene que tener entre 7 y 8 números.",
  mismatch: "El DNI del documento no coincide con el del socio en el padrón. Revisá el archivo y el socio antes de cargarlo.",
  no_dni: "El socio no tiene DNI en el padrón. Cargalo en «Datos personales» antes de asociarle documentación.",
} as const;

/**
 * Loads a document the association received, page by page, after the identity check. The files
 * are checked like the members' ones. A file already on record (same SHA-256) stops the load: it
 * is shown where it is, so nothing is duplicated or overwritten without reviewing the case. The
 * document stays pending review: loading it is not verifying it.
 */
export async function addAdminDocument(db: Database, storage: ObjectStorage, rings: Keyrings, adminId: string, memberId: string, input: AdminUploadInput, now = new Date()): Promise<AdminUploadResult> {
  if (!UUID.test(memberId)) return { ok: false, error: "El socio no existe." };
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId));
  if (!member) return { ok: false, error: "El socio no existe." };
  if (input.pages.some((k) => !isMemberFileKey(k, memberId)) || new Set(input.pages).size !== input.pages.length) return { ok: false, error: NOT_FOUND };

  const identity = await documentDniMatches(db, rings, memberId, input.dni);
  const removeAll = () => Promise.all(input.pages.map((k) => storage.delete(k)));
  if (identity !== "match") {
    await removeAll();
    return { ok: false, error: IDENTITY_ERRORS[identity] };
  }

  const files: CheckedFile[] = [];
  for (const key of input.pages) {
    const f = await checkStoredFile(storage, key);
    if ("error" in f) {
      await removeAll();
      return { ok: false, error: `Hoja ${files.length + 1}: ${f.error}` };
    }
    files.push(f);
  }
  if (new Set(files.map((f) => f.sha256)).size !== files.length) {
    await removeAll();
    return { ok: false, error: "Elegiste el mismo archivo dos veces: cada hoja tiene que ser un archivo distinto." };
  }
  if (input.expectedSha256 && (input.expectedSha256.length !== files.length || files.some((f, i) => f.sha256 !== input.expectedSha256![i]))) {
    await removeAll();
    return { ok: false, error: "Los archivos no son los mismos que se revisaron. Volvé a revisar la importación." };
  }
  const duplicates = await storedDuplicates(db, files.map((f) => f.sha256), memberId);
  if (duplicates.length) {
    await removeAll();
    return {
      ok: false,
      error: duplicates.some((d) => !d.sameMember) ? "Al menos una hoja ya está cargada para otro socio. Revisá el caso antes de cargarla." : "Al menos una hoja ya está cargada para este socio.",
      duplicates,
    };
  }

  try {
    const documentId = await db.transaction(async (tx) => {
      const t = tx as unknown as Database;
      const caseId = await ensureCase(t, adminId, memberId, now);
      let id: string;
      if (input.target === "nuevo") {
        id = randomUUID();
        await t.insert(reprocannDocuments).values({
          id,
          caseId,
          kind: input.kind,
          expiresOn: input.expiresOn,
          source: "en_poder_de_la_asociacion",
          reviewStatus: "pendiente",
          createdBy: adminId,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Only a document of this member, still without files, not replaced and not verified.
        const [d] = await t
          .select({ id: reprocannDocuments.id, caseId: reprocannDocuments.caseId, reviewStatus: reprocannDocuments.reviewStatus, replacedBy: reprocannDocuments.replacedBy, withdrawnAt: reprocannDocuments.withdrawnAt })
          .from(reprocannDocuments)
          .where(eq(reprocannDocuments.id, input.target))
          .for("update");
        const [hasFiles] = await t.select({ n: count() }).from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, input.target));
        if (!d || d.caseId !== caseId || d.replacedBy || d.withdrawnAt || d.reviewStatus === "verificada" || hasFiles.n > 0) throw new AttachError();
        id = d.id;
        await t.update(reprocannDocuments).set({ updatedAt: now }).where(eq(reprocannDocuments.id, id));
      }
      await insertPages(t, id, files, adminId, now);
      await audit(t, {
        actorUserId: adminId,
        action: "reprocann.document_files_added",
        entityType: "reprocann_case",
        entityId: caseId,
        metadata: { document: id, kind: input.kind, pages: files.length, size: files.reduce((n, f) => n + f.bytes.byteLength, 0), identityChecked: true, attached: input.target !== "nuevo" },
      });
      return id;
    });
    return { ok: true, documentId, pages: files.length };
  } catch (e) {
    if (e instanceof AttachError) {
      await removeAll();
      return { ok: false, error: "Ese documento ya tiene archivos, fue reemplazado o está verificado. Cargalo como documento nuevo o revisá el caso." };
    }
    throw e;
  }
}
class AttachError extends Error {}

/**
 * Removes the pages a load left in the member's folder when it failed halfway (a page that did not
 * reach the storage, a lost connection). A file that a document already uses is never removed, so
 * calling it after an uncertain result is safe. Returns how many were removed.
 */
export async function discardUnregisteredFiles(db: Database, storage: ObjectStorage, memberId: string, keys: string[]): Promise<number> {
  const mine = [...new Set(keys)].filter((k) => isMemberFileKey(k, memberId));
  if (!mine.length) return 0;
  const used = new Set((await db.select({ key: reprocannDocumentFiles.fileKey }).from(reprocannDocumentFiles).where(inArray(reprocannDocumentFiles.fileKey, mine))).map((r) => r.key));
  const orphans = mine.filter((k) => !used.has(k));
  await Promise.all(orphans.map((k) => storage.delete(k)));
  return orphans.length;
}

// ── Preview of an import of documents the association already holds ──────────────────────────

export const importRowsInput = z
  .array(
    z.object({
      dni: z.string().trim().max(20),
      page: z.number().int().min(1).max(20),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      size: z.number().int().min(0),
      type: z.string().max(40),
    }),
  )
  .min(1)
  .max(100);
export type ImportRows = z.infer<typeof importRowsInput>;

export type ImportGroup = {
  /** Masked: the DNI is only shown partially, never stored. */
  dni: string;
  rows: number[];
  status: "confirmado" | "existente" | "duplicado" | "ambiguo";
  reason: string;
  member: { id: string; name: string; number: string | null } | null;
  /** Where the files would go: a new credential or an existing record without files. */
  target: { kind: "nuevo" } | { kind: "adjuntar"; documentId: string; expiresOn: string | null } | null;
};

/**
 * Checks an import before anything is uploaded or stored. The browser sends, per file, the DNI the
 * admin read on the document, the page and what it computed from the file (SHA-256, size, type):
 * the documents themselves stay on the admin's computer. Files with the same DNI form one document,
 * ordered by page. Each group is matched against the register by DNI, never by file name.
 */
export async function previewImport(db: Database, rings: Keyrings, rows: ImportRows): Promise<ImportGroup[]> {
  const groups = new Map<string, { dni: string | null; raw: string; rows: number[] }>();
  rows.forEach((r, i) => {
    let dni: string | null = null;
    try {
      dni = normalizeDni(r.dni);
    } catch {
      dni = null;
    }
    const key = dni ?? `invalido-${i}`;
    const g = groups.get(key) ?? { dni, raw: r.dni, rows: [] };
    g.rows.push(i);
    groups.set(key, g);
  });

  // The same file under two DNIs: one person's document must not reach someone else.
  const groupsOfFile = new Map<string, Set<string>>();
  for (const [key, g] of groups) for (const i of g.rows) groupsOfFile.set(rows[i].sha256, (groupsOfFile.get(rows[i].sha256) ?? new Set()).add(key));

  const out: ImportGroup[] = [];
  for (const g of groups.values()) {
    const base = { dni: g.dni ? maskDni(g.dni) : "—", rows: g.rows, member: null, target: null } as const;
    const files = g.rows.map((i) => rows[i]);
    if (!g.dni) {
      out.push({ ...base, status: "ambiguo", reason: "Falta el DNI o no es válido." });
      continue;
    }
    const invalid = files.find((f) => !FILE_TYPES.includes(f.type as FileType) || f.size < 1 || f.size > MAX_FILE_BYTES);
    if (invalid) {
      out.push({ ...base, status: "ambiguo", reason: "Hay un archivo que no es PDF, JPG o PNG de hasta 10 MB." });
      continue;
    }
    const pages = files.map((f) => f.page).sort((a, b) => a - b);
    if (pages.some((p, i) => p !== i + 1)) {
      out.push({ ...base, status: "ambiguo", reason: "Las hojas tienen que ser 1, 2, 3… sin repetirse ni saltearse." });
      continue;
    }
    const lookups = dniLookupCandidates(rings.lookup, g.dni).map((c) => c.value);
    const found = await db
      .select({ id: members.id, number: members.memberNumber, fullName: persons.fullName, firstNames: persons.firstNames, lastNames: persons.lastNames })
      .from(personIdentities)
      .innerJoin(members, eq(members.personId, personIdentities.personId))
      .innerJoin(persons, eq(persons.id, members.personId))
      .where(inArray(personIdentities.dniLookup, lookups));
    const m = found.length === 1 ? found[0] : null;
    const member = m && { id: m.id, name: m.lastNames && m.firstNames ? `${m.lastNames}, ${m.firstNames}` : m.fullName, number: m.number };
    if (files.some((f) => groupsOfFile.get(f.sha256)!.size > 1)) {
      out.push({ ...base, member, status: "duplicado", reason: "El mismo archivo está en otra fila con otro DNI. Revisá a quién corresponde antes de importarlo." });
      continue;
    }
    if (!m || !member) {
      out.push({ ...base, status: "ambiguo", reason: found.length ? "El DNI corresponde a más de un socio." : await whyNoMember(db, lookups) });
      continue;
    }
    const ordered = [...files].sort((a, b) => a.page - b.page);
    const duplicates = await storedDuplicates(db, ordered.map((f) => f.sha256), m.id);
    if (duplicates.length) {
      out.push({ ...base, member, status: "duplicado", reason: duplicates.some((d) => !d.sameMember) ? "Una hoja ya está cargada para otro socio." : "Ya está cargado para este socio." });
      continue;
    }
    if (new Set(files.map((f) => f.sha256)).size !== files.length) {
      out.push({ ...base, member, status: "ambiguo", reason: "Hay dos hojas que son el mismo archivo." });
      continue;
    }
    const credentials = await db
      .select({ id: reprocannDocuments.id, expiresOn: reprocannDocuments.expiresOn, reviewStatus: reprocannDocuments.reviewStatus, files: count(reprocannDocumentFiles.id) })
      .from(reprocannDocuments)
      .innerJoin(reprocannCases, eq(reprocannCases.id, reprocannDocuments.caseId))
      .leftJoin(reprocannDocumentFiles, eq(reprocannDocumentFiles.documentId, reprocannDocuments.id))
      .where(and(eq(reprocannCases.memberId, m.id), eq(reprocannDocuments.kind, "credencial"), isNull(reprocannDocuments.replacedBy), isNull(reprocannDocuments.withdrawnAt)))
      .groupBy(reprocannDocuments.id)
      .orderBy(desc(reprocannDocuments.createdAt));
    if (credentials.some((c) => c.files > 0)) {
      out.push({ ...base, member, status: "existente", reason: "El socio ya tiene una credencial con archivo. Revisá el caso desde su ficha." });
      continue;
    }
    const withoutFiles = credentials.filter((c) => c.files === 0 && c.reviewStatus !== "verificada");
    if (withoutFiles.length > 1) {
      out.push({ ...base, member, status: "ambiguo", reason: "El socio tiene más de un registro de credencial sin archivo. Elegí desde su ficha a cuál corresponde." });
      continue;
    }
    out.push(
      withoutFiles.length
        ? { ...base, member, status: "confirmado", reason: "Se adjunta a la credencial ya registrada, que sigue pendiente de revisión.", target: { kind: "adjuntar", documentId: withoutFiles[0].id, expiresOn: withoutFiles[0].expiresOn } }
        : { ...base, member, status: "confirmado", reason: "Se carga como credencial nueva, pendiente de revisión.", target: { kind: "nuevo" } },
    );
  }
  return out;
}

/**
 * Why a DNI has no member to attach a document to: a request still in progress, or nobody. The
 * document waits on the admin's computer until the person is a member; nothing is stored for them.
 */
async function whyNoMember(db: Database, lookups: string[]): Promise<string> {
  const [admission] = await db
    .select({ reference: admissions.reference, status: admissions.status })
    .from(personIdentities)
    .innerJoin(admissions, eq(admissions.personId, personIdentities.personId))
    .where(inArray(personIdentities.dniLookup, lookups))
    .orderBy(desc(admissions.createdAt))
    .limit(1);
  if (admission && admission.status !== "rechazada" && admission.status !== "aprobada")
    return `Todavía no es socio/a: tiene la solicitud de alta ${admission.reference} en curso. Cargá la credencial cuando se apruebe.`;
  const [request] = await db
    .select({ reference: existingMemberRequests.reference })
    .from(existingMemberRequests)
    .where(and(inArray(existingMemberRequests.dniLookup, lookups), inArray(existingMemberRequests.status, ["awaiting_data", "pending_verification", "needs_review"])))
    .limit(1);
  if (request) return `Todavía no figura como socio/a: tiene la solicitud «Ya soy socio/a» ${request.reference} sin resolver. Resolvela y después cargá la credencial.`;
  return "Ningún socio del padrón tiene ese DNI. Si es socio/a de antes, primero hay que sumarlo al padrón.";
}

// ── Opening files ─────────────────────────────────────────────────────────────────────────────

export type FileViewer = { role: "admin"; userId: string; memberId: string } | { role: "member"; userId: string; memberId: string };
export type DocumentFile = { bytes: Uint8Array; contentType: FileType; filename: string };
/** A thumbnail is logged as a preview, at most once a day per person and document; an opening, every time. */
export const PREVIEW_ACTION = "reprocann.document_previewed";
const PREVIEW_LOG_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * One file (page) of a document, for an admin looking at that member or for the member it belongs
 * to (a withdrawn duplicate, only for admins). Null in every other case, without saying whether
 * it exists. Each opening is logged; a thumbnail (`preview`), once a day per person and document,
 * so the record still says who saw each document without one entry per page load.
 */
export async function openDocumentFile(db: Database, storage: ObjectStorage, fileId: string, viewer: FileViewer, opts: { preview?: boolean; now?: Date } = {}): Promise<DocumentFile | null> {
  if (!UUID.test(fileId) || !UUID.test(viewer.memberId)) return null;
  const [f] = await db
    .select({
      id: reprocannDocumentFiles.id,
      page: reprocannDocumentFiles.page,
      fileKey: reprocannDocumentFiles.fileKey,
      contentType: reprocannDocumentFiles.contentType,
      sha256: reprocannDocumentFiles.sha256,
      documentId: reprocannDocuments.id,
      kind: reprocannDocuments.kind,
      caseId: reprocannDocuments.caseId,
      withdrawnAt: reprocannDocuments.withdrawnAt,
      memberId: reprocannCases.memberId,
    })
    .from(reprocannDocumentFiles)
    .innerJoin(reprocannDocuments, eq(reprocannDocuments.id, reprocannDocumentFiles.documentId))
    .innerJoin(reprocannCases, eq(reprocannCases.id, reprocannDocuments.caseId))
    .where(eq(reprocannDocumentFiles.id, fileId));
  if (!f || f.memberId !== viewer.memberId) return null;
  // A withdrawn duplicate left the member's documentation; the association keeps it for the record.
  if (f.withdrawnAt && viewer.role === "member") return null;
  const bytes = await storage.get(f.fileKey);
  // What is served is exactly what was checked when it arrived.
  if (!bytes || sha256Hex(bytes) !== f.sha256 || detectFileType(bytes) !== f.contentType) return null;
  if (opts.preview) {
    const now = opts.now ?? new Date();
    const [seen] = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "reprocann_case"),
          eq(auditLogs.entityId, f.caseId),
          eq(auditLogs.action, PREVIEW_ACTION),
          eq(auditLogs.actorUserId, viewer.userId),
          sql`${auditLogs.metadata}->>'document' = ${f.documentId}`,
          gte(auditLogs.at, new Date(now.getTime() - PREVIEW_LOG_WINDOW_MS)),
        ),
      )
      .limit(1);
    if (!seen) await audit(db, { actorUserId: viewer.userId, action: PREVIEW_ACTION, entityType: "reprocann_case", entityId: f.caseId, metadata: { document: f.documentId, by: viewer.role } });
  } else {
    await audit(db, { actorUserId: viewer.userId, action: "reprocann.document_viewed", entityType: "reprocann_case", entityId: f.caseId, metadata: { document: f.documentId, page: f.page, by: viewer.role } });
  }
  const type = f.contentType as FileType;
  return { bytes, contentType: type, filename: `reprocann-${f.kind.replace(/_/g, "-")}-hoja-${f.page}.${FILE_EXTENSION[type]}` };
}

/** Headers for a private file: never cached, never sniffed, shown in the browser. */
export function fileResponse(file: DocumentFile): Response {
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      "Content-Disposition": `inline; filename="${file.filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

// ── Uploads reaching this server (development machine) ───────────────────────────────────────

/** Reads at most 10 MB of a request body, whatever it claims, and stores it under `key`. Returns an HTTP status. */
export async function storeUploadBody(request: Request, storage: ObjectStorage, key: string): Promise<number> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!FILE_TYPES.includes(type as FileType)) return 415;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_FILE_BYTES) return 413;
  if (await storage.get(key)) return 409;
  const reader = request.body?.getReader();
  if (!reader) return 400;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FILE_BYTES) {
      await reader.cancel();
      return 413;
    }
    chunks.push(value);
  }
  await storage.put(key, Buffer.concat(chunks), type);
  return 204;
}

/** What a client token allows: one file of an accepted type, up to 10 MB, never overwriting. */
export const uploadTokenOptions = () => ({ allowedContentTypes: FILE_TYPES, maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 10 * 60_000 });

// ── Admin queue ───────────────────────────────────────────────────────────────────────────────

/** Documents with files that nobody reviewed yet, oldest first: the admin's queue. */
export async function documentsToReview(db: Database) {
  const rows = await db
    .selectDistinct({
      id: reprocannDocuments.id,
      kind: reprocannDocuments.kind,
      expiresOn: reprocannDocuments.expiresOn,
      createdAt: reprocannDocuments.createdAt,
      source: reprocannDocuments.source,
      memberId: members.id,
      memberNumber: members.memberNumber,
      fullName: persons.fullName,
      firstNames: persons.firstNames,
      lastNames: persons.lastNames,
    })
    .from(reprocannDocuments)
    .innerJoin(reprocannDocumentFiles, eq(reprocannDocumentFiles.documentId, reprocannDocuments.id))
    .innerJoin(reprocannCases, eq(reprocannCases.id, reprocannDocuments.caseId))
    .innerJoin(members, eq(members.id, reprocannCases.memberId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .where(and(eq(reprocannDocuments.reviewStatus, "pendiente"), isNull(reprocannDocuments.replacedBy), isNull(reprocannDocuments.withdrawnAt)))
    .orderBy(asc(reprocannDocuments.createdAt));
  return rows.map(({ fullName, firstNames, lastNames, ...r }) => ({ ...r, name: lastNames && firstNames ? `${lastNames}, ${firstNames}` : fullName }));
}

export async function countDocumentsToReview(db: Database) {
  return (await documentsToReview(db)).length;
}
