"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileText, FileUp, Info, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { CopyValue } from "@/components/ui/copy-value";
import { addDocumentAction, reviewDocumentAction, saveCaseAction, saveLinkCodeAction, type ReprocannResult } from "./reprocann-actions";
import { UploadDialog } from "./upload-dialog";

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
    /** Internal: only the team reads it. */
    notes: string | null;
    /** What the member reads while the document is observed. */
    memberMessage: string | null;
    createdAt: string;
    /** Sent by the member from their account. */
    fromMember: boolean;
    /** Name of who recorded it (the member or an admin). */
    recordedBy: string | null;
    replaced: boolean;
    /** One per page, in order. */
    files: { href: string; page: number; label: string; uploaded: string }[];
  }[];
  history: { at: string; actor: string; text: string }[];
  /** The current credential with the same single status the member sees. */
  credential: { statusLabel: string; statusTone: "success" | "warning" | "error" | "neutral"; expiry: string; review: "pendiente" | "observada" | "verificada" | null; source: string | null; digitized: boolean };
  /** How files can be loaded here: through this server locally, to the private store on a deployment. */
  uploads: "local" | "blob" | "unavailable";
  /** The member's «código de vinculación», in full (admins only). */
  linkCode: { code: string; sentOn: string | null; byMember: boolean } | null;
};
export type ReprocannOptions = { permit: Option[]; management: Option[]; linkage: Option[]; kind: Option[]; review: Option[]; source: Option[] };

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const label = (list: Option[], v: string | null) => list.find((o) => o.value === v)?.label ?? "—";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const reviewTone = { pendiente: "warning", observada: "error", verificada: "success" } as const;

