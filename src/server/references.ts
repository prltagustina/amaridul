import { sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";

/**
 * Atomically allocates the next visible reference for a kind and year, e.g. PRE-2026-0001.
 * A single INSERT … ON CONFLICT DO UPDATE … RETURNING avoids duplicates under concurrency.
 */
export async function nextReference(db: Database, kind: string, prefix: string, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const result = await db.execute<{ last_value: number }>(sql`
    insert into reference_counters (kind, year, last_value) values (${kind}, ${year}, 1)
    on conflict (kind, year) do update set last_value = reference_counters.last_value + 1
    returning last_value
  `);
  const rows = (Array.isArray(result) ? result : (result as { rows: { last_value: number }[] }).rows) as { last_value: number }[];
  const n = Number(rows[0].last_value);
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}
