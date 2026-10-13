"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { addPreAdmissionNote, changePreAdmissionStatus, InvalidTransitionError } from "@/server/pre-admissions";

export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh(id: string) {
  revalidatePath("/admin/preadmisiones");
  revalidatePath(`/admin/preadmisiones/${id}`);
  revalidatePath("/admin");
}

export async function markReviewed(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await changePreAdmissionStatus(await getDb(), user.id, id, "en-revision");
  } catch (e) {
    return { ok: false, error: e instanceof InvalidTransitionError ? "La solicitud cambió de estado. Recargá la página." : "No pudimos guardar el cambio." };
  }
  refresh(id);
  return { ok: true };
}

export async function closePreAdmission(id: string, reason: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await changePreAdmissionStatus(await getDb(), user.id, id, "cerrada", { reason });
  } catch (e) {
    return { ok: false, error: e instanceof InvalidTransitionError ? e.message : "No pudimos guardar el cambio." };
  }
  refresh(id);
  return { ok: true };
}

export async function addNote(id: string, body: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await addPreAdmissionNote(await getDb(), user.id, id, body);
  } catch {
    return { ok: false, error: "No pudimos guardar la nota." };
  }
  refresh(id);
  return { ok: true };
}
