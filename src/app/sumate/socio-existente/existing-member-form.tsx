"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CircleCheck, Mail } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Alert, Card, DevTag } from "@/components/ui/display";
import { Select, TextField } from "@/components/ui/field";
import { RuleList, TabbedCard } from "@/components/ui/technical";
import { privacySummary, provinces } from "@/demo/content";
import { openUpdateLink, submitExistingMember } from "./actions";

type Values = {
  nombres: string;
  apellidos: string;
  dni: string;
  nacimiento: string;
  email: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  cp: string;
  numeroSocio: string;
  privacidad: boolean;
  confirmacion: boolean;
};

const empty: Values = { nombres: "", apellidos: "", dni: "", nacimiento: "", email: "", domicilio: "", localidad: "", provincia: "", cp: "", numeroSocio: "", privacidad: false, confirmacion: false };

const labels: Record<keyof Values, string> = {
  nombres: "Nombre/s",
  apellidos: "Apellido/s",
  dni: "DNI",
  nacimiento: "Fecha de nacimiento",
  email: "Email",
  domicilio: "Domicilio",
  localidad: "Localidad",
  provincia: "Provincia",
  cp: "Código postal",
  numeroSocio: "Número de socio",
  privacidad: "Privacidad",
  confirmacion: "Confirmación",
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

function validate(v: Values) {
  const e: Partial<Record<keyof Values, string>> = {};
  if (v.nombres.trim().length < 2) e.nombres = "Escribí tu nombre.";
  if (v.apellidos.trim().length < 2) e.apellidos = "Escribí tu apellido.";
  const digits = v.dni.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 8) e.dni = "Escribí tu DNI: 7 u 8 números.";
  if (!v.nacimiento || v.nacimiento >= today()) e.nacimiento = "Indicá tu fecha de nacimiento.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Revisá el email: tiene que tener el formato nombre@dominio.com.";
  if (v.domicilio.trim().length < 3) e.domicilio = "Escribí tu domicilio.";
  if (!v.localidad.trim()) e.localidad = "Escribí tu localidad.";
  if (!v.provincia) e.provincia = "Elegí tu provincia.";
  if (v.cp.trim().length < 3) e.cp = "Escribí tu código postal.";
  if (!v.privacidad) e.privacidad = "Necesitamos tu conformidad para tratar tus datos.";
  if (!v.confirmacion) e.confirmacion = "Confirmá que los datos son correctos.";
  return e;
}

