"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, TextLink } from "@/components/ui/button";
import { Alert, Card, DevTag } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { FolderTabs } from "@/components/ui/technical";

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

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: typeof fieldErrors = {};
    if (!/^\d{7,8}$/.test(dni.replace(/\D/g, ""))) e.dni = "Escribí tu DNI, sin puntos.";
    if (!password) e.password = "Escribí tu contraseña.";
    setFieldErrors(e);
    setFormError("");
    if (Object.keys(e).length) return;
    setLoading(true);
    // Demo only: no credentials are checked. 99000099 shows the generic error.
    window.setTimeout(() => {
      if (dni.replace(/\D/g, "") === "99000099") {
        setLoading(false);
        setFormError(GENERIC_ERROR);
        requestAnimationFrame(() => alertRef.current?.focus());
        return;
      }
      router.push("/qr/mi-espacio");
    }, 700);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-eyebrow text-accent">Socios</p>
        <h1 className="text-h1 text-brand">Ingresá a tu espacio</h1>
        <p className="text-body text-text-muted">Con tu DNI y la contraseña que creaste al activar tu cuenta.</p>
      </header>

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

      <div>
      <FolderTabs />
      <Card className="shadow-[0_18px_40px_-30px_rgba(70,53,119,0.5)]">
        <form noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
          <TextField
            id="dni"
            label="DNI"
            inputMode="numeric"
            autoComplete="username"
            hint="Sin puntos."
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
      </Card>
      </div>

      <p className="text-center text-small text-text-muted">
        ¿Todavía no sos socio? <TextLink href="/sumate" className="inline-flex min-h-11 items-center">Sumate a la comunidad</TextLink>
      </p>
      <p className="text-center">
        <DevTag>Demo · cualquier DNI entra · 99000099 muestra error</DevTag>
      </p>
    </div>
  );
}
