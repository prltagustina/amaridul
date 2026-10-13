"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, TextLink } from "@/components/ui/button";
import { Alert, DevTag } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { TabbedCard } from "@/components/ui/technical";
import { AccessShell } from "../access-shell";
import { memberLogin } from "../actions";

type DemoState = "default" | "loading" | "error" | "expired" | "disabled";

// Same message for unknown DNI, wrong password or blocked account: never reveal which one failed.
const GENERIC_ERROR = "El DNI o la contraseña no son correctos. Revisalos y probá de nuevo.";

export default function MemberLoginForm({ demoState }: { demoState: DemoState }) {
  const router = useRouter();
  const [dni, setDni] = useState(demoState === "error" ? "99000099" : "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ dni?: string; password?: string }>({});
  const [formError, setFormError] = useState(demoState === "error" ? GENERIC_ERROR : "");
  const [loading, setLoading] = useState(demoState === "loading");
  const alertRef = useRef<HTMLDivElement>(null);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: typeof fieldErrors = {};
    if (!/^\d{7,8}$/.test(dni.replace(/\D/g, ""))) e.dni = "Revisá tu DNI: tiene 7 u 8 números.";
    if (!password) e.password = "Escribí tu contraseña.";
    setFieldErrors(e);
    setFormError("");
    if (Object.keys(e).length) return;
    setLoading(true);
    const r = await memberLogin(dni, password).catch(() => ({ ok: false as const, error: "generic" as const }));
    if (r.ok) {
      router.push("/qr/mi-espacio");
      router.refresh();
      return;
    }
    setLoading(false);
    setFormError(r.error === "rate" ? "Demasiados intentos. Esperá unos minutos y volvé a probar." : GENERIC_ERROR);
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  return (
    <AccessShell eyebrow="Socios" title="Ingresá a tu espacio" description="Con tu DNI y la contraseña que creaste al activar tu cuenta." tab="Acceso" back={{ href: "/qr", label: "Inicio" }}>

      {demoState === "expired" && (
        <Alert tone="warning" title="Tu sesión terminó">
          Por seguridad cerramos la sesión después de un tiempo sin actividad. Ingresá de nuevo.
        </Alert>
      )}
      {demoState === "disabled" && (
        <Alert tone="warning" title="Demasiados intentos">
          Esperá unos minutos antes de volver a intentar, o recuperá tu contraseña.
        </Alert>
      )}
      {formError && (
        <div ref={alertRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" live>
            {formError}
          </Alert>
        </div>
      )}

      <TabbedCard tab="Ingreso con DNI">
        <form noValidate onSubmit={onSubmit} className="space-y-4" aria-busy={loading}>
          <TextField
            id="dni"
            label="DNI"
            inputMode="numeric"
            autoComplete="username"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            error={fieldErrors.dni}
            disabled={demoState === "disabled"}
          />
          <PasswordField
            id="password"
            label="Contraseña"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={demoState === "disabled"}
          />
          <Button type="submit" full size="lg" loading={loading} loadingLabel="Ingresando…" disabled={demoState === "disabled"}>
            Ingresar <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
          </Button>
          <p className="text-center text-small">
            <TextLink href="/qr/recuperar" className="inline-flex min-h-11 items-center">Olvidé mi contraseña</TextLink>
          </p>
        </form>
      </TabbedCard>

      <p className="text-center text-small text-text-muted">
        ¿Todavía no sos socio? <TextLink href="/sumate" className="inline-flex min-h-11 items-center">Sumate a la comunidad</TextLink>
      </p>
      <p>
        <DevTag>Local: ingresá con el DNI de un socio activado</DevTag>
      </p>
    </AccessShell>
  );
}
