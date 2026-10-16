// Historical member register import. Dry run by default; writes only with --apply.
//   npm run import:legacy-members -- --file /ruta/socios.csv            (informe, no escribe)
//   npm run import:legacy-members -- --file /ruta/socios.csv --apply    (aplica, sin enviar emails)
// The CSV stays on this computer: it is read here and never copied into the database or the repo.
import { readFileSync } from "node:fs";
import { analyse, applyImport, mapRows, parseCsv } from "@/server/legacy-import";
import { arg, flag, scriptContext } from "./lib/context";

const LABEL = { create: "Se crearía", update: "Se completaría", match: "Ya registrado", skip: "Omitida", review: "Revisión manual", conflict: "Conflicto" } as const;

async function main() {
  const file = arg("file");
  if (!file) throw new Error("Falta --file /ruta/al/archivo.csv");
  const content = readFileSync(file, "utf8");
  const { env, db, rings } = await scriptContext();
  const { rows, ignoredHeaders, missing } = mapRows(parseCsv(content));
  if (missing.length) throw new Error(`Faltan columnas obligatorias: ${missing.join(", ")}`);

  const { results, summary, blocking } = await analyse(db, rings, rows);
  console.log(`\nPadrón histórico · ${flag("apply") ? "APLICAR" : "DRY RUN (no se escribe nada)"} · base ${env.DATABASE_URL ? "Postgres" : "local"}`);
  if (ignoredHeaders.length) console.log(`Columnas que no se usan: ${ignoredHeaders.join(", ")}`);
  console.log(
    [
      `Filas: ${summary.rows}`,
      `Se crearían: ${summary.create} · Se completarían: ${summary.update} · Ya registrados sin cambios: ${summary.match}`,
      `Revisión manual: ${summary.review} (sin DNI ${summary.withoutDni}, DNI inválido ${summary.invalidDni}, Socio/a NO ${summary.notMember}, persona sin membresía ${summary.personWithoutMember})`,
      `Conflictos: ${summary.conflict} (DNI repetidos ${summary.duplicateDni}) · Omitidas: ${summary.skip}`,
      `Emails: ${summary.emailConflict} en conflicto (no se cargan, revisión manual) · ${summary.repeatedEmail} repetidos en el archivo`,
      `Credenciales históricas sin archivo migrado: ${summary.historicalCredential} (en poder de la asociación, revisión pendiente, sin link)`,
      `Cuota (fecha de alta / medio de pago): ${summary.feePendingMapping} filas con datos · Pendiente de mapeo institucional, no se importa`,
    ].join("\n"),
  );
  console.log("\nFila  Resultado        DNI           Persona · Motivo");
  for (const r of results) {
    console.log(`${String(r.line).padEnd(5)} ${LABEL[r.outcome].padEnd(16)} ${(r.dniMasked ?? "—").padEnd(13)} ${r.name || "—"} · ${r.reason}${r.changes?.length ? ` (${r.changes.join(", ")})` : ""}${r.warnings.length ? ` · ⚠ ${r.warnings.join("; ")}` : ""}`);
  }

  if (!flag("apply")) {
    console.log(`\n${blocking ? "Hay conflictos: corregilos en el archivo antes de aplicar." : "Para aplicar, repetí el comando con --apply."} No se envía ningún email.`);
    process.exit(0);
  }
  if (blocking) throw new Error("No se aplica: hay conflictos graves.");
  const out = await applyImport(db, rings, { name: file, content });
  console.log(`\nAplicado. Corrida ${out.runId}: ${out.created} creados, ${out.updated} completados. No se envió ningún email.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
