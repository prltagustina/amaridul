// Fictitious data for local development only. Never run against a database holding real data.
//   - emails @example.com (reserved for documentation, RFC 2606)
//   - names "Persona Ficticia NN"
//   - DNIs in the 99.000.0NN range. No number is guaranteed not to exist, so these stay local.
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { account, persons, user } from "@/server/db/schema";
import { createAdminAccount } from "@/server/auth/admin-accounts";
import { hashPassword } from "@/server/auth/password";
import { setPersonDni } from "@/server/identity/person-identity";
import { scriptContext } from "./lib/context";

async function main() {
  const { env, db, rings } = await scriptContext();
  if (env.APP_ENV !== "local" && env.APP_ENV !== "test") {
    console.error(`Fixtures bloqueados en APP_ENV=${env.APP_ENV}`);
    process.exit(1);
  }
  if (env.DATABASE_URL) {
    console.error("Fixtures solo en PGlite local (DATABASE_URL está definido)");
    process.exit(1);
  }

  const out: string[] = [];

  const ADMIN = "admin.local@example.com";
  if (!(await db.select({ id: user.id }).from(user).where(eq(user.email, ADMIN))).length) {
    const password = randomBytes(18).toString("base64url");
    await createAdminAccount(db, { email: ADMIN, name: "Admin Local (ficticio)", password, appEnv: env.APP_ENV });
    out.push(`ADMIN  ${ADMIN}  contraseña: ${password}  (activar TOTP al ingresar)`);
  }

  for (const n of [1, 2]) {
    const email = `socio.ficticio${n}@example.com`;
    if ((await db.select({ id: user.id }).from(user).where(eq(user.email, email))).length) continue;
    const dni = `9900000${n}`;
    const password = randomBytes(12).toString("base64url");
    const [person] = await db
      .insert(persons)
      .values({ fullName: `Persona Ficticia 0${n}`, email, isFixture: true })
      .returning({ id: persons.id });
    await setPersonDni(db, rings, person.id, dni);
    const [u] = await db
      .insert(user)
      .values({ name: `Persona Ficticia 0${n}`, email, role: "MEMBER", status: "active", personId: person.id })
      .returning({ id: user.id });
    await db.insert(account).values({ userId: u.id, accountId: u.id, providerId: "credential", password: await hashPassword(password) });
    out.push(`SOCIO  DNI ${dni}  contraseña: ${password}`);
  }

  console.log(out.length ? `Datos ficticios creados (se muestran una sola vez):\n${out.join("\n")}` : "Los datos ficticios ya existían.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
