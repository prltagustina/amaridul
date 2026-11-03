"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { FeePlanError, feePlanInput, setFeePlan } from "@/server/fee-plan";
import { activeMemberOfRequest } from "@/server/member-request";

/** The member chooses how often they pay the fee. Their own record only. */
export async function choosePlanAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await activeMemberOfRequest();
  if (!who) return { ok: false, error: "Tu sesión se cerró o tu membresía no está activa. Volvé a ingresar." };
  const parsed = feePlanInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Elegí cómo vas a pagar." };
  try {
    await setFeePlan(await getDb(), who.userId, who.memberId, parsed.data);
  } catch (e) {
    if (e instanceof FeePlanError) return { ok: false, error: e.message };
    console.error("Fee plan not saved:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar tu elección. Probá de nuevo." };
  }
  revalidatePath("/qr/cuota");
  revalidatePath("/qr/mi-espacio");
  return { ok: true };
}
