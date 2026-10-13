"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Gavel, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/choice";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField } from "@/components/ui/field";
import { categoryOptions } from "@/demo/content";
import type { AdmissionStatus } from "@/server/admissions";
import { admissionStatus } from "../../../status";
import { decide, elevate } from "../actions";

type Decision = { decision: "aprobada" | "rechazada" | "diferida"; meetingDate: string; minutes: string } | null;
type Member = { id: string; memberNumber: string; accountStatus: string } | null;

const DECISION_LABEL = { aprobada: "Aprobada", rechazada: "Rechazada", diferida: "Diferida" } as const;
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

export default function AdmissionReview({
  id,
  reference,
  fullName,
  status,
  requestedCategory,
  lastDecision,
  member,
}: {
  id: string;
  reference: string;
  fullName: string;
  status: AdmissionStatus;
  requestedCategory: string;
  lastDecision: Decision;
  member: Member;
}) {
  const [dialog, setDialog] = useState<"elevar" | "decision" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState("");
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState("");
  const [category, setCategory] = useState(requestedCategory);
  const [tried, setTried] = useState(false);

  const s = admissionStatus[status];
  const errors = {
    decision: !decision ? "Elegí la decisión." : undefined,
    date: !date ? "Indicá la fecha de la reunión." : date > today() ? "La fecha no puede ser futura." : undefined,
    minutes: !minutes.trim() ? "Indicá el acta o libro y folio." : undefined,
    category: decision === "aprobada" && !category ? "Elegí la categoría aprobada." : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

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
          <Button shape="admin" full onClick={() => setDialog("elevar")} disabled={pending}>
            <Send aria-hidden className="size-4" strokeWidth={1.5} /> Elevar a Comisión
          </Button>
        )}
        {status === "comision" && (
          <>
            {lastDecision?.decision === "diferida" && (
              <p className="text-small text-text-muted">
                Diferida en la reunión del {lastDecision.meetingDate.split("-").reverse().join("/")} ({lastDecision.minutes}).
              </p>
            )}
            <Button shape="admin" full variant="accent" onClick={() => setDialog("decision")} disabled={pending}>
              <Gavel aria-hidden className="size-4" strokeWidth={1.5} /> Registrar decisión
            </Button>
          </>
        )}
        {(status === "aprobada" || status === "rechazada") && lastDecision && (
          <p className="text-small text-text-muted">
            {DECISION_LABEL[lastDecision.decision]} en la reunión del {lastDecision.meetingDate.split("-").reverse().join("/")} ({lastDecision.minutes}). No se puede editar; cualquier
            corrección queda en auditoría.
          </p>
        )}
        {member && (
          <p className="text-small">
            Socio{" "}
            <Link href={`/admin/socios/${member.id}`} className="font-medium !text-forest underline underline-offset-2">
              {member.memberNumber}
            </Link>
            {member.accountStatus === "pending_activation" ? " · activación de la cuenta pendiente" : " · cuenta activa"}
          </p>
        )}
      </Card>

      <Dialog
        open={dialog === "elevar"}
        onClose={() => setDialog(null)}
        title="Elevar a Comisión Directiva"
        description={reference}
        confirmLabel="Elevar"
        confirmDisabled={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await elevate(id);
            setDialog(null);
            setNotice(r.ok ? { tone: "success", text: "Solicitud elevada a la Comisión Directiva." } : { tone: "error", text: r.error });
          })
        }
      >
        <p className="text-body">La solicitud pasa a la agenda de la próxima reunión de Comisión.</p>
      </Dialog>

      <Dialog
        open={dialog === "decision"}
        onClose={() => setDialog(null)}
        title="Registrar decisión de Comisión Directiva"
        description={`${reference} · ${fullName}`}
        confirmLabel="Registrar decisión"
        confirmVariant={decision === "rechazada" ? "danger" : "primary"}
        confirmDisabled={pending}
        wide
        onConfirm={() => {
          setTried(true);
          if (!valid) return;
          startTransition(async () => {
            const r = await decide(id, { decision, meetingDate: date, minutes, category: decision === "aprobada" ? category : "" });
            setDialog(null);
            setNotice(r.ok ? { tone: "success", text: r.message } : { tone: "error", text: r.error });
          });
        }}
      >
        <RadioGroup
          name="decision"
          legend="Decisión"
          options={[
            { value: "aprobada", label: "Aprobada" },
            { value: "rechazada", label: "Rechazada" },
            { value: "diferida", label: "Diferida" },
          ]}
          value={decision}
          onChange={setDecision}
          error={show("decision")}
          inline
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="fecha-reunion" type="date" label="Fecha de la reunión" max={today()} value={date} onChange={(e) => setDate(e.target.value)} error={show("date")} />
          <TextField id="acta" label="Acta (libro y folio)" value={minutes} maxLength={200} onChange={(e) => setMinutes(e.target.value)} error={show("minutes")} />
        </div>
        {decision === "aprobada" && (
          <>
            <Select
              id="categoria-aprobada"
              label="Categoría aprobada"
              options={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              error={show("category")}
            />
            <Alert tone="info">Se crea el socio con su número y se le envía el link para activar la cuenta. La decisión no se puede editar después.</Alert>
          </>
        )}
        {decision === "rechazada" && <Alert tone="warning">Se cierra la solicitud y se le avisa a la persona por email. La decisión no se puede editar después.</Alert>}
        {decision === "diferida" && <Alert tone="info">La solicitud sigue en Comisión para una próxima reunión. No se notifica a la persona.</Alert>}
      </Dialog>
    </aside>
  );
}
