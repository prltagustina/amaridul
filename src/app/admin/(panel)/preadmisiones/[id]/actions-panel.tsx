"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, MailPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/field";
import type { PreAdmissionStatus } from "@/server/pre-admissions";
import { preStatus } from "../../../status";
import { addNote, closePreAdmission, invite, markReviewed, type ActionResult } from "../actions";

type DialogKind = "revisada" | "invitar" | "cerrar" | null;
type Note = { id: string; text: string; at: string; author: string };

export default function PreAdmissionActions({
  id,
  reference,
  email,
  formal,
  status,
  invitation,
  closedReason,
  closeReasons,
  notes,
}: {
  id: string;
  reference: string;
  email: string;
  formal: { id: string; reference: string } | null;
  status: PreAdmissionStatus;
  invitation: { sentAt: string; expiresAt: string; expired: boolean } | null;
  closedReason: string | null;
  closeReasons: string[];
  notes: Note[];
}) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  // The server re-renders this page after each action, so status and notes come back fresh as props.
  const run = (action: () => Promise<ActionResult>, success: string, after?: () => void) =>
    startTransition(async () => {
      const r = await action();
      setDialog(null);
      if (r.ok) {
        after?.();
        setNotice({ tone: "success", text: success });
      } else setNotice({ tone: "error", text: r.error });
    });

  const s = preStatus[status];
  return (
    <aside className="order-first space-y-6 lg:order-none" aria-label="Acciones">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3">Estado</h2>
          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
        </div>
        {notice && (
          <Alert tone={notice.tone} live>
            {notice.text}
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          {status === "recibida" && (
            <Button shape="admin" variant="secondary" onClick={() => setDialog("revisada")} disabled={pending}>
              <CheckCircle2 aria-hidden className="size-4" strokeWidth={1.5} /> Marcar revisada
            </Button>
          )}
          {(status === "recibida" || status === "en-revision") && (
            <Button shape="admin" onClick={() => setDialog("invitar")} disabled={pending}>
              <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Invitar al alta formal
            </Button>
          )}
          {status === "invitada" && formal && (
            <p className="text-small text-text-muted">
              Solicitud formal recibida:{" "}
              <Link href={`/admin/admisiones/${formal.id}`} className="font-medium !text-forest underline underline-offset-2">
                {formal.reference}
              </Link>
              .
            </p>
          )}
          {status === "invitada" && !formal && (
            <>
              {invitation && (
                <p className="text-small text-text-muted">
                  Invitación enviada el {invitation.sentAt}. {invitation.expired ? `Venció el ${invitation.expiresAt}.` : `Vence el ${invitation.expiresAt}.`}
                </p>
              )}
              <Button shape="admin" variant="secondary" onClick={() => setDialog("invitar")} disabled={pending}>
                <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Reenviar invitación
              </Button>
            </>
          )}
          {status !== "cerrada" && (
            <Button shape="admin" variant="danger" onClick={() => setDialog("cerrar")} disabled={pending}>
              <XCircle aria-hidden className="size-4" strokeWidth={1.5} /> Cerrar solicitud
            </Button>
          )}
          {status === "cerrada" && (
            <p className="text-small text-text-muted">
              {closedReason ? `Motivo: ${closedReason}. ` : ""}Los datos se eliminan a los 3 meses del cierre.
            </p>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3">Notas internas</h2>
        {notes.length > 0 ? (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="!rounded-control bg-surface-sunken/60 px-3 py-2">
                <p className="text-small whitespace-pre-line">{n.text}</p>
                <p className="text-xs text-text-muted">
                  {n.author} · {n.at}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-text-muted">Todavía no hay notas.</p>
        )}
        <Textarea id="nota" label="Nueva nota" rows={3} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} hint="Visible solo para la administración. No registres datos de salud." />
        <Button shape="admin" variant="secondary" disabled={!draft.trim() || pending} loading={pending && !dialog} loadingLabel="Guardando…" onClick={() => run(() => addNote(id, draft), "Nota agregada.", () => setDraft(""))}>
          Agregar nota
        </Button>
      </Card>

      <Dialog
        open={dialog === "revisada"}
        onClose={() => setDialog(null)}
        title="Marcar como revisada"
        description={reference}
        confirmLabel="Marcar revisada"
        onConfirm={() => run(() => markReviewed(id), "Preadmisión marcada como revisada.")}
      >
        <p className="text-body text-text-muted">La solicitud pasa a “En revisión”. No se notifica a la persona.</p>
      </Dialog>
      <Dialog
        open={dialog === "invitar"}
        onClose={() => setDialog(null)}
        title={status === "invitada" ? "Reenviar invitación" : "Invitar al alta formal"}
        description={reference}
        confirmLabel={status === "invitada" ? "Reenviar" : "Enviar invitación"}
        confirmDisabled={pending}
        onConfirm={() => run(() => invite(id), `Invitación enviada a ${email}.`)}
      >
        <p className="text-body">
          Vamos a enviar un link personal a <strong className="font-medium">{email}</strong> para completar la solicitud formal de admisión.
        </p>
        <Alert tone="info">
          El link vence en 7 días.{status === "invitada" ? " El link anterior deja de funcionar." : ""} No implica la admisión: la decide la Comisión Directiva.
        </Alert>
      </Dialog>
      <Dialog
        open={dialog === "cerrar"}
        onClose={() => setDialog(null)}
        title="Cerrar solicitud"
        description={reference}
        confirmLabel="Cerrar solicitud"
        confirmVariant="danger"
        confirmDisabled={!reason || pending}
        onConfirm={() => run(() => closePreAdmission(id, reason), "Solicitud cerrada.")}
      >
        <Select id="motivo" label="Motivo" placeholder="Elegí un motivo" options={closeReasons} value={reason} onChange={(e) => setReason(e.target.value)} />
        <p className="text-small text-text-muted">Los datos se conservan 3 meses y después se eliminan.</p>
      </Dialog>
    </aside>
  );
}
