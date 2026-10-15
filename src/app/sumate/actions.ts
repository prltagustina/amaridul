"use server";

import { headers } from "next/headers";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { limitKey, PostgresRateLimiter } from "@/server/rate-limit/postgres";
import { createPreAdmission, preAdmissionInput } from "@/server/pre-admissions";

export type SubmitResult = { ok: true; reference: string | null; demo?: boolean } | { ok: false; error: "validation" | "rate" | "server" };

// Shared across server instances (Postgres); the key is a hash of the connection's IP.
const LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

/** Public endpoint: anyone can call it, so it validates everything again and never trusts the client. */
export async function submitPreAdmission(raw: unknown, trap: string): Promise<SubmitResult> {
  // Honeypot filled in: a bot. Answer as if it worked and store nothing.
  if (trap) return { ok: true, reference: null };
  // Private previews have no database: the form keeps working as a demo there.
  if (process.env.VERCEL_ENV === "preview") return { ok: true, reference: "PRE-DEMO", demo: true };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!(await new PostgresRateLimiter(await getDb()).limit(limitKey("pre_admission_ip", ip), LIMIT)).ok) return { ok: false, error: "rate" };

  const parsed = preAdmissionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const { reference } = await createPreAdmission(await getDb(), { field: getKeyrings().field, email: getEmailSender() }, parsed.data);
    return { ok: true, reference };
  } catch (e) {
    console.error("Pre-admission submit failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "server" };
  }
}
