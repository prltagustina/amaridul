"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { MemoryRateLimiter } from "@/server/rate-limit/limiter";
import { checkUpdateLink, existingMemberInput, submitExistingMemberRequest, type UpdateLinkCheck } from "@/server/existing-members";

export type ExistingSubmitResult = { ok: true; reference: string | null; demo?: boolean } | { ok: false; error: "validation" | "rate" | "server" | "invalid_link" };

// Per instance until Upstash is connected: enough to slow down a flood from one connection.
const limiter = new MemoryRateLimiter();
const LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const preview = () => process.env.VERCEL_ENV === "preview";

/** Public endpoint: it never tells whether the person is on file; the admin verifies every request. */
export async function submitExistingMember(raw: unknown, token: string, trap: string): Promise<ExistingSubmitResult> {
  if (trap) return { ok: true, reference: null };
  if (preview()) return { ok: true, reference: "SOC-DEMO", demo: true };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const key = `existing_member:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
  if (!(await limiter.limit(key, LIMIT)).ok) return { ok: false, error: "rate" };

  const parsed = existingMemberInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  try {
    const r = await submitExistingMemberRequest(await getDb(), { rings: getKeyrings(), email: getEmailSender() }, parsed.data, String(token || "") || null);
    return r.ok ? { ok: true, reference: r.reference } : { ok: false, error: "invalid_link" };
  } catch (e) {
    console.error("Existing member submit failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "server" };
  }
}

/** Personal link from a preadmission: who it is for, to greet them and prefill the email. */
export async function openUpdateLink(token: string): Promise<UpdateLinkCheck> {
  if (preview()) return { status: "invalid" };
  try {
    return await checkUpdateLink(await getDb(), String(token));
  } catch {
    return { status: "invalid" };
  }
}
