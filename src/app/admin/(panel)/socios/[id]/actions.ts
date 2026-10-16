"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import {
  addMemberNote,
  changeDni,
  changeMemberNumber,
  contactInput,
  feeInput,
  inviteToActivate,
  MemberProfileError,
  membershipInput,
  personalInput,
  updateContact,
  updateFee,
  updateMembership,
  updatePersonal,
} from "@/server/member-profile";

export type BlockResult = { ok: true; message?: string } | { ok: false; error: string };

function refresh(id: string) {
  revalidatePath(`/admin/socios/${id}`);
  revalidatePath("/admin/socios");
}

/** Every block: admin session, server-side validation, and errors without echoing the payload. */
async function run(id: string, fn: (actorId: string) => Promise<string | void>, fallback: string): Promise<BlockResult> {
  const { user } = await requireAdmin();
  try {
    const message = await fn(user.id);
    refresh(String(id));
    return { ok: true, message: message || undefined };
  } catch (e) {
    if (e instanceof MemberProfileError) return { ok: false, error: e.message };
    if (e && typeof e === "object" && "issues" in e) return { ok: false, error: ((e as { issues: { message: string }[] }).issues[0]?.message ?? "Revisá los datos.").replace(/^Invalid.*/, "Revisá los datos.") };
    console.error(fallback, e instanceof Error ? e.message : e);
    return { ok: false, error: fallback };
  }
}

export const savePersonal = async (id: string, raw: unknown) => run(id, async (a) => updatePersonal(await getDb(), a, String(id), personalInput.parse(raw)), "No pudimos guardar los datos personales.");
export const saveContact = async (id: string, raw: unknown) => run(id, async (a) => updateContact(await getDb(), a, String(id), contactInput.parse(raw)), "No pudimos guardar el contacto.");
export const saveMembership = async (id: string, raw: unknown) => run(id, async (a) => updateMembership(await getDb(), a, String(id), membershipInput.parse(raw)), "No pudimos guardar la membresía.");
export const saveFee = async (id: string, raw: unknown) => run(id, async (a) => updateFee(await getDb(), a, String(id), feeInput.parse(raw)), "No pudimos guardar la cuota.");
export const saveMemberNumber = async (id: string, number: string) => run(id, async (a) => changeMemberNumber(await getDb(), a, String(id), String(number)), "No pudimos cambiar el número.");
export const saveDni = async (id: string, dni: string) =>
  run(
    id,
    async (a) => {
      const r = await changeDni(await getDb(), getKeyrings(), a, String(id), String(dni));
      if (!r.changed) return "El DNI ya era ese: no hubo cambios.";
      return r.sessionsRevoked ? `DNI actualizado. Cerramos ${r.sessionsRevoked === 1 ? "la sesión abierta" : `las ${r.sessionsRevoked} sesiones abiertas`} del socio.` : "DNI actualizado.";
    },
    "No pudimos cambiar el DNI.",
  );
export const saveNote = async (id: string, body: string) => run(id, async (a) => addMemberNote(await getDb(), a, String(id), String(body)), "No pudimos guardar la nota.");
export const invite = async (id: string) =>
  run(
    id,
    async (a) => {
      const r = await inviteToActivate(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, a, String(id));
      return r.emailed ? "Le enviamos el email para activar la cuenta." : "La cuenta quedó lista, pero el email no se pudo enviar. Probá de nuevo.";
    },
    "No pudimos enviar la invitación.",
  );
