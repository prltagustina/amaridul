import "server-only";
import { getCurrentSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { memberOfUser } from "@/server/members";

/**
 * The active member behind this request, for route handlers and actions that answer with an error
 * instead of redirecting: null without a member session or when the membership is not active.
 */
export async function activeMemberOfRequest(): Promise<{ memberId: string; userId: string } | null> {
  const current = await getCurrentSession();
  if (!current?.user || (current.user as { role?: string }).role !== "MEMBER") return null;
  const m = await memberOfUser(await getDb(), current.user.id);
  return m && m.status === "activo" ? { memberId: m.id, userId: current.user.id } : null;
}

/** Same-site requests only: a browser on another site cannot send files on the member's behalf. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
