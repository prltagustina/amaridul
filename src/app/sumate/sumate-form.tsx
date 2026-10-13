"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, CircleCheck, Mail } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, CheckboxGroup, RadioGroup } from "@/components/ui/choice";
import { Alert, Card, DevTag } from "@/components/ui/display";
import { Select, TextField } from "@/components/ui/field";
import { RuleList, TabbedCard } from "@/components/ui/technical";
import { interestOptions, privacySummary, provinces, reprocannOptions } from "@/demo/content";
import { submitPreAdmission } from "./actions";

type Values = {
  nombre: string;
  email: string;
  telefono: string;
  provincia: string;
  localidad: string;
  intereses: string[];
  reprocann: string;
  participacion: string;
  privacidad: boolean;
};

const empty: Values = { nombre: "", email: "", telefono: "", provincia: "", localidad: "", intereses: [], reprocann: "", participacion: "", privacidad: false };

const labels: Record<keyof Values, string> = {
  nombre: "Nombre y apellido",
  email: "Email",
  telefono: "Teléfono",
  provincia: "Provincia",
  localidad: "Localidad",
  intereses: "Qué te motiva a acercarte",
  reprocann: "Registro REPROCANN",
  participacion: "Participación",
  privacidad: "Privacidad",
};

function validate(v: Values, askReprocann: boolean) {
  const e: Partial<Record<keyof Values, string>> = {};
  if (v.nombre.trim().length < 3) e.nombre = "Escribí tu nombre y apellido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Revisá el email: tiene que tener el formato nombre@dominio.com.";
  if (v.telefono.replace(/\D/g, "").length < 8) e.telefono = "Escribí un teléfono con código de área.";
  if (!v.provincia) e.provincia = "Elegí tu provincia.";
  if (!v.localidad.trim()) e.localidad = "Escribí tu localidad.";
  if (!v.intereses.length) e.intereses = "Elegí al menos una opción.";
  if (askReprocann && !v.reprocann) e.reprocann = "Elegí una opción.";
  if (!v.participacion) e.participacion = "Elegí una opción.";
  if (!v.privacidad) e.privacidad = "Necesitamos tu conformidad para gestionar la solicitud.";
  return e;
}

