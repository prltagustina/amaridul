"use client";

import { useState } from "react";
import { CheckCircle2, MailPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, DevTag, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/field";
import type { PreAdmissionStatus } from "@/demo/fixtures";
import { preStatus } from "../../../status";

type DialogKind = "revisada" | "invitar" | "cerrar" | null;

export default function PreAdmissionActions({ reference, email, initialStatus }: { reference: string; email: string; initialStatus: PreAdmissionStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<{ at: string; text: string }[]>([{ at: "09/10/2026 12:10", text: "Primer contacto por WhatsApp." }]);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");

  const done = (next: PreAdmissionStatus, message: string) => {
    setStatus(next);
    setDialog(null);
    setNotice(message);
  };

  const s = preStatus[status];
  return (
    <aside className="order-first space-y-6 lg:order-none" aria-label="Acciones">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3">Estado</h2>
          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
        </div>
        {notice && (
          <Alert tone="success" live>
            {notice}
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          {status === "recibida" && (
            <Button shape="admin" variant="secondary" onClick={() => setDialog("revisada")}>
              <CheckCircle2 aria-hidden className="size-4" strokeWidth={1.5} /> Marcar revisada
            </Button>
          )}
          {(status === "recibida" || status === "en-revision") && (
            <Button shape="admin" onClick={() => setDialog("invitar")}>
              <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Invitar al alta formal
            </Button>
          )}
          {status === "invitada" && <p className="text-small text-text-muted">Invitación enviada. Vence a los 7 días.</p>}
          {status !== "cerrada" && (
            <Button shape="admin" variant="danger" onClick={() => setDialog("cerrar")}>
              <XCircle aria-hidden className="size-4" strokeWidth={1.5} /> Cerrar solicitud
            </Button>
          )}
          {status === "cerrada" && <p className="text-small text-text-muted">Los datos se eliminan a los 3 meses del cierre.</p>}
        </div>
        <DevTag>Acciones simuladas</DevTag>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3">Notas internas</h2>
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.at + n.text} className="!rounded-control bg-surface-sunken/60 px-3 py-2">
              <p className="text-small">{n.text}</p>
              <p className="text-xs text-text-muted">{n.at}</p>
            </li>
          ))}
        </ul>
        <Textarea id="nota" label="Nueva nota" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} hint="Visible solo para la administración. No registres datos de salud." />
        <Button
          shape="admin"
          variant="secondary"
          disabled={!draft.trim()}
          onClick={() => {
            setNotes((n) => [...n, { at: new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }), text: draft.trim() }]);
            setDraft("");
          }}
        >
          Agregar nota
        </Button>
      </Card>

      <Dialog
        open={dialog === "revisada"}
        onClose={() => setDialog(null)}
        title="Marcar como revisada"
        description={reference}
        confirmLabel="Marcar revisada"
        onConfirm={() => done("en-revision", "Preadmisión marcada como revisada.")}
      >
        <p className="text-body text-text-muted">La solicitud pasa a “En revisión”. No se notifica a la persona.</p>
      </Dialog>
      <Dialog
        open={dialog === "invitar"}
        onClose={() => setDialog(null)}
        title="Invitar al alta formal"
        description={reference}
        confirmLabel="Enviar invitación"
        onConfirm={() => done("invitada", `Invitación enviada a ${email}.`)}
      >
        <p className="text-body">
          Vamos a enviar un link personal a <strong className="font-medium">{email}</strong> para completar la solicitud formal de admisión.
        </p>
        <Alert tone="info">El link vence en 7 días y se puede reenviar. No implica la admisión: la decide la Comisión Directiva.</Alert>
      </Dialog>
      <Dialog
        open={dialog === "cerrar"}
        onClose={() => setDialog(null)}
        title="Cerrar solicitud"
        description={reference}
        confirmLabel="Cerrar solicitud"
        confirmVariant="danger"
        confirmDisabled={!reason}
        onConfirm={() => done("cerrada", "Solicitud cerrada.")}
      >
        <Select
          id="motivo"
          label="Motivo"
          placeholder="Elegí un motivo"
          options={["Sin respuesta", "No continúa con el proceso", "No corresponde", "Duplicada"]}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-small text-text-muted">Los datos se conservan 3 meses y después se eliminan.</p>
      </Dialog>
    </aside>
  );
}
