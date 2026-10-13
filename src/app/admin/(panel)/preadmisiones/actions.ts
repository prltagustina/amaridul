"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import { addPreAdmissionNote, changePreAdmissionStatus, InvalidTransitionError, inviteToAdmission } from "@/server/pre-admissions";

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

export async function invite(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  let emailed: boolean;
  try {
    ({ emailed } = await inviteToAdmission(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, user.id, id));
  } catch (e) {
    return { ok: false, error: e instanceof InvalidTransitionError ? "Esta solicitud ya no se puede invitar. Recargá la página." : "No pudimos enviar la invitación." };
  }
  refresh(id);
  return emailed ? { ok: true } : { ok: false, error: "La invitación quedó registrada, pero el email no se pudo enviar. Probá reenviarla." };
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
