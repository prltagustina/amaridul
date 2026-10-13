"use client";

import { useState, useTransition } from "react";
import { Gavel, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import type { AdmissionStatus } from "@/server/admissions";
import { admissionStatus } from "../../../status";
import { elevate } from "../actions";

export default function AdmissionReview({ id, reference, status }: { id: string; reference: string; status: AdmissionStatus }) {
  const [dialog, setDialog] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const s = admissionStatus[status];

  return (
    <aside className="order-first space-y-6 lg:sticky lg:top-6 lg:order-none lg:self-start" aria-label="Estado y acciones">
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
        {status === "recibida" && (
          <Button shape="admin" full onClick={() => setDialog(true)} disabled={pending}>
            <Send aria-hidden className="size-4" strokeWidth={1.5} /> Elevar a Comisión
          </Button>
        )}
        {status === "comision" && (
          <>
            <Button shape="admin" full variant="accent" disabled aria-describedby="decision-pronto">
              <Gavel aria-hidden className="size-4" strokeWidth={1.5} /> Registrar decisión
            </Button>
            <p id="decision-pronto" className="text-small text-text-muted">
              Se habilita en la próxima etapa: al aprobar se crea el socio y se envía la activación de la cuenta.
            </p>
          </>
        )}
        {(status === "aprobada" || status === "rechazada") && <p className="text-small text-text-muted">Decisión registrada. No se puede editar; cualquier corrección queda en auditoría.</p>}
      </Card>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Elevar a Comisión Directiva"
        description={reference}
        confirmLabel="Elevar"
        confirmDisabled={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await elevate(id);
            setDialog(false);
            setNotice(r.ok ? { tone: "success", text: "Solicitud elevada a la Comisión Directiva." } : { tone: "error", text: r.error });
          })
        }
      >
        <p className="text-body">La solicitud pasa a la agenda de la próxima reunión de Comisión.</p>
      </Dialog>
    </aside>
  );
}