export default function ExistingMemberForm() {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [failure, setFailure] = useState<"validation" | "rate" | "server" | "invalid_link">("server");
  const [result, setResult] = useState<{ reference: string | null; demo?: boolean }>({ reference: null });
  const [link, setLink] = useState<{ token: string; firstName: string } | null>(null);
  const [linkProblem, setLinkProblem] = useState<"expired" | "invalid" | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);

  // A personal link (from a preadmission) completes that same request; without it, a new one is sent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
      if (!token) return;
      const v = await openUpdateLink(token);
      if (cancelled) return;
      if (v.status === "ok") {
        setLink({ token, firstName: v.firstName });
        setValues((s) => ({ ...s, email: v.email }));
      } else setLinkProblem(v.status);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = Object.fromEntries(Object.entries(validate(values)).filter(([, m]) => m)) as Partial<Record<keyof Values, string>>;
    setErrors(e);
    if (Object.keys(e).length) {
      setStatus("idle");
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStatus("loading");
    submitExistingMember(values, link?.token ?? "", trapRef.current?.value ?? "")
      .then((r) => {
        if (r.ok) {
          setResult(r);
          setStatus("success");
          if (link) history.replaceState(null, "", window.location.pathname);
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
          <h2 className="text-h2 text-forest">Recibimos tus datos</h2>
          {result.reference && <p className="text-eyebrow text-accent">Referencia {result.reference}</p>}
          <p className="mx-auto max-w-md text-body text-text-muted">
            Vamos a verificar tu información con el registro de Amarí Dul. Cuando esté lista tu cuenta, vas a recibir un email para activarla.
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

  const errorList = (Object.entries(errors) as [keyof Values, string | undefined][]).filter(([, m]) => m);

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6" aria-busy={status === "loading"}>
      {link && (
        <Alert tone="info">
          Hola, {link.firstName}. Completá tus datos para incorporarlos al sistema. No tenés que volver a asociarte.
        </Alert>
      )}
      {linkProblem && (
        <Alert tone="warning" title={linkProblem === "expired" ? "El link venció" : "El link ya no es válido"}>
          Igual podés completar tus datos acá: el equipo de Amarí Dul los va a verificar.
        </Alert>
      )}
      {errorList.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={`Revisá ${errorList.length === 1 ? "este campo" : `estos ${errorList.length} campos`}`} live>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {errorList.map(([k]) => (
                <li key={k}>
                  <a href={`#${k}`} className="underline underline-offset-2">
                    {labels[k]}
                  </a>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}
      {status === "error" && (
        <Alert tone="error" title="No pudimos enviar tus datos" live>
          {failure === "rate"
            ? "Recibimos varios envíos seguidos desde tu conexión. Esperá unos minutos y volvé a probar."
            : failure === "validation"
              ? "Revisá los datos del formulario y volvé a enviarlo."
              : failure === "invalid_link"
                ? "El link personal ya se usó o venció. Recargá la página para enviar tus datos sin el link."
                : "Probá de nuevo en unos minutos. Si el problema sigue, escribinos."}
        </Alert>
      )}
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Sitio web</label>
        <input ref={trapRef} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <TabbedCard tab="1. Tus datos" bodyClassName="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="nombres" label="Nombre/s" autoComplete="given-name" value={values.nombres} onChange={(e) => set("nombres", e.target.value)} error={errors.nombres} />
          <TextField id="apellidos" label="Apellido/s" autoComplete="family-name" value={values.apellidos} onChange={(e) => set("apellidos", e.target.value)} error={errors.apellidos} />
          <TextField id="dni" label="DNI" inputMode="numeric" autoComplete="off" hint="Sin puntos." value={values.dni} onChange={(e) => set("dni", e.target.value)} error={errors.dni} />
          <TextField id="nacimiento" type="date" label="Fecha de nacimiento" autoComplete="bday" max={today()} value={values.nacimiento} onChange={(e) => set("nacimiento", e.target.value)} error={errors.nacimiento} />
        </div>
      </TabbedCard>

      <TabbedCard tab="2. Contacto y domicilio" bodyClassName="space-y-5">
        <TextField id="email" type="email" label="Email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
        <TextField id="domicilio" label="Domicilio" autoComplete="street-address" hint="Calle, número, piso y departamento." value={values.domicilio} onChange={(e) => set("domicilio", e.target.value)} error={errors.domicilio} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="localidad" label="Localidad" autoComplete="address-level2" value={values.localidad} onChange={(e) => set("localidad", e.target.value)} error={errors.localidad} />
          <Select id="provincia" label="Provincia" placeholder="Elegí una provincia" options={provinces} value={values.provincia} onChange={(e) => set("provincia", e.target.value)} error={errors.provincia} />
          <TextField id="cp" label="Código postal" autoComplete="postal-code" value={values.cp} onChange={(e) => set("cp", e.target.value)} error={errors.cp} />
        </div>
      </TabbedCard>

      <TabbedCard tab="3. Tu número de socio" bodyClassName="space-y-4">
        <TextField id="numeroSocio" label="Número de socio" optional hint="Si lo conocés." autoComplete="off" value={values.numeroSocio} onChange={(e) => set("numeroSocio", e.target.value)} error={errors.numeroSocio} />
      </TabbedCard>

      <TabbedCard tab="4. Privacidad y confirmación" bodyClassName="space-y-4">
        <p className="text-small text-text-muted">
          {privacySummary} <DevTag>Aviso pendiente</DevTag>
        </p>
        <Checkbox
          id="privacidad"
          label="Acepto que Amarí Dul use estos datos para actualizar mi legajo de socio y gestionar mi acceso digital."
          checked={values.privacidad}
          onChange={(e) => set("privacidad", e.target.checked)}
          error={errors.privacidad}
        />
        <Checkbox id="confirmacion" label="Confirmo que los datos que cargué son correctos." checked={values.confirmacion} onChange={(e) => set("confirmacion", e.target.checked)} error={errors.confirmacion} />
      </TabbedCard>

      <RuleList
        items={[
          <>
            <strong>No es una nueva solicitud de admisión.</strong> El equipo de Amarí Dul verifica tus datos con el registro de la asociación y, cuando estén confirmados, te envía el acceso.
          </>,
        ]}
      />

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button type="submit" variant="join" size="lg" editorial loading={status === "loading"} loadingLabel="Enviando…" className="w-full sm:w-auto">
          Enviar mis datos <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
        </Button>
        <p className="text-small text-text-muted">Te responderemos por email.</p>
      </div>
    </form>
  );
}
