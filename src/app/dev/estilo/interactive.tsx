"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { Accordion } from "@/components/ui/accordion";
import { PasswordField } from "@/components/ui/password-field";
import { StepIndicator } from "@/components/ui/steps";

export function InteractiveSamples() {
  const [open, setOpen] = useState(false);
  const [radio, setRadio] = useState("si");
  const [check, setCheck] = useState(true);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
        <PasswordField id="demo-password" label="Contraseña" defaultValue="contraseña-demo" />
        <RadioGroup
          name="demo-radio"
          legend="Radio inline"
          options={[
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ]}
          value={radio}
          onChange={setRadio}
          inline
        />
        <Checkbox id="demo-check" label="Checkbox con descripción" description="Texto de ayuda debajo." checked={check} onChange={(e) => setCheck(e.target.checked)} />
        <Checkbox id="demo-check-error" label="Checkbox con error" error="Necesitamos tu confirmación." />
        <div className="flex gap-3">
          <Button onClick={() => setOpen(true)}>Abrir diálogo</Button>
        </div>
      </div>
      <div className="space-y-6">
        <StepIndicator
          steps={[
            { id: "A", label: "A. Datos personales", status: "complete" },
            { id: "B", label: "B. Contacto", status: "incomplete" },
            { id: "C", label: "C. Solicitud asociativa", status: "current" },
            { id: "D", label: "D. Identidad", status: "upcoming" },
          ]}
        />
        <Accordion
          items={[
            { id: "1", title: "Pregunta de ejemplo", content: <p className="text-body text-text-muted">Respuesta de ejemplo.</p> },
            { id: "2", title: "Otra pregunta", content: <p className="text-body text-text-muted">Cada ítem abre de forma independiente.</p> },
          ]}
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Diálogo de confirmación" description="Descripción breve" confirmLabel="Confirmar" onConfirm={() => setOpen(false)}>
        <p className="text-body">Contenido del diálogo. Escape y clic en cerrar lo cierran; el foco queda atrapado adentro.</p>
      </Dialog>
    </div>
  );
}
