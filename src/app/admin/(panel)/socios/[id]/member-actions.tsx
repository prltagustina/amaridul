"use client";

import { useState } from "react";
import { MailPlus, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, DevTag, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/field";
import type { MemberStatus } from "@/demo/fixtures";
import { memberStatus } from "../../../status";

export default function MemberActions({ initialStatus, web }: { initialStatus: MemberStatus; web: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [dialog, setDialog] = useState<"suspender" | "reactivar" | "reenviar" | null>(null);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const s = memberStatus[status];

  return (
    <aside className="order-first space-y-6 lg:order-none" aria-label="Acciones">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h3">Estado</h2>
          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
        </div>
        <p className="text-small text-text-muted">Cuenta web: {status === "suspendido" ? "Acceso suspendido" : web}</p>
        {notice && (
          <Alert tone="success" live>
            {notice}
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          {web === "Activación pendiente" && status === "activo" && (
            <Button shape="admin" variant="secondary" onClick={() => setDialog("reenviar")}>
              <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Reenviar activación
            </Button>
          )}
          {status === "activo" && (
            <Button shape="admin" variant="danger" onClick={() => setDialog("suspender")}>
              <PauseCircle aria-hidden className="size-4" strokeWidth={1.5} /> Suspender
            </Button>
          )}
          {status === "suspendido" && (
            <Button shape="admin" onClick={() => setDialog("reactivar")}>
              <PlayCircle aria-hidden className="size-4" strokeWidth={1.5} /> Reactivar
            </Button>
          )}
          {status === "baja" && <p className="text-small text-text-muted">Socio dado de baja. Sin acciones disponibles.</p>}
        </div>
        <DevTag>Acciones simuladas</DevTag>
      </Card>

      <Dialog
        open={dialog === "suspender"}
        onClose={() => setDialog(null)}
        title="Suspender socio"
        confirmLabel="Suspender"
        confirmVariant="danger"
        confirmDisabled={!reason.trim()}
        onConfirm={() => {
          setStatus("suspendido");
          setDialog(null);
          setNotice("Socio suspendido. Se cerraron sus sesiones abiertas.");
        }}
      >
        <p className="text-body">La persona no va a poder ingresar a su espacio hasta que la reactives.</p>
        <Textarea id="motivo" label="Motivo" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} hint="Queda registrado en auditoría." />
      </Dialog>
      <Dialog
        open={dialog === "reactivar"}
        onClose={() => setDialog(null)}
        title="Reactivar socio"
        confirmLabel="Reactivar"
        onConfirm={() => {
          setStatus("activo");
          setDialog(null);
          setNotice("Socio reactivado.");
        }}
      >
        <p className="text-body">La persona va a poder volver a ingresar con su DNI y contraseña.</p>
      </Dialog>
      <Dialog
        open={dialog === "reenviar"}
        onClose={() => setDialog(null)}
        title="Reenviar link de activación"
        confirmLabel="Reenviar"
        onConfirm={() => {
          setDialog(null);
          setNotice("Link de activación reenviado. El anterior quedó anulado.");
        }}
      >
        <p className="text-body">Se envía un link nuevo al email registrado. El link anterior deja de funcionar.</p>
      </Dialog>
    </aside>
  );
}
