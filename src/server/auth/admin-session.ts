import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { session as sessionTable, sessionActivity } from "@/server/db/schema";
import { ADMIN_IDLE_MS, ADMIN_SESSION_MS } from "./create-auth";

export type AdminSessionCheck = "ok" | "expired" | "idle";

/**
 * Enforces the admin limits independently of Better Auth's sliding refresh:
 * 8 h absolute from creation and 30 min of inactivity. Expired sessions are deleted.
 */
export async function checkAdminSession(
  db: Database,
  s: { id: string; createdAt: Date },
  now = new Date(),
): Promise<AdminSessionCheck> {
  if (now.getTime() - new Date(s.createdAt).getTime() > ADMIN_SESSION_MS) {
    await db.delete(sessionTable).where(eq(sessionTable.id, s.id));
    return "expired";
  }
  const [activity] = await db.select().from(sessionActivity).where(eq(sessionActivity.sessionId, s.id));
  if (activity && now.getTime() - activity.lastSeenAt.getTime() > ADMIN_IDLE_MS) {
    await db.delete(sessionTable).where(eq(sessionTable.id, s.id));
    return "idle";
  }
  await db
    .insert(sessionActivity)
    .values({ sessionId: s.id, lastSeenAt: now })
    .onConflictDoUpdate({ target: sessionActivity.sessionId, set: { lastSeenAt: now } });
  return "ok";
}
