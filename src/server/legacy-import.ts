// Historical member register import (CSV exported from the association's sheet, processed locally).
// It completes the register only: no accounts, no passwords, no emails. Identity is matched by the
// DNI's HMAC, never by name. Every run is recorded (import_runs) and running it twice changes nothing.
// The sheet's fee columns are read and reported but not imported until their institutional meaning
// is confirmed (they are not the admission date, the member's since date or the digitization date).
import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { importRuns, memberNotes, members, personIdentities, persons, reprocannCases, reprocannDocuments } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { dniLookupCandidates, maskDni, normalizeDni } from "@/server/crypto/dni";
import { setPersonDni, type Keyrings } from "@/server/identity/person-identity";

// ---------- CSV ----------

/** RFC 4180 with the delimiter detected (comma or semicolon, as spreadsheet exports use). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Recognised columns. "N°" (row position in the sheet) and the computed ones are read but never stored. */
const HEADERS = {
  sheetIndex: ["n", "n o", "nro", "numero"],
  lastNames: ["apellido", "apellidos"],
  firstNames: ["nombre", "nombres"],
  dni: ["dni", "documento"],
  phone: ["celular", "telefono", "telefono celular"],
  email: ["email", "mail", "correo"],
  locality: ["localidad"],
  isMember: ["socio/a", "socio", "socia", "socio / a"],
  room: ["sala"],
  expiresOn: ["fecha de vencimiento", "vencimiento", "fecha de vencimiento reprocann", "vencimiento reprocann"],
  daysToExpiry: ["dias para vencer"],
  credentialState: ["estado credencial", "estado de la credencial"],
  credentialFile: ["credencial", "archivo", "credencial / archivo", "credencial/archivo", "credencial archivo", "ver credencial"],
  feeEnrollmentDate: ["cuota fecha de alta", "fecha de alta cuota", "cuota fecha alta", "fecha de alta"],
  paymentMethod: ["medio de pago", "forma de pago"],
  notes: ["observaciones", "observacion"],
} satisfies Record<string, string[]>;
// Every row of the register is a member. The sheet's "Socio/a" column means something else for
// the association, so it is recognised (not reported as unknown) but decides nothing.
const REQUIRED = ["lastNames", "firstNames", "dni"] as const;
type Field = keyof typeof HEADERS;
export type SourceRow = { line: number } & Partial<Record<Field, string>>;

const columnsOf = (header: string[]): (Field | null)[] =>
  header.map((h) => {
    const n = norm(h);
    return (Object.keys(HEADERS) as Field[]).find((f) => (HEADERS[f] as string[]).includes(n)) ?? null;
  });

export function mapRows(table: string[][]) {
  // Sheet exports often carry a title and notes above the header: the header is the first row
  // (within the first ten) naming at least the surname and DNI columns.
  const at = Math.max(0, table.slice(0, 10).findIndex((row) => ["lastNames", "dni"].every((f) => columnsOf(row).includes(f as Field))));
  const header = table[at] ?? [];
  const data = table.slice(at + 1);
  const columns = columnsOf(header);
  const ignoredHeaders = header.filter((_, i) => !columns[i]);
  const missing = REQUIRED.filter((f) => !columns.includes(f));
  const rows: SourceRow[] = data.map((cells, i) => {
    const r: SourceRow = { line: at + i + 2 };
    columns.forEach((f, c) => {
      if (f) r[f] = (cells[c] ?? "").trim();
    });
    return r;
  });
  return { rows, ignoredHeaders, missing };
}

/** dd/mm/yyyy, d/m/yy or yyyy-mm-dd → yyyy-mm-dd; "" → null; anything else → undefined (invalid). */
export function parseDate(raw: string | undefined): string | null | undefined {
  const v = (raw ?? "").trim();
  if (!v) return null;
  let y: number, m: number, d: number;
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const ar = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else if (ar) [d, m, y] = [+ar[1], +ar[2], ar[3].length === 2 ? 2000 + +ar[3] : +ar[3]];
  else return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return date.toISOString().slice(0, 10);
}

// ---------- Analysis (dry run) ----------

