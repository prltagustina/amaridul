"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import { addPreAdmissionNote, changePreAdmissionStatus, InvalidTransitionError, inviteToAdmission } from "@/server/pre-admissions";
import { DeleteNotAllowedError, deleteTestRequest } from "@/server/test-data";

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

/** TEMPORARY (testing phase): deletes a test request and everything that came from it. */
export async function deleteTestRequestAction(id: string, confirmReference: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await deleteTestRequest(await getDb(), user.id, id, confirmReference);
  } catch (e) {
    if (!(e instanceof DeleteNotAllowedError)) console.error("Test request delete failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof DeleteNotAllowedError ? "La referencia no coincide. Escribila tal como aparece arriba." : "No pudimos eliminar la solicitud." };
  }
  revalidatePath("/admin/preadmisiones");
  revalidatePath("/admin/admisiones");
  revalidatePath("/admin/socios");
  revalidatePath("/admin");
  redirect("/admin/preadmisiones");
}