export default function SumateForm({ demoState }: { demoState: "default" | "loading" | "error" | "success" }) {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    demoState === "default" ? "idle" : demoState === "loading" ? "loading" : demoState,
  );
  const summaryRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ reference: string | null; demo?: boolean }>({ reference: demoState === "success" ? "PRE-2026-0001" : null, demo: true });
  const [failure, setFailure] = useState<"validation" | "rate" | "server">("server");

  const askReprocann = values.intereses.some((i) => interestOptions.find((o) => o.value === i)?.health);
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate(values, askReprocann);
    setErrors(e);
    if (Object.keys(e).length) {
      setStatus("idle");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStatus("loading");
    submitPreAdmission(values, trapRef.current?.value ?? "")
      .then((r) => {
        if (r.ok) {
          setResult(r);
          setStatus("success");
        } else {
          setFailure(r.error);
          setStatus("error");
        }
      })
      .catch(() => {
        setFailure("server");
        setStatus("error");
      });
  }

  if (status === "success") {
    return (
      <Card className="space-y-5 py-8 text-center sm:py-9" role="status" aria-live="polite">
        <CircleCheck aria-hidden className="mx-auto size-10 text-forest" strokeWidth={1.25} />
        <div className="space-y-3">
          <h2 className="text-h2 text-forest">Recibimos tu solicitud</h2>
          {result.reference && <p className="text-eyebrow text-accent">Referencia {result.reference}</p>}
          <p className="mx-auto max-w-md text-body text-text-muted">
            El equipo de Amarí Dul va a revisarla y se va a poner en contacto con vos. Enviar la solicitud no implica la admisión como socio.
          </p>
        </div>
        <p className="mx-auto flex max-w-md items-center justify-center gap-2 text-small text-text-muted">
          <Mail aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          Te enviamos un email de confirmación con la referencia.
        </p>
        {result.demo && <DevTag>Demo · no se guardó ni envió nada</DevTag>}
        <div>
          <LinkButton href="/qr" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </Card>
    );
  }

  const errorList = Object.entries(errors) as [keyof Values, string][];

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6" aria-busy={status === "loading"}>
      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={`Revisá ${errorList.length === 1 ? "este campo" : `estos ${errorList.length} campos`}`} live>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errorList.map(([k]) => (
                <li key={k}>
                  <a href={`#${k === "intereses" || k === "reprocann" || k === "participacion" ? `${k}-group` : k}`} className="underline underline-offset-2">
                    {labels[k]}
                  </a>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      {status === "error" && (
        <Alert tone="error" title="No pudimos enviar la solicitud" live>
          {failure === "rate"
            ? "Recibimos varios envíos seguidos desde tu conexión. Esperá unos minutos y volvé a probar."
            : failure === "validation"
              ? "Revisá los datos del formulario y volvé a enviarlo."
              : "Probá de nuevo en unos minutos. Si el problema sigue, escribinos."}
        </Alert>
      )}
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Sitio web</label>
        <input ref={trapRef} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <TabbedCard tab="1. Tus datos" bodyClassName="space-y-5">
        <TextField id="nombre" label="Nombre y apellido" autoComplete="name" value={values.nombre} onChange={(e) => set("nombre", e.target.value)} error={errors.nombre} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="email" type="email" label="Email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
          <TextField
            id="telefono"
            type="tel"
            label="Teléfono"
            autoComplete="tel"
            inputMode="tel"
            hint="Con código de área."
            value={values.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            error={errors.telefono}
          />
          <Select
            id="provincia"
            label="Provincia"
            placeholder="Elegí una provincia"
            options={provinces}
            value={values.provincia}
            onChange={(e) => set("provincia", e.target.value)}
            error={errors.provincia}
          />
          <TextField id="localidad" label="Localidad" autoComplete="address-level2" value={values.localidad} onChange={(e) => set("localidad", e.target.value)} error={errors.localidad} />
        </div>
      </TabbedCard>

      <TabbedCard id="intereses-group" tab="2. Motivación" bodyClassName="space-y-6">
        <CheckboxGroup
          name="intereses"
          legend={<span className="text-xl font-title text-forest">¿Qué te motiva a acercarte a Amarí Dul?</span>}
          hint="Podés elegir más de una opción."
          options={interestOptions}
          values={values.intereses}
          onToggle={(v, checked) => set("intereses", checked ? [...values.intereses, v] : values.intereses.filter((i) => i !== v))}
          error={errors.intereses}
        />
        {askReprocann && (
          <div id="reprocann-group" className="space-y-3 border-t border-border pt-6">
            <RadioGroup
              name="reprocann"
              legend="¿Contás con registro REPROCANN?"
              hint="Solo necesitamos saber el estado. No te vamos a pedir códigos, certificados ni información médica."
              options={reprocannOptions}
              value={values.reprocann}
              onChange={(v) => set("reprocann", v)}
              error={errors.reprocann}
              inline
            />
          </div>
        )}
      </TabbedCard>

      <TabbedCard id="participacion-group" tab="3. Participación">
        <RadioGroup
          name="participacion"
          legend={<span className="text-xl font-title text-forest">¿Te gustaría participar?</span>}
          hint="¿Te gustaría participar en actividades comunitarias, educativas, científicas o institucionales?"
          options={[
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ]}
          value={values.participacion}
          onChange={(v) => set("participacion", v)}
          error={errors.participacion}
          inline
        />
      </TabbedCard>

      <TabbedCard tab="4. Privacidad" bodyClassName="space-y-4">
        <p className="text-small text-text-muted">
          {privacySummary} <DevTag>Aviso pendiente</DevTag>
        </p>
        <Checkbox
          id="privacidad"
          label="Acepto que Amarí Dul use estos datos para gestionar mi solicitud y contactarme por ella."
          checked={values.privacidad}
          onChange={(e) => set("privacidad", e.target.checked)}
          error={errors.privacidad}
        />
      </TabbedCard>

      <RuleList
        items={[
          <>
            <strong>Enviar la solicitud no implica la admisión.</strong> El equipo la revisa y, si corresponde, te invita al alta formal.
          </>,
        ]}
      />

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button type="submit" variant="join" size="lg" editorial loading={status === "loading"} loadingLabel="Enviando…" className="w-full sm:w-auto">
          Enviar solicitud <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
        </Button>
        <p className="text-small text-text-muted">Te respondemos por email.</p>
      </div>
    </form>
  );
}