export default function ReprocannPanel({ memberId, view, options }: { memberId: string; view: ReprocannView; options: ReprocannOptions }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const attachable = view.documents
    .filter((d) => !d.files.length && !d.replaced && d.reviewStatus !== "verificada")
    .map((d) => ({ value: d.id, label: `${label(options.kind, d.kind)} registrada el ${d.createdAt.split(",")[0]} (sin archivo)` }));
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [caseForm, setCaseForm] = useState(view.case ?? { permitStatus: "sin_permiso", managementSource: "self_or_external", responsibleName: "", linkageStatus: "pendiente" });
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingCase, setEditingCase] = useState(false);
  const [doc, setDoc] = useState({ kind: "", permitIdentifier: "", issuedOn: "", expiresOn: "", source: "en_poder_de_la_asociacion", notes: "" });
  const [docError, setDocError] = useState("");
  const [reviewing, setReviewing] = useState<{ id: string; reviewStatus: string; verifiedOn: string; expiresOn: string; memberMessage: string; notes: string } | null>(null);
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
            <StatusBadge tone={view.credential.statusTone}>{view.credential.statusLabel}</StatusBadge>
            <span className="text-small text-text-muted">{view.credential.expiry}</span>
          </div>
          {view.credential.source && (
            <p className="text-small text-text-muted">
              {label(options.source, view.credential.source)} · {view.credential.digitized ? "con archivo" : "sin archivo todavía"}
            </p>
          )}
          <p className="text-xs text-text-muted">Es el mismo estado que ve el socio. Una fecha declarada queda «sin verificar» hasta que se verifica el documento.</p>
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
          <div className="space-y-1.5 border-t border-border pt-3 text-small">
            <div className="flex items-center justify-between gap-3">
              <p className="text-text-muted">Código de vinculación</p>
              <Button
                variant="ghost"
                shape="admin"
                className="min-h-9"
                onClick={() => {
                  setLinkDraft(view.linkCode?.code ?? "");
                  setLinkError("");
                  setEditingLink(true);
                }}
              >
                <Pencil aria-hidden className="size-4" strokeWidth={1.5} /> {view.linkCode ? "Corregir" : "Cargar"}
              </Button>
            </div>
            {view.linkCode ? (
              <>
                <CopyValue label="código" value={view.linkCode.code} />
                <p className="text-xs text-text-muted">{`${view.linkCode.byMember ? "Lo envió el socio" : "Lo cargó la administración"}${view.linkCode.sentOn ? ` el ${view.linkCode.sentOn.split("-").reverse().join("/")}` : ""}. Cuando lo vincules en REPROCANN, marcá «Vinculación verificada» en Editar.`}</p>
              </>
            ) : (
              <p className="text-text-muted">Todavía no lo tenemos. El socio lo puede enviar desde su espacio, en REPROCANN.</p>
            )}
          </div>
          <p className="flex items-start gap-2 border-t border-border pt-3 text-small text-text-muted">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
            <span>Dispensa: pendiente de definición. Cargar o verificar documentos no la habilita.</span>
          </p>
        </Card>
      </div>

      <Dialog
        open={editingLink}
        onClose={() => setEditingLink(false)}
        title="Código de vinculación"
        description="Tal como figura en el «Registro de paciente» del socio. Se guarda cifrado y el cambio queda registrado; si lo dejás vacío, se quita."
        confirmLabel={pending ? "Guardando…" : "Guardar"}
        confirmDisabled={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await saveLinkCodeAction(memberId, linkDraft);
            if (!r.ok) return setLinkError(r.error);
            setEditingLink(false);
            router.refresh();
          })
        }
      >
        <TextField id="link-code-admin" label="Código de vinculación" optional autoComplete="off" spellCheck={false} maxLength={40} value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} error={linkError || undefined} className="font-mono tracking-wider" />
      </Dialog>

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
          <div className="flex flex-wrap gap-2">
            <Button shape="admin" onClick={() => setUploading(true)} disabled={view.uploads === "unavailable"}>
              <FileUp aria-hidden className="size-4" strokeWidth={1.5} /> Cargar documentación recibida
            </Button>
            <Button variant="secondary" shape="admin" onClick={() => { setAdding(true); setDocError(""); }}>
              <FilePlus2 aria-hidden className="size-4" strokeWidth={1.5} /> Registrar sin archivo
            </Button>
          </div>
        </div>
        {view.documents.length ? (
          <ul className="space-y-3">
            {view.documents.map((d) => (
              <li key={d.id} className={`space-y-2 !rounded-control border border-border px-4 py-3 ${d.replaced ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{label(options.kind, d.kind)}</p>
                  {d.replaced ? <StatusBadge tone="neutral">Reemplazado por un archivo nuevo</StatusBadge> : <StatusBadge tone={reviewTone[d.reviewStatus]}>{label(options.review, d.reviewStatus)}</StatusBadge>}
                </div>
                <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                  {d.fromMember ? `Enviado por el socio desde su cuenta · ${d.createdAt}` : `${label(options.source, d.source)} · registrado por ${d.recordedBy ?? "administración"} · ${d.createdAt}`}
                </p>
                <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                  {d.permitIdentifier ? `Identificador: ${d.permitIdentifier} · ` : ""}Emisión: {day(d.issuedOn)} · Vencimiento: {day(d.expiresOn)}
                  {d.verifiedOn ? ` · Verificado el ${day(d.verifiedOn)}` : ""}
                </p>
                {d.memberMessage && <p className="!rounded-control bg-warning-bg px-3 py-2 text-small text-warning-fg">Motivo para el socio: {d.memberMessage}</p>}
                {d.notes && <p className="text-small">Nota interna: {d.notes}</p>}
                {d.files.length > 0 && (
                  <ul className="space-y-1">
                    {d.files.map((f) => (
                      <li key={f.href} className="flex flex-wrap items-center gap-x-2 text-small">
                        <a href={f.href} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 !text-forest underline underline-offset-2">
                          <FileText aria-hidden className="size-4" strokeWidth={1.5} /> {d.files.length > 1 ? `Ver hoja ${f.page}` : "Ver archivo"} · {f.label}
                        </a>
                        <span className="text-text-muted">cargado por {f.uploaded}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {!d.replaced && (
                    <Button variant="ghost" shape="admin" className="min-h-9" onClick={() => { setReviewing({ id: d.id, reviewStatus: d.reviewStatus, verifiedOn: d.verifiedOn ?? "", expiresOn: d.expiresOn ?? "", memberMessage: d.memberMessage ?? "", notes: d.notes ?? "" }); setReviewError(""); }}>
                      Revisar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-text-muted">Todavía no hay documentos registrados.</p>
        )}
        <p className="text-small text-text-muted">
          El socio carga su credencial desde su cuenta y la asociación puede cargar la que ya recibió (PDF, JPG o PNG, hasta 10 MB por hoja). Todo queda pendiente de revisión y cada apertura de un archivo queda registrada. Cuánto tiempo se conservan los archivos todavía no está definido.
          {view.uploads === "unavailable" && " La carga de archivos no está habilitada en este entorno: falta el almacenamiento privado."}
        </p>
      </Card>
      {view.uploads !== "unavailable" && (
        <UploadDialog open={uploading} onClose={() => setUploading(false)} memberId={memberId} mode={view.uploads} kinds={options.kind} attachable={attachable} />
      )}

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
        <Textarea id="doc-notes" label="Nota interna" optional hint="Solo la ve el equipo. Sin datos clínicos." value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} maxLength={500} rows={2} />
      </Dialog>

      <Dialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title="Revisar documento"
        description="Este cambio quedará registrado. Verificado no significa habilitado para la dispensa."
        confirmLabel={pending ? "Guardando…" : "Guardar revisión"}
        confirmDisabled={pending}
        onConfirm={() => reviewing && run(() => reviewDocumentAction(memberId, reviewing.id, reviewing), "Revisión guardada.", setReviewError, () => setReviewing(null))}
        wide
      >
        {reviewError && <Alert tone="error" live>{reviewError}</Alert>}
        {reviewing && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="review-status" label="Resultado" options={options.review} value={reviewing.reviewStatus} onChange={(e) => setReviewing((r) => r && { ...r, reviewStatus: e.target.value })} />
              <TextField id="review-date" type="date" label="Fecha de verificación" optional={reviewing.reviewStatus !== "verificada"} max={today()} value={reviewing.verifiedOn} onChange={(e) => setReviewing((r) => r && { ...r, verifiedOn: e.target.value })} />
              <TextField id="review-expires" type="date" label="Vencimiento según el documento" optional hint="Si el socio lo declaró, corregilo si el documento dice otra fecha." value={reviewing.expiresOn} onChange={(e) => setReviewing((r) => r && { ...r, expiresOn: e.target.value })} />
            </div>
            {reviewing.reviewStatus === "observada" && (
              <Textarea
                id="review-message"
                label="Motivo para el socio"
                hint="Lo lee el socio en su cuenta. Decile qué tiene que corregir, sin datos clínicos."
                value={reviewing.memberMessage}
                onChange={(e) => setReviewing((r) => r && { ...r, memberMessage: e.target.value })}
                maxLength={300}
                rows={2}
              />
            )}
            <Textarea
              id="review-notes"
              label="Nota interna"
              optional
              hint="Solo la ve el equipo de la asociación. Sin datos clínicos."
              value={reviewing.notes}
              onChange={(e) => setReviewing((r) => r && { ...r, notes: e.target.value })}
              maxLength={500}
              rows={2}
            />
          </div>
        )}
      </Dialog>
    </section>
  );
}
