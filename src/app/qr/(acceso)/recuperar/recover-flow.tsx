"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, MailCheck, MailWarning } from "lucide-react";
import { Button, LinkButton, TextLink } from "@/components/ui/button";
import { DevTag, EmptyState } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { TabbedCard } from "@/components/ui/technical";
import { AccessShell } from "../access-shell";
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
      <AccessShell eyebrow="Socios" title="Revisá tu email" tab="Recuperación">
        <EmptyState
          icon={<MailCheck aria-hidden className="size-10" strokeWidth={1.25} />}
          title="Te enviamos un link"
          description="Si el DNI corresponde a una cuenta activa, vas a recibir un link para crear una contraseña nueva. Vence en 30 minutos."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button variant="secondary" onClick={() => setStep("nueva")}>
                Simular link del email
              </Button>
              <DevTag>Demo · no se envió ningún email</DevTag>
            </div>
          }
        />
      </AccessShell>
    );
  }

  if (step === "expired") {
    return (
      <AccessShell eyebrow="Socios" title="Recuperá tu contraseña" tab="Recuperación">
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
      </AccessShell>
    );
  }

  if (step === "success") {
    return (
      <AccessShell eyebrow="Socios" title="Contraseña actualizada" tab="Recuperación">
        <EmptyState
          icon={<CircleCheck aria-hidden className="size-10" strokeWidth={1.25} />}
          title="Listo"
          description="Cerramos las sesiones abiertas en otros dispositivos. Ya podés ingresar con tu contraseña nueva."
          action={<LinkButton href="/qr/login">Ingresar</LinkButton>}
        />
      </AccessShell>
    );
  }

  if (step === "nueva") {
    return (
      <AccessShell eyebrow="Socios" title="Creá una contraseña nueva" tab="Recuperación">
        <NewPasswordForm tab="Nueva contraseña" submitLabel="Guardar contraseña" onDone={() => setStep("success")} />
      </AccessShell>
    );
  }

  return (
    <AccessShell eyebrow="Socios" title="Recuperá tu contraseña" description="Escribí tu DNI. Te enviamos un link al email registrado en la asociación." tab="Recuperación">
      <TabbedCard tab="Tu DNI">
        <form noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
          <TextField id="dni" label="DNI" inputMode="numeric" autoComplete="username" hint="Sin puntos." value={dni} onChange={(e) => setDni(e.target.value)} error={error} />
          <Button type="submit" full size="lg" loading={loading} loadingLabel="Enviando…">
            Enviar link
          </Button>
        </form>
      </TabbedCard>
      <p className="text-center text-small text-text-muted">
        ¿Cambiaste de email? Escribinos y lo actualizamos.{" "}
        <TextLink href="/qr/login" className="inline-flex min-h-11 items-center">
          Volver al ingreso
        </TextLink>
      </p>
    </AccessShell>
  );
}
