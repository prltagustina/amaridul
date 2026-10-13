"use server";

import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { admissionInput, submitAdmission } from "@/server/admissions";

export type FormalSubmitResult = { ok: true; reference: string; demo?: boolean } | { ok: false; error: "invalid_link" | "dni_registered" | "validation" | "server" };

/** Public, but only works with a live invitation link; everything is validated again here. */
export async function submitFormalAdmission(token: string, raw: unknown): Promise<FormalSubmitResult> {
  // Private previews have no database: the wizard keeps working as a demo there.
  if (process.env.VERCEL_ENV === "preview") return { ok: true, reference: "ADM-DEMO", demo: true };
  const parsed = admissionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  try {
    return await submitAdmission(await getDb(), { rings: getKeyrings(), email: getEmailSender() }, String(token), parsed.data);
  } catch (e) {
    console.error("Formal admission submit failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "server" };
  }
}
