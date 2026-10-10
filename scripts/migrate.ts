import { migrate } from "drizzle-orm/node-postgres/migrator";
import { MIGRATIONS_DIR } from "@/server/db/client";
import { scriptContext } from "./lib/context";

async function main() {
  const { env, db } = await scriptContext();
  if (env.DATABASE_URL) {
    // PGlite migrates on open; remote Postgres only through this explicit command.
    await migrate(db as never, { migrationsFolder: MIGRATIONS_DIR });
  }
  console.log(`Migraciones aplicadas (${env.DATABASE_URL ? "Postgres" : `PGlite en ${env.PGLITE_DIR}`}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