export type Outcome = "create" | "update" | "match" | "skip" | "review" | "conflict";
export type RowResult = {
  line: number;
  outcome: Outcome;
  reason: string;
  name: string;
  dniMasked: string | null;
  memberId?: string;
  changes?: string[];
  warnings: string[];
};
type Prepared = {
  row: SourceRow;
  dni: string | null;
  lookups: string[];
  expiresOn: string | null;
  /** The sheet's email can be stored: no other person holds it and it does not contradict the file. */
  emailUsable: boolean;
  result: RowResult;
};

export async function analyse(db: Database, rings: Keyrings, rows: SourceRow[]) {
  const prepared: Prepared[] = [];
  const byDni = new Map<string, number[]>();
  const byEmail = new Map<string, number[]>();

  for (const row of rows) {
    const name = [row.lastNames, row.firstNames].filter(Boolean).join(", ");
    const result: RowResult = { line: row.line, outcome: "create", reason: "Nuevo socio histórico", name, dniMasked: null, warnings: [] };
    const p: Prepared = { row, dni: null, lookups: [], expiresOn: null, emailUsable: !!row.email, result };
    prepared.push(p);
    const values = (Object.keys(row) as (keyof SourceRow)[]).filter((k) => k !== "line").map((k) => row[k] as string | undefined);
    if (values.every((v) => !v)) {
      Object.assign(result, { outcome: "skip", reason: "Fila vacía" });
      continue;
    }
    if (!row.firstNames || !row.lastNames) {
      Object.assign(result, { outcome: "review", reason: "Falta nombre o apellido" });
      continue;
    }
    if (!row.dni) {
      Object.assign(result, { outcome: "review", reason: "Sin DNI: requiere completar DNI / revisión manual" });
      continue;
    }
    try {
      p.dni = normalizeDni(row.dni);
    } catch {
      Object.assign(result, { outcome: "review", reason: "DNI inválido" });
      continue;
    }
    result.dniMasked = maskDni(p.dni);
    p.lookups = dniLookupCandidates(rings.lookup, p.dni).map((c) => c.value);
    const expires = parseDate(row.expiresOn);
    if (expires === undefined) {
      Object.assign(result, { outcome: "review", reason: "Fecha inválida (vencimiento)" });
      continue;
    }
    p.expiresOn = expires;
    byDni.set(p.dni, [...(byDni.get(p.dni) ?? []), prepared.length - 1]);
    if (row.email) byEmail.set(row.email.toLowerCase(), [...(byEmail.get(row.email.toLowerCase()) ?? []), prepared.length - 1]);
  }

  // The same DNI twice in the file: both rows wait for a human.
  for (const idx of byDni.values())
    if (idx.length > 1) for (const i of idx) Object.assign(prepared[i].result, { outcome: "conflict", reason: `DNI repetido en el archivo (filas ${idx.map((j) => prepared[j].row.line).join(", ")})` });
  for (const idx of byEmail.values())
    if (idx.length > 1)
      for (const i of idx) {
        prepared[i].result.warnings.push("Email repetido en el archivo: no se carga");
        prepared[i].emailUsable = false;
      }

  // Match against the register by the DNI's HMAC.
  for (const p of prepared) {
    if (p.result.outcome !== "create") continue;
    const [identity] = await db.select({ personId: personIdentities.personId }).from(personIdentities).where(inArray(personIdentities.dniLookup, p.lookups));
    if (identity) {
      const [m] = await db.select({ id: members.id }).from(members).where(eq(members.personId, identity.personId));
      if (!m) {
        Object.assign(p.result, { outcome: "review", reason: "La persona ya está en el sistema pero no como socia (por ejemplo, una solicitud en curso)" });
        continue;
      }
      p.result.memberId = m.id;
      // The DNI decides the match; a different name is only a warning for the admin.
      const [onFile] = await db.select({ fullName: persons.fullName, lastNames: persons.lastNames, email: persons.email }).from(persons).where(eq(persons.id, identity.personId));
      if (onFile?.email && p.row.email && onFile.email.trim().toLowerCase() !== p.row.email.trim().toLowerCase()) {
        p.result.warnings.push("Conflicto de email: la planilla trae otro distinto; se conserva el registrado (revisión manual)");
        p.emailUsable = false;
      }
      if (onFile && norm(onFile.lastNames ?? onFile.fullName).split(" ").every((w) => !norm(p.row.lastNames ?? "").includes(w))) {
        p.result.warnings.push(`El nombre no coincide con el registrado (${onFile.fullName}): revisalo`);
      }
      const changes = await fillableChanges(db, p, m.id, identity.personId);
      Object.assign(p.result, { outcome: changes.length ? "update" : "match", reason: changes.length ? "Socio ya registrado: se completan datos vacíos" : "Socio ya registrado: sin cambios", changes });
    }
    if (p.row.email && p.emailUsable) {
      const others = await db.select({ id: persons.id }).from(persons).where(sql`lower(${persons.email}) = lower(${p.row.email})`);
      if (others.some((o) => o.id !== identity?.personId)) {
        p.result.warnings.push("Conflicto de email: ya figura en otra persona del sistema; no se carga (revisión manual)");
        p.emailUsable = false;
      }
    }
    if (norm(p.row.credentialState ?? "")) p.result.warnings.push("«Estado credencial» se ignora: la vigencia se calcula con la fecha");
    if (p.expiresOn || p.row.credentialFile) {
      const writes = p.result.outcome === "create" || p.result.changes?.includes("credencial");
      p.result.warnings.push(`Credencial histórica sin archivo migrado: ${writes ? "se registra como documentación en poder de la asociación, revisión pendiente" : "ya registrada, sin cambios"} (el link no se importa)`);
    }
    if (p.row.feeEnrollmentDate || p.row.paymentMethod) p.result.warnings.push("Cuota (fecha de alta / medio de pago): pendiente de mapeo institucional, no se importa");
  }

  const results = prepared.map((p) => p.result);
  const count = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const summary = {
    rows: results.length,
    create: count("create"),
    update: count("update"),
    match: count("match"),
    skip: count("skip"),
    review: count("review"),
    conflict: count("conflict"),
    withoutDni: results.filter((r) => r.reason.startsWith("Sin DNI")).length,
    invalidDni: results.filter((r) => r.reason === "DNI inválido").length,
    duplicateDni: results.filter((r) => r.reason.startsWith("DNI repetido")).length,
    personWithoutMember: results.filter((r) => r.reason.startsWith("La persona ya está")).length,
    repeatedEmail: results.filter((r) => r.warnings.some((w) => w.startsWith("Email repetido"))).length,
    emailConflict: results.filter((r) => r.warnings.some((w) => w.startsWith("Conflicto de email"))).length,
    historicalCredential: results.filter((r) => r.warnings.some((w) => w.startsWith("Credencial histórica"))).length,
    feePendingMapping: results.filter((r) => r.warnings.some((w) => w.startsWith("Cuota"))).length,
  };
  return { prepared, results, summary, blocking: summary.conflict > 0 };
}

