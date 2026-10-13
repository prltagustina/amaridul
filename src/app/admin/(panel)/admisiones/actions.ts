"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { elevateToCommission, InvalidAdmissionTransitionError } from "@/server/admissions";

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
