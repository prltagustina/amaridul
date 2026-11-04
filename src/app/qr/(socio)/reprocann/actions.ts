"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { LinkCodeError, linkCodeInput, setLinkCode } from "@/server/reprocann-link";
import { activeMemberOfRequest } from "@/server/member-request";
import { memberUploadInput, registerMemberUpload, type UploadResult } from "@/server/reprocann-files";
import { documentStorage, uploadMode } from "@/server/storage";

/** The member confirms the file they just sent: the server checks it and records it, pending review. */
export async function registerUploadAction(raw: unknown): Promise<UploadResult> {
  const who = await activeMemberOfRequest();
  if (!who) return { ok: false, error: "Tu sesión terminó o tu membresía no está activa. Volvé a ingresar." };
  const parsed = memberUploadInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message.startsWith("Invalid") ? "Revisá los datos." : (parsed.error.issues[0]?.message ?? "Revisá los datos.") };
  const storage = documentStorage();
  if (!storage || uploadMode() === "unavailable") return { ok: false, error: "La carga de documentación todavía no está disponible. Mientras tanto, comunicate con la asociación." };
  try {
    const result = await registerMemberUpload(await getDb(), storage, who, parsed.data);
    if (result.ok) {
      revalidatePath("/qr/reprocann");
      revalidatePath("/qr/mi-espacio");
    }
    return result;
  } catch (e) {
    console.error("REPROCANN upload failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos registrar tu documentación. Probá de nuevo en unos minutos." };
  }
}

/** The member sends their REPROCANN «código de vinculación», so the association can link them. */
export async function sendLinkCodeAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await activeMemberOfRequest();
  if (!who) return { ok: false, error: "Tu sesión terminó o tu membresía no está activa. Volvé a ingresar." };
  const parsed = linkCodeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá el código." };
  try {
    await setLinkCode(await getDb(), getKeyrings().field, who.userId, who.memberId, parsed.data);
  } catch (e) {
    if (e instanceof LinkCodeError) return { ok: false, error: e.message };
    console.error("Link code not saved:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar tu código. Probá de nuevo en unos minutos." };
  }
  revalidatePath("/qr/reprocann");
  revalidatePath("/qr/mi-espacio");
  return { ok: true };
}
