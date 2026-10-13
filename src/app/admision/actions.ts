"use server";

import { getDb } from "@/server/db";
import { checkInvitation } from "@/server/pre-admissions";

export type InvitationView = { status: "ok"; reference: string; firstName: string; email: string; expiresAt: string } | { status: "expired" } | { status: "invalid" };

/** Public: the token is 256-bit random, so guessing is not a concern; it is validated, never consumed here. */
export async function openInvitation(token: string): Promise<InvitationView> {
  try {
    const r = await checkInvitation(await getDb(), String(token));
    return r.status === "ok" ? { ...r, expiresAt: r.expiresAt.toISOString() } : r;
  } catch (e) {
    console.error("Invitation check failed:", e instanceof Error ? e.message : e);
    return { status: "invalid" };
  }
}
