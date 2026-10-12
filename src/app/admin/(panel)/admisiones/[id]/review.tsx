"use client";

import { useState } from "react";
import { Check, CircleDashed, Gavel, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/choice";
import { DetailList } from "@/components/ui/data-list";
import { Alert, Card, DevTag, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { categoryOptions } from "@/demo/content";
import type { AdmissionStatus, admissions } from "@/demo/fixtures";
import { cn } from "@/lib/cn";
import { admissionStatus } from "../../../status";

type Admission = (typeof admissions)[number];

const SECTIONS: { id: string; title: string; items: (a: Admission) => { label: string; value: string }[] }[] = [
  { id: "A", title: "Datos personales", items: (a) => [{ label: "Nombre", value: a.name }, { label: "DNI", value: "99.000.0••" }, { label: "Nacionalidad", value: "Argentina" }, { label: "Domicilio", value: "Calle Ficticia 123, Santa Fe" }] },
  { id: "B", title: "Contacto", items: () => [{ label: "Email", value: "persona.ficticia@example.com" }, { label: "Teléfono", value: "+54 9 000 000-0000" }] },
  { id: "C", title: "Solicitud asociativa", items: (a) => [{ label: "Categoría solicitada", value: a.category }, { label: "Obligaciones", value: "Aceptadas" }] },
  { id: "D", title: "Acreditación de identidad", items: () => [{ label: "Método", value: "Pendiente de definición institucional" }] },
  { id: "E", title: "Estatuto y reglamentos", items: () => [{ label: "Aceptación", value: "Aceptado" }] },
  { id: "F", title: "Cuota social", items: () => [{ label: "Toma de conocimiento", value: "Informada" }] },
  { id: "G", title: "Declaraciones", items: () => [{ label: "Veracidad y cambios", value: "Declaradas" }] },
  { id: "H", title: "Protección de datos", items: () => [{ label: "Tratamiento", value: "Aceptado" }, { label: "Novedades", value: "No" }] },
  { id: "I", title: "Confirmación", items: () => [{ label: "Modalidad", value: "Pendiente de validación" }] },
];

export default function AdmissionReview({ admission, openDecision }: { admission: Admission; openDecision: boolean }) {
  const [status, setStatus] = useState<AdmissionStatus>(openDecision ? "comision" : admission.status);
  const [dialog, setDialog] = useState<"elevar" | "decision" | null>(openDecision ? "decision" : null);
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(categoryOptions.find((c) => c.label === admission.category)?.value ?? "");
  const [minutes, setMinutes] = useState("");
  const [tried, setTried] = useState(false);

  const s = admissionStatus[status];
  const decisionErrors = {
    decision: !decision ? "Elegí la decisión." : undefined,
    date: !date ? "Indicá la fecha de la reunión." : undefined,
    minutes: !minutes.trim() ? "Indicá el acta o libro y folio." : undefined,
    category: decision === "aprobada" && !category ? "Elegí la categoría aprobada." : undefined,
  };
  const decisionValid = !Object.values(decisionErrors).some(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        {SECTIONS.map((sec, i) => {
          const complete = i < admission.progress;
          return (
            <Card key={sec.id} className={cn("space-y-4", !complete && "border-dashed bg-transparent")}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-h3">
                  <span className={cn("flex size-7 items-center justify-center !rounded-full text-xs font-medium", complete ? "bg-forest text-white" : "border border-border-strong text-text-muted")}>
                    {sec.id}
                  </span>
                  {sec.title}
                </h2>
                {complete ? (
                  <span className="flex items-center gap-1 text-small text-success-fg">
                    <Check aria-hidden className="size-4" strokeWidth={2} /> Completo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-small text-text-muted">
                    <CircleDashed aria-hidden className="size-4" strokeWidth={1.5} /> Pendiente
                  </span>
                )}
              </div>
              {complete && <DetailList items={sec.items(admission)} />}
            </Card>
          );
        })}
      </div>

      <aside className="order-first space-y-6 lg:sticky lg:top-6 lg:order-none lg:self-start" aria-label="Estado y acciones">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3">Estado</h2>
            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
          </div>
          <p className="text-small text-text-muted">Avance: {admission.progress} de 9 pasos.</p>
          {notice && (
            <Alert tone="success" live>
              {notice}
            </Alert>
          )}
          {status === "borrador" && <p className="text-small text-text-muted">La persona todavía está completando la solicitud.</p>}
          {status === "recibida" && (
            <Button shape="admin" full onClick={() => setDialog("elevar")}>
              <Send aria-hidden className="size-4" strokeWidth={1.5} /> Elevar a Comisión
            </Button>
          )}
          {status === "comision" && (
            <Button shape="admin" full variant="accent" onClick={() => setDialog("decision")}>
              <Gavel aria-hidden className="size-4" strokeWidth={1.5} /> Registrar decisión
            </Button>
          )}
          {(status === "aprobada" || status === "rechazada") && <p className="text-small text-text-muted">Decisión registrada. No se puede editar; cualquier corrección queda en auditoría.</p>}
          <DevTag>Acciones simuladas</DevTag>
        </Card>
      </aside>

      <Dialog
        open={dialog === "elevar"}
        onClose={() => setDialog(null)}
        title="Elevar a Comisión Directiva"
        description={admission.reference}
        confirmLabel="Elevar"
        onConfirm={() => {
          setStatus("comision");
          setDialog(null);
          setNotice("Solicitud elevada a la Comisión Directiva.");
        }}
      >
        <p className="text-body">La solicitud queda bloqueada para edición y pasa a la agenda de la próxima reunión de Comisión.</p>
      </Dialog>

      <Dialog
        open={dialog === "decision"}
        onClose={() => setDialog(null)}
        title="Registrar decisión de Comisión Directiva"
        description={`${admission.reference} · ${admission.name}`}
        confirmLabel="Registrar decisión"
        confirmVariant={decision === "rechazada" ? "danger" : "primary"}
        wide
        onConfirm={() => {
          setTried(true);
          if (!decisionValid) return;
          if (decision === "diferida") {
            setNotice("Decisión diferida registrada. La solicitud sigue en Comisión.");
          } else {
            setStatus(decision as AdmissionStatus);
            setNotice(decision === "aprobada" ? "Admisión aprobada. Se envió el link de activación de la cuenta." : "Rechazo registrado. Se notificó a la persona.");
          }
          setDialog(null);
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
          error={tried ? decisionErrors.decision : undefined}
          inline
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="fecha" type="date" label="Fecha de la reunión" value={date} onChange={(e) => setDate(e.target.value)} error={tried ? decisionErrors.date : undefined} />
          {decision === "aprobada" && (
            <Select
              id="categoria"
              label="Categoría aprobada"
              placeholder="Elegí"
              options={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              error={tried ? decisionErrors.category : undefined}
            />
          )}
        </div>
        <TextField id="acta" label="Acta (libro y folio)" placeholder="Libro 1, folio 00" value={minutes} onChange={(e) => setMinutes(e.target.value)} error={tried ? decisionErrors.minutes : undefined} />
        <Textarea id="observaciones" label="Observaciones" optional rows={3} />
        {decision === "aprobada" && <Alert tone="info">Al registrar la aprobación se asigna número de socio y se envía el link para activar la cuenta.</Alert>}
        {decision === "rechazada" && <Alert tone="warning">La persona recibe un email con la decisión. Los datos se conservan según la política de retención.</Alert>}
      </Dialog>
    </div>
  );
}
