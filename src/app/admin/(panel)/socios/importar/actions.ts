"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { analyse, applyImport, mapRows, parseCsv, type RowResult } from "@/server/legacy-import";

// The CSV is read in memory on the server (where the production keys live) and never stored:
// only its name, hash and counts stay in import_runs.

export type ImportSummary = Awaited<ReturnType<typeof analyse>>["summary"];
export type PreviewResult =
  | { ok: true; fileName: string; sha: string; ignoredHeaders: string[]; summary: ImportSummary; blocking: boolean; rows: RowResult[] }
  | { ok: false; error: string };
export type ApplyResult = { ok: true; created: number; updated: number } | { ok: false; error: string };

const MAX_BYTES = 1024 * 1024;

async function readCsv(form: FormData): Promise<{ name: string; content: string } | { error: string }> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Elegí el archivo CSV." };
  if (!/\.csv$/i.test(file.name)) return { error: "El archivo tiene que ser .csv (en Google Sheets: Archivo → Descargar → CSV)." };
  if (file.size > MAX_BYTES) return { error: "El archivo es demasiado grande (máximo 1 MB)." };
  return { name: file.name, content: await file.text() };
}

const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

/** Dry run: reports what would happen, writes nothing. */
export async function previewImportAction(form: FormData): Promise<PreviewResult> {
  await requireAdmin();
  const file = await readCsv(form);
  if ("error" in file) return { ok: false, error: file.error };
  const { rows, ignoredHeaders, missing } = mapRows(parseCsv(file.content));
  if (missing.length) return { ok: false, error: "No encontramos las columnas obligatorias (Apellido, Nombre y DNI). Revisá que sea la planilla de socios." };
  try {
    const { results, summary, blocking } = await analyse(await getDb(), getKeyrings(), rows);
    return { ok: true, fileName: file.name, sha: sha256(file.content), ignoredHeaders, summary, blocking, rows: results };
  } catch (e) {
    console.error("Import preview failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos revisar el archivo." };
  }
}

/** Applies exactly the file that was reviewed (same hash). No emails, no accounts. */
export async function applyImportAction(form: FormData): Promise<ApplyResult> {
  const { user } = await requireAdmin();
  const file = await readCsv(form);
  if ("error" in file) return { ok: false, error: file.error };
  if (sha256(file.content) !== String(form.get("sha") ?? "")) return { ok: false, error: "El archivo cambió desde la revisión: revisalo de nuevo antes de aplicar." };
  try {
    const out = await applyImport(await getDb(), getKeyrings(), file, new Date(), user.id);
    revalidatePath("/admin/socios");
    return { ok: true, created: out.created, updated: out.updated };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Import apply failed:", message);
    return { ok: false, error: message.startsWith("Hay conflictos") ? message : "No pudimos aplicar la importación. No se cargó nada." };
  }
}
