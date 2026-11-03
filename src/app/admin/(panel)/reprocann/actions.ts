"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { addAdminDocument, discardUnregisteredFiles, importRowsInput, previewImport, type AdminUploadResult, type ImportGroup } from "@/server/reprocann-files";
import { documentStorage, uploadMode } from "@/server/storage";

/** Checks an import without uploading or storing anything. */
export async function previewImportAction(raw: unknown): Promise<{ ok: true; groups: ImportGroup[] } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = importRowsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisá los datos de los archivos (hasta 100 por vez)." };
  try {
    return { ok: true, groups: await previewImport(await getDb(), getKeyrings(), parsed.data) };
  } catch (e) {
    console.error("REPROCANN import preview failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos revisar la importación." };
  }
}

const groupInput = z.object({
  memberId: z.uuid(),
  target: z.union([z.literal("nuevo"), z.uuid()]),
  dni: z.string().trim().min(1).max(20),
  pages: z.array(z.string().max(120)).min(1).max(20),
  sha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)).min(1).max(20),
});

/** Loads one confirmed group of the import: the same checks as a load from the member's page. */
export async function importGroupAction(raw: unknown): Promise<AdminUploadResult> {
  const { user } = await requireAdmin();
  const parsed = groupInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del documento." };
  const storage = documentStorage();
  if (!storage || uploadMode() === "unavailable") return { ok: false, error: "La carga de archivos todavía no está habilitada: falta el almacenamiento privado." };
  const g = parsed.data;
  try {
    const r = await addAdminDocument(await getDb(), storage, getKeyrings(), user.id, g.memberId, {
      target: g.target,
      kind: "credencial",
      expiresOn: null,
      dni: g.dni,
      pages: g.pages,
      expectedSha256: g.sha256,
    });
    if (r.ok) {
      revalidatePath(`/admin/socios/${g.memberId}`);
      revalidatePath("/admin/reprocann");
    }
    return r;
  } catch (e) {
    console.error("REPROCANN import failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos cargar este documento." };
  }
}

const discardInput = z.object({ memberId: z.uuid(), keys: z.array(z.string().max(120)).max(20) });

/** After a load that failed halfway: removes the pages already sent that no document uses. */
export async function discardUploadsAction(raw: unknown): Promise<void> {
  await requireAdmin();
  const parsed = discardInput.safeParse(raw);
  const storage = documentStorage();
  if (!parsed.success || !storage) return;
  try {
    await discardUnregisteredFiles(await getDb(), storage, parsed.data.memberId, parsed.data.keys);
  } catch (e) {
    console.error("REPROCANN discard failed:", e instanceof Error ? e.message : e);
  }
}
