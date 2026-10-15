import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { rateLimitBuckets } from "@/server/db/schema";
import type { LimitResult, RateLimiter } from "./limiter";

/** Hashes a key part (an IP, a DNI's HMAC) so the table never holds it as such. */
export const limitKey = (scope: string, value: string) => `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 40)}`;

/**
 * Fixed-window counter in Postgres, shared by every server instance. One atomic upsert per hit:
 * a new window starts when the previous one expired. Expired rows are swept now and then.
 */
export class PostgresRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Database,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async limit(key: string, { max, windowMs }: { max: number; windowMs: number }): Promise<LimitResult> {
    const now = this.now();
    const fresh = new Date(now.getTime() + windowMs);
    const [row] = await this.db
      .insert(rateLimitBuckets)
      .values({ key, count: 1, resetAt: fresh })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          count: sql`case when ${rateLimitBuckets.resetAt} <= ${now} then 1 else ${rateLimitBuckets.count} + 1 end`,
          resetAt: sql`case when ${rateLimitBuckets.resetAt} <= ${now} then ${fresh} else ${rateLimitBuckets.resetAt} end`,
        },
      })
      .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt });
    if (Math.random() < 0.02) await this.db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.resetAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)));
    return { ok: row.count <= max, remaining: Math.max(0, max - row.count), resetAt: row.resetAt.getTime() };
  }
}
