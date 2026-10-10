import "server-only";
import { getEnv } from "@/server/env";
import { openPglite, openPostgres, type Database } from "./client";

export type { Database } from "./client";
export * as tables from "./schema";

const g = globalThis as unknown as { __amaridulDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  if (!g.__amaridulDb) {
    const env = getEnv();
    g.__amaridulDb = env.DATABASE_URL ? Promise.resolve(openPostgres(env.DATABASE_URL)) : openPglite(env.PGLITE_DIR);
  }
  return g.__amaridulDb;
}
