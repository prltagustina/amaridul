"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Info, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { addDocumentAction, reviewDocumentAction, saveCaseAction, type ReprocannResult } from "./reprocann-actions";

type Option = { value: string; label: string };
export type ReprocannView = {
  case: { permitStatus: string; managementSource: string; responsibleName: string; linkageStatus: string } | null;
  documents: {
    id: string;
    kind: string;
    permitIdentifier: string | null;
    issuedOn: string | null;
    expiresOn: string | null;
    source: string;
    reviewStatus: "pendiente" | "observada" | "verificada";
    verifiedOn: string | null;
    notes: string | null;
    createdAt: string;
  }[];
  history: { at: string; actor: string; text: string }[];
  /** The current credential, as computed on the server (validity is time; review is separate). */
  credential: { validityLabel: string; validityTone: "success" | "warning" | "error" | "neutral"; expiresOn: string | null; review: "pendiente" | "observada" | "verificada" | null; source: string | null; digitized: boolean };
};
export type ReprocannOptions = { permit: Option[]; management: Option[]; linkage: Option[]; kind: Option[]; review: Option[]; source: Option[] };

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const label = (list: Option[], v: string | null) => list.find((o) => o.value === v)?.label ?? "—";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const reviewTone = { pendiente: "warning", observada: "error", verificada: "success" } as const;

