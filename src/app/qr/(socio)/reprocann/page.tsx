import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { Alert, DevTag, Panel, StatusBadge, type Tone } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { credentialStatus, expiryLine } from "@/lib/credential-validity";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { currentMember } from "@/server/member-session";
import { memberReprocann, type PortalDocument } from "@/server/member-portal";
import { memberFolder } from "@/server/reprocann-files";
import { memberLinkage } from "@/server/reprocann-link";
import { DocumentThumbnails } from "@/components/reprocann/document-thumbnails";
import { LINKAGE_TEXT, linkageState } from "@/lib/dispensing";
import { LinkCodeForm } from "./link-code-form";
import { uploadMode } from "@/server/storage";
import UploadForm from "./upload-form";

export const metadata: Metadata = { title: "REPROCANN | Amarí Dul" };

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const REVIEW_TONE: Record<PortalDocument["review"], Tone> = { pendiente: "warning", observada: "error", verificada: "success" };

/** The pages of a document as thumbnails; each one opens the whole file in a new tab. */
function FileLinks({ files, size = "md" }: { files: PortalDocument["files"]; size?: "sm" | "md" }) {
  return <DocumentThumbnails size={size} pages={files.map((f) => ({ href: `/qr/reprocann/archivo/${f.id}`, page: f.page, pdf: f.pdf }))} />;
}

/** A previous document: replaced, older, recorded by the association, or withdrawn (repeated, or not theirs). */
function HistoryItem({ d }: { d: PortalDocument }) {
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">{d.kindLabel}</p>
        <p className="text-sm text-text-muted">
          {d.fromMember ? `La enviaste el ${day(d.sentOn)}` : `La cargó la asociación el ${day(d.sentOn)}`}
          {d.expiresOn ? ` · vence ${day(d.expiresOn)}` : ""}
        </p>
        {d.withdrawn && <p className="text-sm text-text-muted">{d.withdrawn === "otro_socio" ? "La asociación la retiró porque no era tuya." : "La asociación la retiró porque estaba repetida."}</p>}
        {d.files.length > 0 && <FileLinks files={d.files} size="sm" />}
      </div>
      {d.withdrawn ? <StatusBadge tone="neutral">Retirada</StatusBadge> : d.replaced ? <StatusBadge tone="neutral">Reemplazada</StatusBadge> : <StatusBadge tone={REVIEW_TONE[d.review]}>{d.reviewLabel}</StatusBadge>}
    </li>
  );
}

