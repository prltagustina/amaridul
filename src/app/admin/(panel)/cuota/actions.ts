"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ReminderError, saveReminderSettings, settingsInput } from "@/server/fee-reminders";

export type SettingsValues = { enabled: boolean; frequency: string; dayOfMonth: string; hour: string };
export type SettingsResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof SettingsValues, string>> };

export async function saveReminderSettingsAction(values: SettingsValues): Promise<SettingsResult> {
  const { user } = await requireAdmin();
  const parsed = settingsInput.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof SettingsValues, string>> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as keyof SettingsValues] ??= issue.message;
    return { ok: false, error: "Revisá los datos marcados.", fieldErrors };
  }
  try {
    await saveReminderSettings(await getDb(), user.id, parsed.data);
  } catch (e) {
    if (e instanceof ReminderError) return { ok: false, error: e.message, fieldErrors: { enabled: e.message } };
    console.error("Fee reminder settings failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar la configuración. Probá de nuevo." };
  }
  revalidatePath("/admin/cuota");
  return { ok: true };
}
