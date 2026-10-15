"use server";

import { headers } from "next/headers";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { limitKey, PostgresRateLimiter } from "@/server/rate-limit/postgres";
import { dniLookup } from "@/server/crypto/dni";
import { checkUpdateLink, existingMemberInput, submitExistingMemberRequest, type UpdateLinkCheck } from "@/server/existing-members";

export type ExistingSubmitResult = { ok: true; reference: string | null; demo?: boolean } | { ok: false; error: "validation" | "rate" | "server" | "invalid_link" };

// Shared across server instances (Postgres). Per connection, and per identity so one DNI cannot be
// tried over and over from many connections. Keys are hashes: never the IP nor the DNI.
const PER_IP = { max: 5, windowMs: 10 * 60 * 1000 };
const PER_DNI = { max: 3, windowMs: 24 * 60 * 60 * 1000 };
const preview = () => process.env.VERCEL_ENV === "preview";

/** Public endpoint: it never tells whether the person is on file; the admin verifies every request. */
export async function submitExistingMember(raw: unknown, token: string, trap: string): Promise<ExistingSubmitResult> {
  if (trap) return { ok: true, reference: null };
  if (preview()) return { ok: true, reference: "SOC-DEMO", demo: true };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const db = await getDb();
  const limiter = new PostgresRateLimiter(db);
  if (!(await limiter.limit(limitKey("existing_member_ip", ip), PER_IP)).ok) return { ok: false, error: "rate" };

  const parsed = existingMemberInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  const rings = getKeyrings();
  if (!(await limiter.limit(limitKey("existing_member_dni", dniLookup(rings.lookup, parsed.data.dni).value), PER_DNI)).ok) return { ok: false, error: "rate" };
  try {
    const r = await submitExistingMemberRequest(db, { rings, email: getEmailSender() }, parsed.data, String(token || "") || null);
    // The screen never shows the reference: a repeat for the same person must look the same as a first send.
    return r.ok ? { ok: true, reference: null } : { ok: false, error: "invalid_link" };
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
