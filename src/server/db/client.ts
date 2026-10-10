import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** In-memory (dataDir undefined) or on-disk PGlite, migrated on open. Local and tests only. */
export async function openPglite(dataDir?: string): Promise<Database> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_DIR });
  return db as unknown as Database;
}

/** Remote Postgres. Migrations are never applied implicitly here: use `npm run db:migrate`. */
export function openPostgres(url: string): Database {
  return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema }) as unknown as Database;
}
