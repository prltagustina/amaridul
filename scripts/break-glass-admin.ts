// Emergency access: npm run admin:break-glass -- --email <admin> --confirm
// Removes the admin's second factor and closes every session; the password is untouched. Audited.
// Who may run this in production is an institutional decision still pending.
import { breakGlassResetSecondFactor } from "@/server/auth/admin-accounts";
import { arg, flag, scriptContext } from "./lib/context";

async function main() {
  const email = arg("email");
  if (!email || !flag("confirm")) {
    console.error("Uso: --email <admin> --confirm");
    process.exit(1);
  }

  const { db } = await scriptContext();
  const id = await breakGlassResetSecondFactor(db, email);
  console.log(`Segundo factor reiniciado para ${email} (${id}). Debe volver a enrolarse al ingresar. Acción registrada en auditoría.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
