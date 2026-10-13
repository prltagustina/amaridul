"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { elevateToCommission, InvalidAdmissionTransitionError } from "@/server/admissions";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import { decisionInput, InvalidDecisionError, recordDecision, resendActivation } from "@/server/members";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function elevate(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await elevateToCommission(await getDb(), user.id, id);
  } catch (e) {
    return { ok: false, error: e instanceof InvalidAdmissionTransitionError ? "La solicitud cambió de estado. Recargá la página." : "No pudimos guardar el cambio." };
  }
  revalidatePath("/admin/admisiones");
  revalidatePath(`/admin/admisiones/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export type DecideResult = { ok: true; message: string } | { ok: false; error: string };

export async function decide(id: string, raw: unknown): Promise<DecideResult> {
  const { user } = await requireAdmin();
  const parsed = decisionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisá la decisión, la fecha de la reunión, el acta y la categoría." };
  let r: Awaited<ReturnType<typeof recordDecision>>;
  try {
    r = await recordDecision(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, user.id, id, parsed.data);
  } catch (e) {
    if (!(e instanceof InvalidDecisionError)) console.error("Decision failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof InvalidDecisionError ? "La solicitud ya no está en Comisión. Recargá la página." : "No pudimos registrar la decisión." };
  }
  revalidatePath("/admin/admisiones");
  revalidatePath(`/admin/admisiones/${id}`);
  revalidatePath("/admin/socios");
  revalidatePath("/admin");
  if (r.decision === "diferida") return { ok: true, message: "Decisión diferida registrada. La solicitud sigue en Comisión." };
  if (r.decision === "rechazada") return { ok: true, message: "Rechazo registrado. Se notificó a la persona." };
  return r.emailed
    ? { ok: true, message: `Admisión aprobada. Socio ${r.memberNumber}: se envió el link de activación de la cuenta.` }
    : { ok: true, message: `Admisión aprobada (socio ${r.memberNumber}), pero el email de activación no se pudo enviar. Reenvialo desde Socios.` };
}

export async function resendMemberActivation(memberId: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    const r = await resendActivation(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, user.id, memberId);
    if (!r.emailed) return { ok: false, error: "El link nuevo quedó registrado, pero el email no se pudo enviar." };
  } catch (e) {
    return { ok: false, error: e instanceof InvalidDecisionError ? "La cuenta ya está activa." : "No pudimos reenviar la activación." };
  }
  revalidatePath("/admin/socios");
  revalidatePath(`/admin/socios/${memberId}`);
  return { ok: true };
}
