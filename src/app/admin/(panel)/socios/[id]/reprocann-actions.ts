"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { addDocument, caseInput, documentInput, ReprocannError, reviewDocument, reviewInput, saveCase } from "@/server/reprocann";
import { addAdminDocument, adminUploadInput, type AdminUploadResult } from "@/server/reprocann-files";
import { LinkCodeError, linkCodeInput, setLinkCode } from "@/server/reprocann-link";
import { documentStorage, uploadMode } from "@/server/storage";

export type ReprocannResult = { ok: true } | { ok: false; error: string };

const firstMessage = (issues: { message: string }[]) => (issues[0]?.message && !issues[0].message.startsWith("Invalid") ? issues[0].message : "Revisá los datos.");

export async function saveCaseAction(memberId: string, raw: unknown): Promise<ReprocannResult> {
  const { user } = await requireAdmin();
  const parsed = caseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstMessage(parsed.error.issues) };
  try {
    await saveCase(await getDb(), user.id, String(memberId), parsed.data);
  } catch (e) {
    console.error("REPROCANN case save failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar el cambio." };
  }
  revalidatePath(`/admin/socios/${memberId}`);
  return { ok: true };
}

export async function addDocumentAction(memberId: string, raw: unknown): Promise<ReprocannResult> {
  const { user } = await requireAdmin();
  const parsed = documentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstMessage(parsed.error.issues) };
  try {
    await addDocument(await getDb(), getKeyrings().field, user.id, String(memberId), parsed.data);
  } catch (e) {
    console.error("REPROCANN document add failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos registrar el documento." };
  }
  revalidatePath(`/admin/socios/${memberId}`);
  return { ok: true };
}

export async function reviewDocumentAction(memberId: string, documentId: string, raw: unknown): Promise<ReprocannResult> {
  const { user } = await requireAdmin();
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstMessage(parsed.error.issues) };
  try {
    await reviewDocument(await getDb(), getKeyrings().field, user.id, String(documentId), parsed.data);
  } catch (e) {
    if (e instanceof ReprocannError) return { ok: false, error: e.message };
    console.error("REPROCANN review failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar la revisión." };
  }
  revalidatePath(`/admin/socios/${memberId}`);
  return { ok: true };
}

/** Loads documentation the association received: identity checked against the register, pending review. */
export async function adminUploadAction(memberId: string, raw: unknown): Promise<AdminUploadResult> {
  const { user } = await requireAdmin();
  const parsed = adminUploadInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstMessage(parsed.error.issues) };
  const storage = documentStorage();
  if (!storage || uploadMode() === "unavailable") return { ok: false, error: "La carga de archivos todavía no está habilitada: falta el almacenamiento privado." };
  try {
    const r = await addAdminDocument(await getDb(), storage, getKeyrings(), user.id, String(memberId), parsed.data);
    if (r.ok) {
      revalidatePath(`/admin/socios/${memberId}`);
      revalidatePath("/admin/reprocann");
    }
    return r;
  } catch (e) {
    console.error("REPROCANN admin upload failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos cargar la documentación." };
  }
}

/** Records (or, left empty, removes) the member's «código de vinculación», for members who do not use the portal. */
export async function saveLinkCodeAction(memberId: string, raw: string): Promise<ReprocannResult> {
  const { user } = await requireAdmin();
  const text = String(raw ?? "").trim();
  const parsed = text ? linkCodeInput.safeParse(text) : null;
  if (parsed && !parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá el código." };
  try {
    await setLinkCode(await getDb(), getKeyrings().field, user.id, String(memberId), parsed ? parsed.data : null);
  } catch (e) {
    if (e instanceof LinkCodeError) return { ok: false, error: e.message };
    console.error("Link code not saved:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar el código. Probá de nuevo." };
  }
  revalidatePath(`/admin/socios/${memberId}`);
  revalidatePath("/admin/reprocann");
  return { ok: true };
}
