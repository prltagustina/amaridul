// Usage: npm run admin:create -- --email admin.local@example.com --name "Admin Local"
// Outside production only @example.com addresses are accepted. The password is generated and shown once.
import { randomBytes } from "node:crypto";
import { createAdminAccount } from "@/server/auth/admin-accounts";
import { arg, scriptContext } from "./lib/context";

async function main() {
  const email = arg("email");
  const name = arg("name") ?? "Administración";
  if (!email) {
    console.error("Falta --email");
    process.exit(1);
  }

  const { env, db } = await scriptContext();
  const password = randomBytes(18).toString("base64url");
  const id = await createAdminAccount(db, { email, name, password, appEnv: env.APP_ENV });

  console.log(
    [
      `Admin creado (${id}).`,
      `Email: ${email}`,
      `Contraseña (se muestra una sola vez): ${password}`,
      "Al ingresar a /admin se pide activar la verificación en dos pasos.",
    ].join("\n"),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
