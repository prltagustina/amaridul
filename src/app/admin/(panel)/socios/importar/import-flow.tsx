"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { Alert, Card, StatusBadge, type Tone } from "@/components/ui/display";
import { Button, LinkButton } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { Dialog } from "@/components/ui/dialog";
import { applyImportAction, previewImportAction, type ApplyResult, type PreviewResult } from "./actions";

const OUTCOME: Record<string, { label: string; tone: Tone }> = {
  create: { label: "Se crearía", tone: "success" },
  update: { label: "Se completaría", tone: "info" },
  match: { label: "Ya registrado", tone: "neutral" },
  skip: { label: "Omitida", tone: "neutral" },
  review: { label: "Revisión manual", tone: "warning" },
  conflict: { label: "Conflicto", tone: "error" },
};

function Figure({ label, value, tone }: { label: string; value: number; tone?: "warning" | "error" }) {
  return (
    <div className="rounded-control border border-border bg-surface px-4 py-3">
      <p className={tone === "error" && value ? "text-h3 text-error-fg" : tone === "warning" && value ? "text-h3 text-warning-fg" : "text-h3 text-forest"}>{value}</p>
      <p className="text-small text-text-muted">{label}</p>
    </div>
  );
}

export function ImportFlow() {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const form = () => {
    const f = new FormData();
    const file = input.current?.files?.[0];
    if (file) f.set("file", file);
    return f;
  };
  const review = () =>
    start(async () => {
      setApplied(null);
      setPreview(await previewImportAction(form()));
    });
  const apply = () =>
    start(async () => {
      if (!preview?.ok) return;
      const f = form();
      f.set("sha", preview.sha);
      const r = await applyImportAction(f);
      setApplied(r);
      setConfirming(false);
      if (r.ok) setPreview(null);
    });

  const s = preview?.ok ? preview.summary : null;
  const writes = s ? s.create + s.update : 0;

  return (
    <div className="space-y-8">
      <Card className="space-y-4">
        <h2 className="text-h3 text-foreground">1. Elegí el archivo</h2>
        <p className="text-small text-text-muted">La planilla de socios descargada como CSV (en Google Sheets: Archivo → Descargar → Valores separados por comas). El archivo no se guarda: se lee para la revisión y, si la aprobás, para la carga.</p>
        <div className="space-y-1.5">
          <label htmlFor="file" className="block text-label text-foreground">
            Archivo CSV
          </label>
          <input
            ref={input}
            id="file"
            type="file"
            accept=".csv,text/csv"
            onChange={() => (setPreview(null), setApplied(null))}
            className="block w-full max-w-full text-small text-text-muted file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-control file:border file:border-border file:bg-surface file:px-4 file:text-small file:text-forest"
          />
        </div>
        <Button shape="admin" onClick={review} disabled={pending} loading={pending && !confirming} loadingLabel="Revisando…">
          <FileUp aria-hidden className="size-4" strokeWidth={1.5} /> Revisar sin cargar
        </Button>
      </Card>

      {preview && !preview.ok && (
        <Alert tone="error" live>
          {preview.error}
        </Alert>
      )}
      {applied && !applied.ok && (
        <Alert tone="error" live>
          {applied.error}
        </Alert>
      )}
      {applied?.ok && (
        <Alert tone="success" live title="Importación aplicada">
          Se crearon {applied.created} socios y se completaron {applied.updated}. No se envió ningún email ni se crearon cuentas. <LinkButton href="/admin/socios" shape="admin" variant="ghost">Ver socios</LinkButton>
        </Alert>
      )}

      {preview?.ok && s && (
        <section className="space-y-6" aria-labelledby="preview-title">
          <div className="space-y-1">
            <h2 id="preview-title" className="text-h3 text-foreground">
              2. Revisión: no se cargó nada todavía
            </h2>
            <p className="text-small text-text-muted [overflow-wrap:anywhere]">
              {preview.fileName} · {s.rows} filas{preview.ignoredHeaders.length ? ` · columnas que no se usan: ${preview.ignoredHeaders.filter(Boolean).join(", ")}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Figure label="Se crearían" value={s.create} />
            <Figure label="Se completarían" value={s.update} />
            <Figure label="Ya registrados" value={s.match} />
            <Figure label="Revisión manual" value={s.review} tone="warning" />
            <Figure label="Sin DNI" value={s.withoutDni} tone="warning" />
            <Figure label="DNI inválido" value={s.invalidDni} tone="warning" />
            <Figure label="Socio/a NO" value={s.notMember} tone="warning" />
            <Figure label="DNI repetidos" value={s.duplicateDni} tone="error" />
            <Figure label="Conflictos" value={s.conflict} tone="error" />
            <Figure label="Conflictos de email" value={s.emailConflict} tone="warning" />
            <Figure label="Credenciales históricas sin archivo" value={s.historicalCredential} />
            <Figure label="Cuota: pendiente de mapeo (no se importa)" value={s.feePendingMapping} />
          </div>
          <DataList
            caption="Resultado por fila"
            rows={preview.rows}
            rowKey={(r) => String(r.line)}
            columns={[
              { key: "line", header: "Fila", render: (r) => <span className="tabular-nums">{r.line}</span> },
              { key: "name", header: "Persona", primary: true, render: (r) => r.name || "—" },
              { key: "dni", header: "DNI", render: (r) => <span className="font-mono text-[13px]">{r.dniMasked ?? "—"}</span> },
              { key: "outcome", header: "Resultado", render: (r) => <StatusBadge tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</StatusBadge> },
              {
                key: "reason",
                header: "Detalle",
                render: (r) => (
                  <div className="space-y-1 text-small">
                    <p>
                      {r.reason}
                      {r.changes?.length ? ` (${r.changes.join(", ")})` : ""}
                    </p>
                    {r.warnings.map((w) => (
                      <p key={w} className="text-text-muted">
                        {w}
                      </p>
                    ))}
                  </div>
                ),
              },
            ]}
          />
          <Card className="space-y-3">
            <h2 className="text-h3 text-foreground">3. Aplicar</h2>
            {preview.blocking ? (
              <Alert tone="error">Hay conflictos: corregilos en la planilla, descargala de nuevo y volvé a revisar.</Alert>
            ) : writes === 0 ? (
              <p className="text-small text-text-muted">No hay nada para cargar.</p>
            ) : (
              <>
                <p className="text-small text-text-muted">Se cargan solo las filas «Se crearía» y «Se completaría». Las de revisión manual quedan afuera. No se envían emails ni se crean cuentas.</p>
                <Button shape="admin" onClick={() => setConfirming(true)} disabled={pending}>
                  Aplicar importación
                </Button>
              </>
            )}
          </Card>
          <Dialog
            open={confirming}
            onClose={() => setConfirming(false)}
            title="Aplicar importación"
            description={`Se van a crear ${s.create} socios y completar ${s.update}. Este cambio quedará registrado.`}
            confirmLabel={pending ? "Aplicando…" : "Aplicar"}
            confirmDisabled={pending}
            onConfirm={apply}
          >
            <p className="text-small text-text-muted">Usamos el mismo archivo que revisaste. Si lo cambiaste, la carga se rechaza.</p>
          </Dialog>
        </section>
      )}
    </div>
  );
}
