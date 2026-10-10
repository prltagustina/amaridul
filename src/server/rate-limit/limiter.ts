export type LimitResult = { ok: boolean; remaining: number; resetAt: number };

/** Upstash Redis in production (pending approval); in-memory locally. Keys must never contain a raw DNI. */
export interface RateLimiter {
  limit(key: string, opts: { max: number; windowMs: number }): Promise<LimitResult>;
}

/** Fixed-window counter. Single process only: fine for local development and tests. */
export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async limit(key: string, { max, windowMs }: { max: number; windowMs: number }): Promise<LimitResult> {
    const t = this.now();
    let w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      w = { count: 0, resetAt: t + windowMs };
      this.windows.set(key, w);
    }
    w.count += 1;
    return { ok: w.count <= max, remaining: Math.max(0, max - w.count), resetAt: w.resetAt };
  }
}