export default async function ReprocannPage() {
  const m = await currentMember();
  if (m !== "demo" && m.status !== "activo") redirect("/qr/mi-espacio");
  const reprocann = m === "demo" ? null : await memberReprocann(await getDb(), getKeyrings().field, m.id);
  const linkage = m === "demo" ? { verified: false, sentOn: null, masked: null } : await memberLinkage(await getDb(), getKeyrings().field, m.id);
  const mode = uploadMode();
  const link = linkageState({ verified: linkage.verified, codeReceived: !!linkage.masked });
  const current = reprocann?.credential ?? null;
  const status = reprocann?.status ?? credentialStatus(null);
  const history = (reprocann?.documents ?? []).filter((d) => d.id !== current?.id);
  // The member corrects what they sent and is still under review: the new file replaces it.
  const replacing = !!current && current.fromMember && current.review !== "verificada";
  const formTitle = { none: "Cargar mi credencial", pending: replacing ? "Reemplazar el archivo" : "Enviar una credencial nueva", observed: "Corregir y reemplazar", expired: "Cargar la credencial nueva", expiring: "Cargar la renovación", verified: "Cargar una credencial nueva" }[status.key];
  // The date the association already has is offered only while it is still ahead.
  const knownExpiry = current?.expiresOn && status.expiry?.validity.state !== "expired" ? current.expiresOn : null;

  // On a phone the upload comes right after the credential when there is something to send.
  const needsUpload = ["none", "observed", "expired", "expiring"].includes(status.key);

  return (
    <main>
      <PageBand compact tone="magenta" eyebrow="REPROCANN" title="Tu REPROCANN" description="Tu código de vinculación y tu credencial." back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} width="wide" />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="portal-column grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
          <Panel
            id="vinculacion"
            tone="magenta"
            title="Código de vinculación"
            actions={<StatusBadge tone={LINKAGE_TEXT[link].member.tone}>{LINKAGE_TEXT[link].member.status}</StatusBadge>}
            className="order-1 min-w-0 lg:col-start-1 lg:row-start-1"
            bodyClassName="space-y-4"
          >
            <p className="measure text-[0.9375rem] leading-relaxed text-text-muted">
              {link === "received" ? (
                <>
                  Recibimos tu código <span className="font-mono tracking-wider text-forest">{linkage.masked}</span> el {day(linkage.sentOn)}.
                  <br />
                  La asociación está haciendo la vinculación en REPROCANN.
                </>
              ) : link === "verified" ? (
                LINKAGE_TEXT.verified.member.help
              ) : (
                "La asociación necesita este código para gestionar tu vinculación con Amarí Dul en REPROCANN."
              )}
            </p>
            {!linkage.verified && <LinkCodeForm canSend={m !== "demo"} correcting={!!linkage.masked} />}
            {!linkage.verified && (
              <Link href="/qr/ayuda#codigo-de-vinculacion" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium !text-forest !underline underline-offset-4">
                ¿Dónde lo encuentro? <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </Link>
            )}
          </Panel>

          <Panel id="credencial" tone="magenta" title="Tu credencial" actions={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>} className="order-2 min-w-0 lg:col-start-1 lg:row-start-2" bodyClassName="space-y-5">
            {current ? (
              <p className="text-[0.9375rem] text-foreground">
                {expiryLine(status.expiry)}
                <span className="text-text-muted"> · {current.fromMember ? `la enviaste el ${day(current.sentOn)}` : `la cargó la asociación el ${day(current.sentOn)}`}</span>
              </p>
            ) : (
              <p className="measure text-[0.9375rem] leading-relaxed text-text-muted">
                {reprocann?.managedByAssociation ? "La asociación gestiona tu trámite con el equipo médico. Cuando salga tu credencial, la carga la asociación o la cargás vos." : "Todavía no hay una credencial tuya. Si ya la tenés, cargala para que la revisemos."}
              </p>
            )}
            {current?.memberMessage && (
              <Alert tone="warning" title="Qué hay que corregir">
                {current.memberMessage}
              </Alert>
            )}
            {current && current.files.length > 0 && <FileLinks files={current.files} />}
            {reprocann && (
              <dl className="grid gap-x-8 gap-y-3 border-t border-mist-line pt-4 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <dt className="text-sm text-text-muted">Situación del permiso</dt>
                  <dd className="text-foreground">{reprocann.permit}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-sm text-text-muted">Quién gestiona</dt>
                  <dd className="text-foreground">{reprocann.management}</dd>
                </div>
              </dl>
            )}
          </Panel>

          <Panel id="cargar" tone="magenta" title={formTitle} className={cn("min-w-0 lg:col-start-2 lg:row-span-3 lg:row-start-1", needsUpload ? "order-3" : "order-4")} bodyClassName="space-y-5">
            {m === "demo" ? (
              <DevTag>Demo sin sesión: ingresá con un socio de prueba para cargar un archivo</DevTag>
            ) : mode === "unavailable" ? (
              <Alert tone="info">La carga de documentación todavía no está disponible. Mientras tanto, comunicate con la asociación.</Alert>
            ) : (
              <UploadForm mode={mode} folder={memberFolder(m.id)} replacing={replacing} knownExpiry={knownExpiry} />
            )}
          </Panel>


          {history.length > 0 && (
            <Panel id="historial" title="Historial" className="order-5 min-w-0 lg:col-start-1 lg:row-start-3">
              <ul className="divide-y divide-mist-line">
                {history.map((d) => (
                  <HistoryItem key={d.id} d={d} />
                ))}
              </ul>
            </Panel>
          )}
          <p className="order-6 text-sm text-text-muted lg:col-start-1">
            Que la credencial esté verificada es una de las tres condiciones para la dispensa.
            <br />
            <Link href="/qr/mi-espacio#tramites" className="font-medium !text-forest !underline underline-offset-4">
              Ver las tres en Mi espacio
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
