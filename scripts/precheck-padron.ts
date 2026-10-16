// Counts to review before migration 0010 (read-only; prints numbers only).
//   npm run precheck:padron
import { sql } from "drizzle-orm";
import { scriptContext } from "./lib/context";
import { PRECHECK_EMAIL, PRECHECK_MEMBERS, PRECHECK_STRUCTURE } from "./lib/precheck-padron";

const rowsOf = (r: unknown) => (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as Record<string, unknown>[];

async function main() {
  const { env, db } = await scriptContext();
  const [email] = rowsOf(await db.execute(sql.raw(PRECHECK_EMAIL)));
  const [m] = rowsOf(await db.execute(sql.raw(PRECHECK_MEMBERS)));
  const [st] = rowsOf(await db.execute(sql.raw(PRECHECK_STRUCTURE)));
  console.log(`Pre-check 0010 · base ${env.DATABASE_URL ? "Postgres" : "local"} · solo lectura`);
  console.log(`Socios: ${m.socios} (por admisión ${m.por_admision}, existentes ${m.existentes}) · números que pasan al historial: ${m.numeros_al_historial} · duplicados (sin mayúsculas): ${m.numeros_duplicados}`);
  console.log(`Email de notificaciones → contacto: se completarían ${email.completar} · coinciden ${email.coinciden} · conflicto (se conserva persons.email) ${email.conflicto}`);
  console.log(`Estructura: migraciones aplicadas ${st.migraciones_aplicadas} · tablas nuevas ya existentes ${st.tablas_nuevas_ya_existentes} · columnas nuevas ya existentes ${st.columnas_nuevas_ya_existentes} · valor «no_informado» ya existente ${st.enum_ya_existente} · socios con campos vacíos ${st.socios_con_nulos}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