/** Fields an import may fill on a member already on file: only empty ones, never institutional data. */
async function fillableChanges(db: Database, p: Prepared, memberId: string, personId: string) {
  const [person] = await db.select().from(persons).where(eq(persons.id, personId));
  const [member] = await db.select({ room: members.room }).from(members).where(eq(members.id, memberId));
  const changes: string[] = [];
  if (!person.phone && p.row.phone) changes.push("celular");
  if (!person.locality && p.row.locality) changes.push("localidad");
  if (!person.email && p.emailUsable) changes.push("email");
  if (!member.room && p.row.room) changes.push("sala");
  if ((p.expiresOn || p.row.credentialFile) && !(await hasDocuments(db, memberId))) changes.push("credencial");
  if (p.row.notes && !(await hasImportNote(db, memberId, p.row.notes))) changes.push("observaciones");
  return changes;
}

async function hasDocuments(db: Database, memberId: string) {
  const [d] = await db
    .select({ id: reprocannDocuments.id })
    .from(reprocannDocuments)
    .innerJoin(reprocannCases, eq(reprocannCases.id, reprocannDocuments.caseId))
    .where(eq(reprocannCases.memberId, memberId))
    .limit(1);
  return !!d;
}
async function hasImportNote(db: Database, memberId: string, body: string) {
  const [n] = await db.select({ id: memberNotes.id }).from(memberNotes).where(and(eq(memberNotes.memberId, memberId), eq(memberNotes.source, "import"), eq(memberNotes.body, body.trim()))).limit(1);
  return !!n;
}

// ---------- Apply ----------