export default function ReprocannPanel({ memberId, view, options }: { memberId: string; view: ReprocannView; options: ReprocannOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [caseForm, setCaseForm] = useState(view.case ?? { permitStatus: "sin_permiso", managementSource: "self_or_external", responsibleName: "", linkageStatus: "pendiente" });
  const [adding, setAdding] = useState(false);
  const [editingCase, setEditingCase] = useState(false);
  const [doc, setDoc] = useState({ kind: "", permitIdentifier: "", issuedOn: "", expiresOn: "", source: "en_poder_de_la_asociacion", notes: "" });
  const [docError, setDocError] = useState("");
  const [reviewing, setReviewing] = useState<{ id: string; reviewStatus: string; verifiedOn: string } | null>(null);
  const [reviewError, setReviewError] = useState("");

  const run = (action: () => Promise<ReprocannResult>, success: string, onError?: (e: string) => void, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        if (onError) onError(r.error);
        else setNotice({ tone: "error", text: r.error });
        return;
      }
      after?.();
      setNotice({ tone: "success", text: success });
      router.refresh();
    });

  return (
    <section aria-labelledby="reprocann" className="space-y-4">
      <div className="space-y-1">
        <h2 id="reprocann" className="text-h2 text-forest">
          Trámites · REPROCANN
        </h2>
        <p className="text-small text-text-muted">Registro administrativo y documental. Sin datos clínicos ni claves de sistemas oficiales.</p>
      </div>
      {notice && (
        <Alert tone={notice.tone} live>
          {notice.text}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-h3">Credencial</h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={view.credential.validityTone}>{view.credential.validityLabel}</StatusBadge>
            {view.credential.expiresOn && <span className="text-small text-text-muted">vence {day(view.credential.expiresOn)}</span>}
          </div>
          <p className="text-small">
            Revisión: <b>{view.credential.review ? label(options.review, view.credential.review) : "Sin revisar"}</b>
          </p>
          {view.credential.source && (
            <p className="text-small text-text-muted">
              {label(options.source, view.credential.source)} · {view.credential.digitized ? "digitalizada" : "No digitalizada todavía"}
            </p>
          )}
          <p className="text-xs text-text-muted">La vigencia se calcula con la fecha de vencimiento. Que esté vigente no significa que esté verificada.</p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-h3">Situación</h3>
            <Button variant="ghost" shape="admin" className="min-h-9" onClick={() => setEditingCase(true)}>
              <Pencil aria-hidden className="size-4" strokeWidth={1.5} /> Editar
            </Button>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
            <div><dt className="text-text-muted">Permiso</dt><dd>{label(options.permit, caseForm.permitStatus)}</dd></div>
            <div><dt className="text-text-muted">Vinculación con Amarí Dul</dt><dd>{label(options.linkage, caseForm.linkageStatus)}</dd></div>
            <div><dt className="text-text-muted">Quién gestiona</dt><dd>{label(options.management, caseForm.managementSource)}</dd></div>
            <div><dt className="text-text-muted">Responsable</dt><dd>{caseForm.responsibleName || "—"}</dd></div>
          </dl>
          <p className="flex items-start gap-2 border-t border-border pt-3 text-small text-text-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
            <span>Dispensa: pendiente de definición. Cargar o verificar documentos no la habilita.</span>
          </p>
        </Card>
      </div>

      <Dialog
        open={editingCase}
        onClose={() => setEditingCase(false)}
        title="Situación REPROCANN"
        description="Este cambio quedará registrado."
        confirmLabel={pending ? "Guardando…" : "Guardar"}
        confirmDisabled={pending}
        onConfirm={() => run(() => saveCaseAction(memberId, caseForm), "Situación guardada.", undefined, () => setEditingCase(false))}
        wide
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="permitStatus" label="Permiso" options={options.permit} value={caseForm.permitStatus} onChange={(e) => setCaseForm((f) => ({ ...f, permitStatus: e.target.value }))} />
          <Select id="linkageStatus" label="Vinculación con Amarí Dul" options={options.linkage} value={caseForm.linkageStatus} onChange={(e) => setCaseForm((f) => ({ ...f, linkageStatus: e.target.value }))} />
          <Select id="managementSource" label="Quién gestiona" options={options.management} value={caseForm.managementSource} onChange={(e) => setCaseForm((f) => ({ ...f, managementSource: e.target.value }))} />
          <TextField id="responsibleName" label="Responsable" optional hint="Por ejemplo, el equipo médico." value={caseForm.responsibleName} onChange={(e) => setCaseForm((f) => ({ ...f, responsibleName: e.target.value }))} maxLength={120} />
        </div>
      </Dialog>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-h3">Documentación</h3>
          <Button shape="admin" onClick={() => { setAdding(true); setDocError(""); }}>
            <FilePlus2 aria-hidden className="size-4" strokeWidth={1.5} /> Registrar documento
          </Button>
        </div>
        {view.documents.length ? (
          <ul className="space-y-3">
            {view.documents.map((d) => (
              <li key={d.id} className="space-y-2 !rounded-control border border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{label(options.kind, d.kind)}</p>
                  <StatusBadge tone={reviewTone[d.reviewStatus]}>{label(options.review, d.reviewStatus)}</StatusBadge>
                </div>
                <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                  {d.permitIdentifier ? `Identificador: ${d.permitIdentifier} · ` : ""}Emisión: {day(d.issuedOn)} · Vencimiento: {day(d.expiresOn)} · Fuente: {label(options.source, d.source)}
                  {d.verifiedOn ? ` · Verificado el ${day(d.verifiedOn)}` : ""}
                </p>
                {d.notes && <p className="text-small">Observaciones: {d.notes}</p>}
                <Button variant="ghost" shape="admin" className="min-h-9" onClick={() => { setReviewing({ id: d.id, reviewStatus: d.reviewStatus, verifiedOn: d.verifiedOn ?? "" }); setReviewError(""); }}>
                  Revisar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-text-muted">Todavía no hay documentos registrados.</p>
        )}
        <p className="text-small text-text-muted">El archivo (PDF, JPG o PNG) se va a poder adjuntar cuando esté habilitado el almacenamiento privado. Por ahora se registran los datos del documento.</p>
      </Card>

      {view.history.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-h3">Historial</h3>
          <ul className="space-y-2">
            {view.history.map((h, i) => (
              <li key={i} className="text-small">
                <span className="text-text-muted">
                  {h.at} · {h.actor}
                </span>{" "}
                · {h.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Registrar documento"
        description="Queda pendiente de revisión, aunque la asociación ya lo tenga."
        confirmLabel={pending ? "Guardando…" : "Registrar"}
        confirmDisabled={pending || !doc.kind}
        onConfirm={() => run(() => addDocumentAction(memberId, doc), "Documento registrado, pendiente de revisión.", setDocError, () => { setAdding(false); setDoc({ kind: "", permitIdentifier: "", issuedOn: "", expiresOn: "", source: "en_poder_de_la_asociacion", notes: "" }); })}
        wide
      >
        {docError && <Alert tone="error" live>{docError}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Select id="doc-kind" label="Tipo de documento" placeholder="Elegí el tipo" options={options.kind} value={doc.kind} onChange={(e) => setDoc((d) => ({ ...d, kind: e.target.value }))} />
          <Select id="doc-source" label="Fuente" options={options.source} value={doc.source} onChange={(e) => setDoc((d) => ({ ...d, source: e.target.value }))} />
          <TextField id="doc-id" label="Identificador del permiso" optional hint="Como figura en la documentación oficial." value={doc.permitIdentifier} onChange={(e) => setDoc((d) => ({ ...d, permitIdentifier: e.target.value }))} maxLength={80} autoComplete="off" />
          <span />
          <TextField id="doc-issued" type="date" label="Fecha de emisión" optional max={today()} value={doc.issuedOn} onChange={(e) => setDoc((d) => ({ ...d, issuedOn: e.target.value }))} />
          <TextField id="doc-expires" type="date" label="Fecha de vencimiento" optional value={doc.expiresOn} onChange={(e) => setDoc((d) => ({ ...d, expiresOn: e.target.value }))} />
        </div>
        <Textarea id="doc-notes" label="Observaciones administrativas" optional hint="Sin datos clínicos." value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} maxLength={500} rows={2} />
      </Dialog>

      <Dialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title="Revisar documento"
        description="Este cambio quedará registrado. Verificado no significa habilitado para la dispensa."
        confirmLabel={pending ? "Guardando…" : "Guardar revisión"}
        confirmDisabled={pending}
        onConfirm={() => reviewing && run(() => reviewDocumentAction(memberId, reviewing.id, { reviewStatus: reviewing.reviewStatus, verifiedOn: reviewing.verifiedOn }), "Revisión guardada.", setReviewError, () => setReviewing(null))}
      >
        {reviewError && <Alert tone="error" live>{reviewError}</Alert>}
        {reviewing && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Select id="review-status" label="Estado" options={options.review} value={reviewing.reviewStatus} onChange={(e) => setReviewing((r) => r && { ...r, reviewStatus: e.target.value })} />
            <TextField id="review-date" type="date" label="Fecha de verificación" optional max={today()} value={reviewing.verifiedOn} onChange={(e) => setReviewing((r) => r && { ...r, verifiedOn: e.target.value })} />
          </div>
        )}
      </Dialog>
    </section>
  );
}
