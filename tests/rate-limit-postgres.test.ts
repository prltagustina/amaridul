import { beforeAll, describe, expect, it } from "vitest";
import { openPglite, type Database } from "@/server/db/client";
import { rateLimitBuckets } from "@/server/db/schema";
import { limitKey, PostgresRateLimiter } from "@/server/rate-limit/postgres";

let db: Database;
beforeAll(async () => {
  db = await openPglite();
});

describe("shared rate limiter", () => {
  it("counts across instances, blocks over the limit and starts a new window when it expires", async () => {
    let t = new Date("2026-10-15T12:00:00Z");
    const a = new PostgresRateLimiter(db, () => t);
    const b = new PostgresRateLimiter(db, () => t); // a second server instance, same database
    const key = limitKey("test", "203.0.113.10");
    const opts = { max: 2, windowMs: 60_000 };
    expect((await a.limit(key, opts)).ok).toBe(true);
    expect((await b.limit(key, opts)).ok).toBe(true);
    expect((await a.limit(key, opts)).ok).toBe(false);
    t = new Date("2026-10-15T12:01:01Z");
    expect((await b.limit(key, opts)).ok).toBe(true);
  });

  it("never stores the raw value", async () => {
    await new PostgresRateLimiter(db).limit(limitKey("ip", "198.51.100.7"), { max: 5, windowMs: 1000 });
    expect(JSON.stringify(await db.select().from(rateLimitBuckets))).not.toContain("198.51.100.7");
  });
});
