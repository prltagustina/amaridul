"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, Card, StatusBadge, type Tone } from "@/components/ui/display";
import { controlClasses } from "@/components/ui/field";
import { ACCEPT_ATTR, fileSha256, sendFile, sniffType } from "@/components/reprocann/upload-client";
import { cn } from "@/lib/cn";
import { fileSizeLabel } from "@/lib/file-size";
import type { ImportGroup } from "@/server/reprocann-files";
import { discardUploadsAction, importGroupAction, previewImportAction } from "../actions";

type Row = { file: File; dni: string; page: number; type: string; sha256: string };
const STATUS: Record<ImportGroup["status"], { label: string; tone: Tone }> = {
  confirmado: { label: "Confirmado", tone: "success" },
  existente: { label: "Ya existe", tone: "warning" },
  duplicado: { label: "Duplicado", tone: "warning" },
  ambiguo: { label: "A revisar", tone: "error" },
};
const TYPE_LABEL: Record<string, string> = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

/**
 * Import of credentials the association already holds. The review sends only, per file, the DNI the
 * admin read on the document, the page and a fingerprint computed here: the files stay on this
 * computer until the admin confirms, and only the confirmed groups are uploaded.
 */
export function ImportTool({ mode }: { mode: "local" | "blob" | "unavailable" }) {
  const picker = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [groups, setGroups] = useState<ImportGroup[] | null>(null);
  const [results, setResults] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "revisando" | "importando">("");

  async function add(list: FileList | null) {
    if (!list) return;
    const added = await Promise.all([...list].map(async (file) => ({ file, dni: "", page: 1, type: await sniffType(file), sha256: await fileSha256(file) })));
    setRows((r) => [...r, ...added]);
    setGroups(null);
    setResults({});
    if (picker.current) picker.current.value = "";
  }
  const edit = (i: number, patch: Partial<Row>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setGroups(null);
    setResults({});
  };

  async function review() {
    setError("");
    setBusy("revisando");
    const r = await previewImportAction(rows.map((x) => ({ dni: x.dni, page: x.page, sha256: x.sha256, size: x.file.size, type: x.type })));
    setBusy("");
    if (!r.ok) return setError(r.error);
    setGroups(r.groups);
  }

  async function importConfirmed() {
    if (!groups || mode === "unavailable") return;
    setBusy("importando");
    const out: Record<number, string> = {};
    for (const [gi, g] of groups.entries()) {
      if (g.status !== "confirmado" || !g.member || !g.target) continue;
      const ordered = g.rows.map((i) => rows[i]).sort((a, b) => a.page - b.page);
      const memberId = g.member.id;
      const keys: string[] = [];
      try {
        for (const row of ordered) {
          const key = `reprocann/${memberId}/${crypto.randomUUID()}`;
          await sendFile({ mode, route: "/admin/reprocann/subida" }, key, row.file);
          keys.push(key);
        }
      } catch (e) {
        // A page did not arrive: the ones that did are removed, so the document is not half loaded.
        await discardUploadsAction({ memberId, keys }).catch(() => {});
        out[gi] = `No se cargó: ${ordered.length > 1 ? `falló la hoja ${keys.length + 1}. ` : ""}${(e as Error).message} No quedó ninguna hoja guardada.`;
        setResults({ ...out });
        continue;
      }
      try {
        const res = await importGroupAction({ memberId, target: g.target.kind === "adjuntar" ? g.target.documentId : "nuevo", dni: ordered[0].dni, pages: keys, sha256: ordered.map((x) => x.sha256) });
        out[gi] = res.ok ? `Cargado: ${res.pages} ${res.pages === 1 ? "hoja" : "hojas"}, pendiente de revisión.` : `No se cargó: ${res.error}`;
      } catch {
        // Unknown result: whatever was not recorded is removed; a recorded document stays.
        await discardUploadsAction({ memberId, keys }).catch(() => {});
        out[gi] = "No pudimos confirmar la carga. Revisá la ficha del socio antes de volver a importarlo.";
      }
      setResults({ ...out });
    }
    setBusy("");
  }

  const confirmed = groups?.filter((g) => g.status === "confirmado").length ?? 0;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-h3">1. Elegí los archivos y completá cada fila</h2>
        <p className="text-small text-text-muted">
          Escribí el DNI tal como figura en cada documento: la correspondencia se comprueba con el padrón, nunca con el nombre del archivo. Si un documento tiene varias hojas, poné el mismo DNI y numerá las hojas (1, 2…).
          Los originales no se modifican.
        </p>
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-small">
              <thead className="text-left text-text-muted">
                <tr>
                  <th className="py-2 pr-3 font-normal">Archivo</th>
                  <th className="py-2 pr-3 font-normal">Tipo · tamaño</th>
                  <th className="py-2 pr-3 font-normal">DNI del documento</th>
                  <th className="py-2 pr-3 font-normal">Hoja</th>
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={`${r.sha256}-${i}`}>
                    <td className="max-w-[16rem] truncate py-2 pr-3">{r.file.name}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {TYPE_LABEL[r.type] ?? <span className="text-error-fg">No es PDF, JPG ni PNG</span>} · {fileSizeLabel(r.file.size)}
                    </td>
                    <td className="py-2 pr-3">
                      <input aria-label={`DNI del documento ${i + 1}`} inputMode="numeric" autoComplete="off" value={r.dni} onChange={(e) => edit(i, { dni: e.target.value })} className={cn(controlClasses, "w-36 py-1.5")} maxLength={12} />
                    </td>
                    <td className="py-2 pr-3">
                      <input aria-label={`Hoja del documento ${i + 1}`} type="number" min={1} max={20} value={r.page} onChange={(e) => edit(i, { page: Number(e.target.value) || 1 })} className={cn(controlClasses, "w-20 py-1.5")} />
                    </td>
                    <td className="py-2 text-right">
                      <button type="button" className="text-text-muted underline underline-offset-2" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input ref={picker} id="imp-files" type="file" multiple accept={ACCEPT_ATTR} className="peer sr-only" onChange={(e) => void add(e.target.files)} />
          <label htmlFor="imp-files" className="inline-flex min-h-11 cursor-pointer items-center !rounded-control border border-forest px-5 !text-forest hover:bg-forest-soft peer-focus-visible:outline-2 peer-focus-visible:outline-forest">
            {rows.length ? "Agregar archivos" : "Elegir archivos"}
          </label>
          <Button shape="admin" onClick={() => void review()} disabled={!rows.length || busy !== ""} loading={busy === "revisando"} loadingLabel="Revisando…">
            2. Revisar la importación
          </Button>
        </div>
        {error && (
          <Alert tone="error" live>
            {error}
          </Alert>
        )}
      </Card>

      {groups && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3">Revisión previa · no se cargó nada todavía</h2>
            <Button shape="admin" onClick={() => void importConfirmed()} disabled={!confirmed || busy !== "" || mode === "unavailable"} loading={busy === "importando"} loadingLabel="Importando…">
              3. Importar {confirmed} {confirmed === 1 ? "confirmado" : "confirmados"}
            </Button>
          </div>
          {mode === "unavailable" && <Alert tone="info">La revisión funciona, pero la carga de archivos no está habilitada en este entorno: falta el almacenamiento privado.</Alert>}
          <ul className="divide-y divide-border">
            {groups.map((g, gi) => (
              <li key={gi} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</StatusBadge>
                  <span className="font-medium">
                    {g.member ? (
                      <Link href={`/admin/socios/${g.member.id}#reprocann`} className="!text-forest underline underline-offset-2">
                        {g.member.name}
                        {g.member.number ? ` · ${g.member.number}` : ""}
                      </Link>
                    ) : (
                      "Sin socio"
                    )}
                  </span>
                  <span className="text-text-muted">DNI {g.dni}</span>
                </div>
                <p className="text-small text-text-muted">
                  {g.reason} {g.rows.length > 1 ? `${g.rows.length} hojas: ${g.rows.map((i) => rows[i]?.file.name).join(", ")}.` : `Archivo: ${rows[g.rows[0]]?.file.name}.`}
                </p>
                {results[gi] && <p className="text-small">{results[gi]}</p>}
              </li>
            ))}
          </ul>
          <p className="text-small text-text-muted">Solo se importan los confirmados. «Ya existe», «Duplicado» y «A revisar» se resuelven desde la ficha de cada socio, revisando el caso.</p>
        </Card>
      )}
    </div>
  );
}
