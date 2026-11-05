"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, FilePlus2, FileUp, Pencil, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Alert, Card, StatusBadge, type Tone } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { CopyValue } from "@/components/ui/copy-value";
import { DocumentThumbnails } from "@/components/reprocann/document-thumbnails";
import { addDocumentAction, reviewDocumentAction, saveCaseAction, saveLinkCodeAction, withdrawDuplicateAction, withdrawNotThisMemberAction, type ReprocannResult } from "./reprocann-actions";
import { UploadDialog } from "./upload-dialog";

type Option = { value: string; label: string };
type ReviewStatus = "pendiente" | "observada" | "verificada";
export type ReprocannDocumentView = {
  id: string;
  /** How it reads in a list, to tell repeated ones apart: «credencial que envió el socio el …». */
  label: string;
  kind: string;
  /** Part of the active documentation: neither replaced nor withdrawn. */
  active: boolean;
  /** A credential or certificate: what counts as the member's credential. */
  credential: boolean;
  /** The credential in force right now (the most recent active one). */
  inForce: boolean;
  permitIdentifier: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  source: string;
  reviewStatus: ReviewStatus;
  verifiedOn: string | null;
  /** Who saved the last review, and when. */
  reviewed: { at: string; by: string } | null;
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
  /** Withdrawn: by whom, when, why, and for a duplicate the document kept instead. */
  withdrawn: { at: string; by: string; reason: "duplicado" | "otro_socio"; kept: string | null } | null;
  /** For an active credential: what withdrawing it would leave in force. */
  ifWithdrawn: { inForce: string | null; statusLabel: string; statusTone: "success" | "warning" | "error" | "neutral"; loses: boolean } | null;
  /** One per page, in order. */
  files: { href: string; page: number; label: string; uploaded: string; image: boolean }[];
};
export type ReprocannView = {
  case: { permitStatus: string; managementSource: string; responsibleName: string; linkageStatus: string } | null;
  documents: ReprocannDocumentView[];
  history: { at: string; actor: string; text: string }[];
  /** The current credential with the same single status the member sees. */
  credential: { statusLabel: string; statusTone: "success" | "warning" | "error" | "neutral"; expiry: string; review: ReviewStatus | null; source: string | null; digitized: boolean };
  /** How files can be loaded here: through this server locally, to the private store on a deployment. */
  uploads: "local" | "blob" | "unavailable";
  /** The member's «código de vinculación» REPROCANN, in full (admins only). */
  linkCode: { code: string; sentOn: string | null; byMember: boolean } | null;
};
export type ReprocannOptions = { permit: Option[]; management: Option[]; linkage: Option[]; kind: Option[]; review: Option[]; source: Option[] };

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const label = (list: Option[], v: string | null) => list.find((o) => o.value === v)?.label ?? "—";
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const reviewTone: Record<ReviewStatus, Tone> = { pendiente: "warning", observada: "error", verificada: "success" };

type Review = { id: string; reviewStatus: ReviewStatus; verifiedOn: string; expiresOn: string; memberMessage: string; notes: string };
const reviewOf = (d: ReprocannDocumentView): Review => ({ id: d.id, reviewStatus: d.reviewStatus, verifiedOn: d.verifiedOn ?? "", expiresOn: d.expiresOn ?? "", memberMessage: d.memberMessage ?? "", notes: d.notes ?? "" });
type ReviewErrors = Partial<Record<"verifiedOn" | "expiresOn" | "memberMessage", string>>;

/** The pages of a document as thumbnails (a photo, or a PDF's first page); each opens the whole file in a new tab. */
function DocumentFiles({ files, size = "sm" }: { files: ReprocannDocumentView["files"]; size?: "sm" | "md" | "lg" }) {
  if (!files.length) return <p className="text-small text-text-muted">Sin archivo: registrado a partir de la documentación en poder de la asociación.</p>;
  const uploaded = [...new Set(files.map((f) => f.uploaded))];
  return (
    <div className="space-y-2">
      <DocumentThumbnails size={size} pages={files.map((f) => ({ href: f.href, page: f.page, pdf: !f.image, caption: f.label }))} />
      <p className="text-small text-text-muted">Cargado por {uploaded.join(" · ")}</p>
    </div>
  );
}