/** Writes what the analysis allows. Refuses if there are blocking conflicts. Sends no email. */
export async function applyImport(db: Database, rings: Keyrings, file: { name: string; content: string }, now = new Date(), actorUserId: string | null = null) {
  const { rows, missing } = mapRows(parseCsv(file.content));
  if (missing.length) throw new Error(`Faltan columnas: ${missing.join(", ")}`);
  const analysis = await analyse(db, rings, rows);
  if (analysis.blocking) throw new Error("Hay conflictos graves: resolvelos en el archivo antes de aplicar.");
  const sha = createHash("sha256").update(file.content).digest("hex");

  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [run] = await t
      .insert(importRuns)
      .values({ kind: "legacy_members", fileName: file.name.split(/[\\/]/).pop() ?? file.name, fileSha256: sha, rows: rows.length, startedAt: now })
      .returning({ id: importRuns.id });
    let created = 0;
    let updated = 0;

    for (const p of analysis.prepared) {
      const r = p.row;
      if (p.result.outcome === "create") {
        const fullName = `${r.firstNames} ${r.lastNames}`;
        const [person] = await t
          .insert(persons)
          .values({ fullName, firstNames: r.firstNames, lastNames: r.lastNames, phone: r.phone || null, email: p.emailUsable ? r.email!.toLowerCase() : null, locality: r.locality || null, createdAt: now, updatedAt: now })
          .returning({ id: persons.id });
        await setPersonDni(t, rings, person.id, p.dni!);
        const [m] = await t
          .insert(members)
          .values({ personId: person.id, origin: "legacy", status: "activo", room: r.room || null, importRunId: run.id, createdAt: now, updatedAt: now })
          .returning({ id: members.id });
        await writeExtras(t, rings, p, m.id, run.id, now);
        await audit(t, { actorUserId, action: "member.imported", entityType: "member", entityId: m.id, metadata: { importRun: run.id, line: r.line } });
        created++;
      } else if (p.result.outcome === "update") {
        const memberId = p.result.memberId!;
        const [m] = await t.select({ personId: members.personId, room: members.room }).from(members).where(eq(members.id, memberId));
        const [person] = await t.select().from(persons).where(eq(persons.id, m.personId));
        await t
          .update(persons)
          .set({ phone: person.phone || r.phone || null, locality: person.locality || r.locality || null, email: person.email || (p.emailUsable ? r.email!.toLowerCase() : null), updatedAt: now })
          .where(eq(persons.id, m.personId));
        if (!m.room && r.room) await t.update(members).set({ room: r.room, updatedAt: now }).where(eq(members.id, memberId));
        await writeExtras(t, rings, p, memberId, run.id, now);
        await audit(t, { actorUserId, action: "member.import_updated", entityType: "member", entityId: memberId, metadata: { importRun: run.id, line: r.line, fields: (p.result.changes ?? []).join(", ") } });
        updated++;
      }
    }

    const summary = { ...analysis.summary };
    await t.update(importRuns).set({ created, updated, summary, finishedAt: new Date() }).where(eq(importRuns.id, run.id));
    return { runId: run.id, created, updated, summary, results: analysis.results };
  });
}

/** The historical credential (data only, no file) and the sheet's observations, each only once. */
async function writeExtras(t: Database, rings: Keyrings, p: Prepared, memberId: string, runId: string, now: Date) {
  const r = p.row;
  if ((p.expiresOn || r.credentialFile) && !(await hasDocuments(t, memberId))) {
    const [existing] = await t.select({ id: reprocannCases.id }).from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
    const caseId = existing?.id ?? (await t.insert(reprocannCases).values({ memberId, permitStatus: "no_informado", createdAt: now, updatedAt: now }).returning({ id: reprocannCases.id }))[0].id;
    // The association holds it; nobody has reviewed it in the system yet. The sheet's link is not kept.
    await t.insert(reprocannDocuments).values({
      id: crypto.randomUUID(),
      caseId,
      kind: "credencial",
      expiresOn: p.expiresOn,
      source: "en_poder_de_la_asociacion",
      reviewStatus: "pendiente",
      createdAt: now,
      updatedAt: now,
    });
    await audit(t, { action: "reprocann.document_added", entityType: "reprocann_case", entityId: caseId, metadata: { kind: "credencial", source: "en_poder_de_la_asociacion", expiresOn: p.expiresOn, importRun: runId } });
  }
  if (r.notes && !(await hasImportNote(t, memberId, r.notes))) {
    await t.insert(memberNotes).values({ memberId, source: "import", importRunId: runId, body: r.notes.trim(), createdAt: now });
  }
  void rings;
}
