import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { DetailList } from "@/components/ui/data-list";
import { Alert, DevTag, StatusBadge, type Tone } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { credentialStatus, expiryLine } from "@/lib/credential-validity";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { currentMember } from "@/server/member-session";
import { memberReprocann, type PortalDocument } from "@/server/member-portal";
import { memberFolder } from "@/server/reprocann-files";
import { uploadMode } from "@/server/storage";
import UploadForm from "./upload-form";

export const metadata: Metadata = { title: "REPROCANN | Amarí Dul" };

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const REVIEW_TONE: Record<PortalDocument["review"], Tone> = { pendiente: "warning", observada: "error", verificada: "success" };

/** Links to the pages of a document: one "Ver mi documento" or one per page. */
function FileLinks({ files, label = "Ver mi documento" }: { files: PortalDocument["files"]; label?: string }) {
  if (!files.length) return null;
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1">
      {files.map((f) => (
        <a key={f.id} href={`/qr/reprocann/archivo/${f.id}`} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 text-small !text-forest underline underline-offset-2">
          <FileText aria-hidden className="size-4" strokeWidth={1.5} /> {files.length > 1 ? `Ver hoja ${f.page}` : label}
        </a>
      ))}
    </p>
  );
}

/** A previous document: replaced, older, or recorded by the association. */
function HistoryItem({ d }: { d: PortalDocument }) {
  return (
    <li className="space-y-1.5 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{d.kindLabel}</p>
        {d.replaced ? <StatusBadge tone="neutral">Reemplazado</StatusBadge> : <StatusBadge tone={REVIEW_TONE[d.review]}>{d.reviewLabel}</StatusBadge>}
      </div>
      <p className="text-small text-text-muted">
        {d.fromMember ? `Lo enviaste el ${day(d.sentOn)}` : `Cargado por la asociación el ${day(d.sentOn)}`}
        {d.expiresOn ? ` · vencimiento ${day(d.expiresOn)}` : ""}
      </p>
      <FileLinks files={d.files} label="Ver documento" />
    </li>
  );
}

export default async function ReprocannPage() {
  const m = await currentMember();
  if (m !== "demo" && m.status !== "activo") redirect("/qr/mi-espacio");
  const reprocann = m === "demo" ? null : await memberReprocann(await getDb(), getKeyrings().field, m.id);
  const mode = uploadMode();
  const current = reprocann?.credential ?? null;
  const status = reprocann?.status ?? credentialStatus(null);
  const history = (reprocann?.documents ?? []).filter((d) => d.id !== current?.id);
  // The member corrects what they sent and is still under review: the new file replaces it.
  const replacing = !!current && current.fromMember && current.review !== "verificada";
  const formTitle = { none: "Cargar mi credencial", pending: replacing ? "Reemplazar el archivo" : "Enviar una credencial nueva", observed: "Corregir y reemplazar", expired: "Cargar la credencial nueva", expiring: "Cargar la renovación", verified: "Cargar una credencial nueva" }[status.key];
  // The date the association already has is offered only while it is still ahead.
  const knownExpiry = current?.expiresOn && status.expiry?.validity.state !== "expired" ? current.expiresOn : null;

  return (
    <main>
      <PageBand
        compact
        tone="sand"
        eyebrow="REPROCANN"
        title="Tu credencial REPROCANN"
        description="Cargala, mirá su estado y corregila si te lo piden."
        tab="Documentación"
        back={{ href: "/qr/mi-espacio", label: "Mi espacio" }}
        width="wide"
      />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          <div className="grid items-start gap-x-6 gap-y-8 lg:grid-cols-2">
            <TabbedCard tab="Tu credencial" tone="sand" className="min-w-0 lg:col-start-1 lg:row-start-1" bodyClassName="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                {current && <span className="text-small text-text-muted">{expiryLine(status.expiry)}</span>}
              </div>
              {!current && (
                <p className="text-[0.9375rem] leading-relaxed text-text-muted">
                  {reprocann?.managedByAssociation ? "La asociación gestiona tu trámite con el equipo médico. Si ya tenés tu credencial, podés cargarla: es opcional." : "Todavía no hay una credencial tuya en el sistema. Si ya la tenés, cargala desde acá."}
                </p>
              )}
              {current?.memberMessage && (
                <div className="!rounded-control bg-warning-bg px-4 py-3 text-small text-warning-fg">
                  <p className="font-medium">Qué hay que corregir</p>
                  <p className="mt-1">{current.memberMessage}</p>
                </div>
              )}
              {current && (
                <>
                  <p className="text-small text-text-muted">{current.fromMember ? `La enviaste el ${day(current.sentOn)}.` : `La cargó la asociación el ${day(current.sentOn)}.`}</p>
                  <FileLinks files={current.files} />
                </>
              )}
              {reprocann && (
                <div className="border-t border-mist-line pt-4">
                  <DetailList
                    items={[
                      { label: "Situación del permiso", value: reprocann.permit },
                      { label: "Quién gestiona", value: reprocann.management },
                    ]}
                  />
                </div>
              )}
            </TabbedCard>

            <TabbedCard tab={formTitle} tone="sand" id="cargar" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1" bodyClassName="space-y-5">
              {m === "demo" ? (
                <DevTag>Demo sin sesión: ingresá con un socio de prueba para cargar un archivo</DevTag>
              ) : mode === "unavailable" ? (
                <Alert tone="info">La carga de documentación todavía no está disponible. Mientras tanto, comunicate con la asociación.</Alert>
              ) : (
                <UploadForm mode={mode} folder={memberFolder(m.id)} replacing={replacing} knownExpiry={knownExpiry} />
              )}
            </TabbedCard>

            {history.length > 0 && (
              <TabbedCard tab="Historial" tone="sand" className="min-w-0 lg:col-start-1 lg:row-start-2" bodyClassName="space-y-4">
                <ul className="divide-y divide-mist-line">
                  {history.map((d) => (
                    <HistoryItem key={d.id} d={d} />
                  ))}
                </ul>
              </TabbedCard>
            )}
          </div>
          <p className="mt-8 text-small text-text-muted">Que la credencial esté verificada no cambia tu membresía ni habilita por sí sola la entrega de productos.</p>
        </div>
      </div>
    </main>
  );
}
