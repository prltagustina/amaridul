"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { addDocument, caseInput, documentInput, ReprocannError, reviewDocument, reviewInput, saveCase } from "@/server/reprocann";

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
  if (!parsed.success) return { ok: false, error: "Revisá los datos." };
  try {
    await reviewDocument(await getDb(), user.id, String(documentId), parsed.data);
  } catch (e) {
    if (e instanceof ReprocannError) return { ok: false, error: e.message };
    console.error("REPROCANN review failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar la revisión." };
  }
  revalidatePath(`/admin/socios/${memberId}`);
  return { ok: true };
}