/** What a document is, at a glance: enough to recognise it and tell it from a repeated one. */
function DocumentSummary({ d, options }: { d: ReprocannDocumentView; options: ReprocannOptions }) {
  return (
    <div className="space-y-2 !rounded-control border border-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{capital(d.label)}</p>
        {d.inForce && <StatusBadge tone="brand">Vigente</StatusBadge>}
        <StatusBadge tone={reviewTone[d.reviewStatus]}>{label(options.review, d.reviewStatus)}</StatusBadge>
      </div>
      <p className="text-small text-text-muted [overflow-wrap:anywhere]">
        Vencimiento{d.reviewStatus === "verificada" ? "" : " sin verificar"}: {day(d.expiresOn)}
        {d.verifiedOn ? ` · verificada el ${day(d.verifiedOn)}` : ""}
        {d.reviewed ? ` · revisó ${d.reviewed.by} el ${d.reviewed.at}` : ""}
      </p>
      <DocumentFiles files={d.files} size="lg" />
    </div>
  );
}

export default function ReprocannPanel({ memberId, member, openReview, view, options }: { memberId: string; member: { name: string; number: string | null }; openReview: string | null; view: ReprocannView; options: ReprocannOptions }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const attachable = view.documents
    .filter((d) => !d.files.length && d.active && d.reviewStatus !== "verificada")
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
  // From the review queue, «?revisar=<document>» opens that document's review right away.
  const [reviewing, setReviewing] = useState<Review | null>(() => {
    const d = openReview ? view.documents.find((x) => x.id === openReview && x.active) : undefined;
    return d ? reviewOf(d) : null;
  });
  const [reviewError, setReviewError] = useState("");
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const [withdrawing, setWithdrawing] = useState<{ id: string; kept: string; compared: boolean } | null>(null);
  const [withdrawError, setWithdrawError] = useState("");
  // Withdrawing a document that is someone else's: the admin confirms they opened it.
  const [notMine, setNotMine] = useState<{ id: string; opened: boolean } | null>(null);
  const [notMineError, setNotMineError] = useState("");

  const activeCredentials = view.documents.filter((d) => d.active && d.credential);
  const reviewed = reviewing ? view.documents.find((d) => d.id === reviewing.id) : undefined;
  const withdrawn = withdrawing ? view.documents.find((d) => d.id === withdrawing.id) : undefined;
  const notMineDoc = notMine ? view.documents.find((d) => d.id === notMine.id) : undefined;
  const keepOptions = withdrawing ? activeCredentials.filter((d) => d.id !== withdrawing.id) : [];

  const startReview = (d: ReprocannDocumentView) => {
    setReviewing(reviewOf(d));
    setReviewError("");
    setReviewErrors({});
  };
  const startWithdrawal = (d: ReprocannDocumentView) => {
    const others = activeCredentials.filter((x) => x.id !== d.id);
    setWithdrawing({ id: d.id, kept: others.length === 1 ? others[0].id : "", compared: false });
    setWithdrawError("");
  };

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

  const saveReview = () => {
    if (!reviewing || !reviewed) return;
    const errors: ReviewErrors = {};
    if (reviewing.reviewStatus === "verificada" && !reviewing.verifiedOn) errors.verifiedOn = "Indicá la fecha de verificación.";
    if (reviewing.verifiedOn && reviewing.verifiedOn > today()) errors.verifiedOn = "La fecha de verificación no puede ser posterior a hoy.";
    if (reviewing.reviewStatus === "verificada" && reviewed.credential && !reviewing.expiresOn) errors.expiresOn = "Indicá el vencimiento que figura en la credencial: sin él no se puede seguir su vigencia.";
    if (reviewing.reviewStatus === "observada" && !reviewing.memberMessage.trim()) errors.memberMessage = "Escribí qué tiene que corregir el socio: es lo que va a leer en su cuenta.";
    setReviewErrors(errors);
    if (Object.keys(errors).length) return;
    run(() => reviewDocumentAction(memberId, reviewing.id, reviewing), "Revisión guardada. El socio ya ve el resultado en su espacio.", setReviewError, () => setReviewing(null));
  };

  return (
    <section aria-labelledby="reprocann" className="scroll-mt-6 space-y-4">
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
              <p className="text-text-muted">Código de vinculación REPROCANN</p>
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
                <p className="text-xs text-text-muted">{`${view.linkCode.byMember ? "Lo envió el socio" : "Lo cargó la administración"}${view.linkCode.sentOn ? ` el ${view.linkCode.sentOn.split("-").reverse().join("/")}` : ""}. Tener el código no es la vinculación: cuando la hagas en REPROCANN, marcá «Vinculación verificada» en Editar.`}</p>
              </>
            ) : (
              <p className="text-text-muted">Todavía no lo tenemos. El socio lo puede enviar desde su espacio, en REPROCANN, o se carga acá si lo pasa por otro medio.</p>
            )}
          </div>
        </Card>
      </div>

      <Dialog
        open={editingLink}
        onClose={() => setEditingLink(false)}
        title="Código de vinculación REPROCANN"
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
        <TextField id="link-code-admin" label="Código de vinculación REPROCANN" optional autoComplete="off" spellCheck={false} maxLength={40} value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} error={linkError || undefined} className="font-mono tracking-wider" />
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
        {activeCredentials.length > 1 && (
          <Alert tone="warning" title={`Hay ${activeCredentials.length} credenciales activas`}>
            Cuenta la más reciente (marcada «Vigente»). Si una está repetida, abrí los archivos, comparalos y usá «Retirar duplicado» en la que sobra: no se borra, queda en el historial.
          </Alert>
        )}
        {view.documents.length ? (
          <ul className="space-y-3">
            {view.documents.map((d) => (
              <li key={d.id} id={`documento-${d.id}`} className={`scroll-mt-24 space-y-2 !rounded-control border border-border px-4 py-3 ${d.active ? "" : "opacity-75"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{label(options.kind, d.kind)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {d.inForce && <StatusBadge tone="brand">Vigente</StatusBadge>}
                    {d.withdrawn ? (
                      <StatusBadge tone="neutral">{d.withdrawn.reason === "otro_socio" ? "Retirado · no es de este socio" : "Retirado · duplicado"}</StatusBadge>
                    ) : d.replaced ? (
                      <StatusBadge tone="neutral">Reemplazado por un archivo nuevo</StatusBadge>
                    ) : (
                      <StatusBadge tone={reviewTone[d.reviewStatus]}>{label(options.review, d.reviewStatus)}</StatusBadge>
                    )}
                  </div>
                </div>
                <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                  {d.fromMember ? `Enviado por el socio desde su cuenta · ${d.createdAt}` : `${label(options.source, d.source)} · registrado por ${d.recordedBy ?? "administración"} · ${d.createdAt}`}
                </p>
                <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                  {d.permitIdentifier ? `Identificador: ${d.permitIdentifier} · ` : ""}Emisión: {day(d.issuedOn)} · Vencimiento: {day(d.expiresOn)}
                  {d.verifiedOn ? ` · Verificado el ${day(d.verifiedOn)}` : ""}
                  {d.reviewed ? ` · Revisó ${d.reviewed.by} el ${d.reviewed.at}` : ""}
                </p>
                {d.withdrawn && (
                  <p className="text-small text-text-muted [overflow-wrap:anywhere]">
                    {d.withdrawn.reason === "otro_socio"
                      ? `Retirado por ${d.withdrawn.by} el ${d.withdrawn.at}: no era de este socio.`
                      : `Retirado por duplicado por ${d.withdrawn.by} el ${d.withdrawn.at}. Se conservó: ${d.withdrawn.kept ?? "otro documento"}.`}
                  </p>
                )}
                {d.memberMessage && d.active && <p className="!rounded-control bg-warning-bg px-3 py-2 text-small text-warning-fg">Motivo para el socio: {d.memberMessage}</p>}
                {d.notes && <p className="text-small">Nota interna: {d.notes}</p>}
                {d.files.length > 0 && <DocumentFiles files={d.files} />}
                {d.active && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Button variant="ghost" shape="admin" className="min-h-9" onClick={() => startReview(d)}>
                      Revisar
                    </Button>
                    {d.ifWithdrawn && activeCredentials.length > 1 && (
                      <Button variant="ghost" shape="admin" className="min-h-9" onClick={() => startWithdrawal(d)}>
                        <Archive aria-hidden className="size-4" strokeWidth={1.5} /> Retirar duplicado
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      shape="admin"
                      className="min-h-9"
                      onClick={() => {
                        setNotMine({ id: d.id, opened: false });
                        setNotMineError("");
                      }}
                    >
                      <UserX aria-hidden className="size-4" strokeWidth={1.5} /> No es de este socio
                    </Button>
                  </div>
                )}
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
          <span aria-hidden className="hidden sm:block" />
          <TextField id="doc-issued" type="date" label="Fecha de emisión" optional max={today()} value={doc.issuedOn} onChange={(e) => setDoc((d) => ({ ...d, issuedOn: e.target.value }))} />
          <TextField id="doc-expires" type="date" label="Fecha de vencimiento" optional value={doc.expiresOn} onChange={(e) => setDoc((d) => ({ ...d, expiresOn: e.target.value }))} />
        </div>
        <Textarea id="doc-notes" label="Nota interna" optional hint="Solo la ve el equipo. Sin datos clínicos." value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} maxLength={500} rows={2} />
      </Dialog>

      <Dialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title="Revisar documento"
        description="Queda registrado quién revisó y cuándo. Verificar la credencial es una de las tres condiciones para la dispensa, no la habilitación."
        confirmLabel={pending ? "Guardando…" : "Guardar revisión"}
        confirmDisabled={pending}
        onConfirm={saveReview}
        wide
      >
        {reviewError && <Alert tone="error" live>{reviewError}</Alert>}
        {reviewing && reviewed && (
          <>
            <div className="space-y-2">
              <p className="text-small text-text-muted">
                Socio: <span className="font-medium text-foreground">{member.name}</span>
                {member.number ? ` · N.º ${member.number}` : " · número a confirmar"}
              </p>
              <DocumentSummary d={reviewed} options={options} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                id="review-status"
                label="Resultado"
                options={options.review}
                value={reviewing.reviewStatus}
                onChange={(e) => {
                  const reviewStatus = e.target.value as ReviewStatus;
                  setReviewing((r) => r && { ...r, reviewStatus, verifiedOn: reviewStatus === "verificada" && !r.verifiedOn ? today() : r.verifiedOn });
                  setReviewErrors({});
                }}
              />
              <TextField
                id="review-date"
                type="date"
                label="Fecha de verificación"
                optional={reviewing.reviewStatus !== "verificada"}
                max={today()}
                value={reviewing.verifiedOn}
                onChange={(e) => setReviewing((r) => r && { ...r, verifiedOn: e.target.value })}
                error={reviewErrors.verifiedOn}
              />
              <TextField
                id="review-expires"
                type="date"
                label="Vencimiento según el documento"
                optional={!(reviewing.reviewStatus === "verificada" && reviewed.credential)}
                hint={reviewing.reviewStatus === "verificada" && reviewed.credential ? "Necesario para verificar: la vigencia se controla con esta fecha." : "Si el socio lo declaró, corregilo si el documento dice otra fecha."}
                value={reviewing.expiresOn}
                onChange={(e) => setReviewing((r) => r && { ...r, expiresOn: e.target.value })}
                error={reviewErrors.expiresOn}
              />
            </div>
            {reviewing.reviewStatus === "observada" && (
              <Textarea
                id="review-message"
                label="Motivo para el socio"
                hint="Lo lee el socio en su cuenta. Decile qué tiene que corregir, sin datos clínicos."
                value={reviewing.memberMessage}
                onChange={(e) => setReviewing((r) => r && { ...r, memberMessage: e.target.value })}
                error={reviewErrors.memberMessage}
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
          </>
        )}
      </Dialog>

      <Dialog
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        title="Retirar duplicado"
        description="Sale de la documentación activa del socio, pero no se borra: queda en el historial con sus archivos, y se registra quién lo retiró y cuál se conservó."
        confirmLabel={pending ? "Retirando…" : "Retirar duplicado"}
        confirmVariant="danger"
        confirmDisabled={pending || !withdrawing?.kept || !withdrawing?.compared}
        onConfirm={() => withdrawing && run(() => withdrawDuplicateAction(memberId, withdrawing.id, withdrawing.kept), "Duplicado retirado. La credencial vigente ya se recalculó para el socio.", setWithdrawError, () => setWithdrawing(null))}
        wide
      >
        {withdrawError && <Alert tone="error" live>{withdrawError}</Alert>}
        {withdrawing && withdrawn && (
          <>
            <div className="space-y-2">
              <h3 className="text-label text-foreground">Vas a retirar</h3>
              <DocumentSummary d={withdrawn} options={options} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-label text-foreground">Se conserva</legend>
              {keepOptions.map((k) => (
                <label key={k.id} className="flex cursor-pointer items-start gap-3 !rounded-control has-[:checked]:outline-2 has-[:checked]:outline-forest">
                  <input type="radio" name="kept" value={k.id} checked={withdrawing.kept === k.id} onChange={() => setWithdrawing((w) => w && { ...w, kept: k.id })} className="mt-4 ml-1 size-4 shrink-0 accent-[var(--forest)]" />
                  <span className="min-w-0 flex-1">
                    <DocumentSummary d={k} options={options} />
                  </span>
                </label>
              ))}
            </fieldset>
            {withdrawn.ifWithdrawn && (
              <Alert tone={withdrawn.ifWithdrawn.loses ? "warning" : "info"} title="Después del retiro">
                {withdrawn.ifWithdrawn.inForce ? `Queda vigente: ${withdrawn.ifWithdrawn.inForce}. El estado de la credencial pasa a «${withdrawn.ifWithdrawn.statusLabel}».` : "El socio queda sin credencial vigente."}
                {withdrawn.ifWithdrawn.loses && " Deja de cumplirse la condición de la credencial para la dispensa."}
              </Alert>
            )}
            <Checkbox
              id="withdraw-compared"
              label="Abrí y comparé los archivos: este es el repetido."
              checked={withdrawing.compared}
              onChange={(e) => setWithdrawing((w) => w && { ...w, compared: e.target.checked })}
            />
          </>
        )}
      </Dialog>

      <Dialog
        open={notMine !== null}
        onClose={() => setNotMine(null)}
        title="Retirar: no es de este socio"
        description="Para un documento de otra persona cargado en esta cuenta. Sale de la documentación de este socio, que ya no lo abre; lo que esté en la cuenta de la otra persona no cambia. No se borra: queda en el historial con sus archivos y quién lo retiró."
        confirmLabel={pending ? "Retirando…" : "Retirar"}
        confirmVariant="danger"
        confirmDisabled={pending || !notMine?.opened}
        onConfirm={() => notMine && run(() => withdrawNotThisMemberAction(memberId, notMine.id), "Documento retirado. La credencial vigente ya se recalculó para el socio.", setNotMineError, () => setNotMine(null))}
        wide
      >
        {notMineError && <Alert tone="error" live>{notMineError}</Alert>}
        {notMine && notMineDoc && (
          <>
            <div className="space-y-2">
              <h3 className="text-label text-foreground">Vas a retirar</h3>
              <DocumentSummary d={notMineDoc} options={options} />
            </div>
            {notMineDoc.ifWithdrawn && (
              <Alert tone={notMineDoc.ifWithdrawn.loses ? "warning" : "info"} title="Después del retiro">
                {notMineDoc.ifWithdrawn.inForce ? `Queda vigente: ${notMineDoc.ifWithdrawn.inForce}. El estado de la credencial pasa a «${notMineDoc.ifWithdrawn.statusLabel}».` : "El socio queda sin credencial vigente."}
                {notMineDoc.ifWithdrawn.loses && " Deja de cumplirse la condición de la credencial para la dispensa."}
              </Alert>
            )}
            <Checkbox
              id="withdraw-not-mine"
              label="Abrí el archivo: es de otra persona."
              checked={notMine.opened}
              onChange={(e) => setNotMine((w) => w && { ...w, opened: e.target.checked })}
            />
          </>
        )}
      </Dialog>
    </section>
  );
}
