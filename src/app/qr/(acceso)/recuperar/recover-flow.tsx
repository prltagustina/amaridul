"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, MailCheck, MailWarning } from "lucide-react";
import { Button, LinkButton, TextLink } from "@/components/ui/button";
import { Card, DevTag, EmptyState } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { NewPasswordForm } from "../new-password-form";

type Step = "default" | "enviado" | "nueva" | "expired" | "success";

export default function RecoverFlow({ initial }: { initial: Step }) {
  const [step, setStep] = useState<Step>(initial);
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!/^\d{7,8}$/.test(dni.replace(/\D/g, ""))) return setError("Escribí tu DNI, sin puntos.");
    setError("");
    setLoading(true);
    window.setTimeout(() => setStep("enviado"), 700);
  }

  if (step === "enviado") {
    return (
      <EmptyState
        icon={<MailCheck aria-hidden className="size-10" strokeWidth={1.25} />}
        title="Revisá tu email"
        description="Si el DNI corresponde a una cuenta activa, te enviamos un link para crear una contraseña nueva. Vence en 30 minutos."
        action={
          <div className="flex flex-col items-center gap-3">
            <Button variant="secondary" onClick={() => setStep("nueva")}>
              Simular link del email
            </Button>
            <DevTag>Demo · no se envió ningún email</DevTag>
          </div>
        }
      />
    );
  }

  if (step === "expired") {
    return (
      <EmptyState
        icon={<MailWarning aria-hidden className="size-10" strokeWidth={1.25} />}
        title="El link venció o ya se usó"
        description="Pedí uno nuevo. Por seguridad, cada link sirve una sola vez."
        action={
          <Button variant="secondary" onClick={() => setStep("default")}>
            Pedir un link nuevo
          </Button>
        }
      />
    );
  }

  if (step === "success") {
    return (
      <EmptyState
        icon={<CircleCheck aria-hidden className="size-10" strokeWidth={1.25} />}
        title="Listo, actualizamos tu contraseña"
        description="Cerramos las sesiones abiertas en otros dispositivos."
        action={<LinkButton href="/qr/login">Ingresar</LinkButton>}
      />
    );
  }

  if (step === "nueva") {
    return (
      <div className="space-y-8">
        <header className="space-y-2 text-center">
          <p className="text-eyebrow text-accent">Socios</p>
          <h1 className="text-h1 text-brand">Creá una contraseña nueva</h1>
        </header>
        <NewPasswordForm submitLabel="Guardar contraseña" onDone={() => setStep("success")} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-eyebrow text-accent">Socios</p>
        <h1 className="text-h1 text-brand">Recuperá tu contraseña</h1>
        <p className="text-body text-text-muted">Escribí tu DNI. Te enviamos un link al email registrado en la asociación.</p>
      </header>
      <Card>
        <form noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
          <TextField id="dni" label="DNI" inputMode="numeric" autoComplete="username" hint="Sin puntos." value={dni} onChange={(e) => setDni(e.target.value)} error={error} />
          <Button type="submit" full size="lg" loading={loading} loadingLabel="Enviando…">
            Enviar link
          </Button>
        </form>
      </Card>
      <p className="text-center text-small text-text-muted">
        ¿Cambiaste de email? Escribinos y lo actualizamos. <TextLink href="/qr/login">Volver al ingreso</TextLink>
      </p>
    </div>
  );
}
