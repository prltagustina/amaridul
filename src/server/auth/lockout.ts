import { eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { authLockouts } from "@/server/db/schema";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export async function isLocked(db: Database, userId: string, now = new Date()): Promise<boolean> {
  const [row] = await db.select({ lockedUntil: authLockouts.lockedUntil }).from(authLockouts).where(eq(authLockouts.userId, userId));
  return !!row?.lockedUntil && row.lockedUntil > now;
}

/** Counts a failed attempt; the fifth consecutive failure locks the account for 15 minutes. */
export async function recordFailure(db: Database, userId: string, now = new Date()): Promise<void> {
  const nowTs = sql`${now.toISOString()}::timestamptz`;
  const until = sql`${new Date(now.getTime() + LOCKOUT_MS).toISOString()}::timestamptz`;
  const expired = sql`${authLockouts.lockedUntil} is not null and ${authLockouts.lockedUntil} <= ${nowTs}`;
  const nextCount = sql`case when ${expired} then 1 else ${authLockouts.failedCount} + 1 end`;
  await db
    .insert(authLockouts)
    .values({ userId, failedCount: 1, lastFailedAt: now })
    .onConflictDoUpdate({
      target: authLockouts.userId,
      set: {
        failedCount: nextCount,
        lockedUntil: sql`case
          when ${authLockouts.lockedUntil} is not null and ${authLockouts.lockedUntil} > ${nowTs} then ${authLockouts.lockedUntil}
          when ${nextCount} >= ${MAX_FAILED_ATTEMPTS} then ${until}
          else null end`,
        lastFailedAt: now,
      },
    });
}

export async function clearFailures(db: Database, userId: string): Promise<void> {
  await db.delete(authLockouts).where(eq(authLockouts.userId, userId));
}
