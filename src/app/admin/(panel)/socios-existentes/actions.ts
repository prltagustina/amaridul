"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import {
  ExistingMemberError,
  institutionalInput,
  linkExistingMember,
  linkInput,
  markNeedsReview,
  registerExistingMember,
  rejectExistingMemberRequest,
  resendUpdateLink,
} from "@/server/existing-members";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const deps = () => ({ email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL, rings: getKeyrings() });

function refresh(id: string) {
  revalidatePath("/admin/socios-existentes");
  revalidatePath(`/admin/socios-existentes/${id}`);
  revalidatePath("/admin/socios");
  revalidatePath("/admin");
}

function failure(e: unknown, fallback: string): ActionResult {
  if (e instanceof ExistingMemberError) return { ok: false, error: e.message };
  console.error(fallback, e instanceof Error ? e.message : e);
  return { ok: false, error: `${fallback} Probá de nuevo.` };
}

export async function registerAction(id: string, raw: unknown): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = institutionalInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message?.startsWith("Escribí") ? parsed.error.issues[0].message : "Revisá los datos institucionales." };
  try {
    const r = await registerExistingMember(await getDb(), deps(), user.id, String(id), parsed.data);
    refresh(id);
    return { ok: true, message: r.emailed ? `Socio ${r.memberNumber} registrado. Le enviamos el email para activar su cuenta.` : `Socio ${r.memberNumber} registrado, pero el email de activación no se pudo enviar. Reenvialo desde su ficha.` };
  } catch (e) {
    return failure(e, "No pudimos registrar al socio.");
  }
}

export async function linkAction(id: string, raw: unknown): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const parsed = linkInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Revisá los datos institucionales." };
  try {
    const r = await linkExistingMember(await getDb(), deps(), user.id, String(id), parsed.data);
    refresh(id);
    if (r.account === "active") return { ok: true, message: `Vinculado con ${r.memberNumber}. La cuenta ya estaba activa: no se creó otra.` };
    if (r.account === "disabled") return { ok: true, message: `Vinculado con ${r.memberNumber}. La cuenta está deshabilitada: no se envió activación.` };
    return { ok: true, message: "emailed" in r && r.emailed ? `Vinculado con ${r.memberNumber}. Le enviamos el email para activar su cuenta.` : `Vinculado con ${r.memberNumber}, pero el email de activación no se pudo enviar.` };
  } catch (e) {
    return failure(e, "No pudimos vincular la solicitud.");
  }
}

export async function needsReviewAction(id: string, notes: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await markNeedsReview(await getDb(), user.id, String(id), String(notes ?? ""));
    refresh(id);
    return { ok: true, message: "Marcada para revisar." };
  } catch (e) {
    return failure(e, "No pudimos guardar el cambio.");
  }
}

export async function rejectAction(id: string, notes: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    await rejectExistingMemberRequest(await getDb(), user.id, String(id), String(notes ?? ""));
    refresh(id);
    return { ok: true, message: "Marcada como «No corresponde». No se creó nada." };
  } catch (e) {
    return failure(e, "No pudimos guardar el cambio.");
  }
}

export async function resendLinkAction(id: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    const r = await resendUpdateLink(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, user.id, String(id));
    refresh(id);
    return r.emailed ? { ok: true, message: "Le enviamos un link nuevo. El anterior dejó de funcionar." } : { ok: false, error: "El link nuevo quedó registrado, pero el email no se pudo enviar." };
  } catch (e) {
    return failure(e, "No pudimos reenviar el link.");
  }
}
