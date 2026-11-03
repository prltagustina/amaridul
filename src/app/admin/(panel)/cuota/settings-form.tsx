"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Alert } from "@/components/ui/display";
import { Select, TextField } from "@/components/ui/field";
import { saveReminderSettingsAction, type SettingsValues } from "./actions";

export function SettingsForm({ initial, allowed, frequencies }: { initial: SettingsValues; allowed: boolean; frequencies: { value: string; label: string }[] }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsValues, string>>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof SettingsValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const save = () =>
    start(async () => {
      setMessage(null);
      const r = await saveReminderSettingsAction(values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setMessage({ tone: "error", text: r.error });
        return;
      }
      setMessage({ tone: "success", text: "Configuración guardada." });
      router.refresh();
    });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {message && (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-3">
        <Select id="rem-frequency" label="Cada cuánto" options={frequencies} value={values.frequency} onChange={set("frequency")} error={errors.frequency} />
        <TextField id="rem-day" type="number" inputMode="numeric" min={1} max={28} label="Desde el día" hint="Del 1 al 28." value={values.dayOfMonth} onChange={set("dayOfMonth")} error={errors.dayOfMonth} />
        <TextField id="rem-hour" type="number" inputMode="numeric" min={0} max={23} label="Desde la hora" hint="Hora de Argentina, de 0 a 23." value={values.hour} onChange={set("hour")} error={errors.hour} />
      </div>
      <Checkbox
        id="rem-enabled"
        label="Enviar el recordatorio automáticamente"
        description={allowed ? "Sale una vez por período a los socios activos con email." : "No disponible en este entorno: el envío automático está apagado."}
        checked={values.enabled}
        disabled={!allowed}
        error={errors.enabled}
        onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))}
      />
      <Button type="submit" shape="admin" loading={pending} loadingLabel="Guardando…">
        Guardar configuración
      </Button>
    </form>
  );
}
