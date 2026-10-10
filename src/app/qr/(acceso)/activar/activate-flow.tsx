"use client";

import { useState } from "react";
import { CircleCheck, Link2Off, MailWarning } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { DevTag, EmptyState } from "@/components/ui/display";
import { demoMember } from "@/demo/fixtures";
import { NewPasswordForm } from "../new-password-form";

type Step = "default" | "loading" | "expired" | "unauthorized" | "success";

export default function ActivateFlow({ initial }: { initial: Step }) {
  const [step, setStep] = useState<Step>(initial);

  if (step === "expired") {
    return (
      <EmptyState
        icon={<MailWarning aria-hidden className="size-10" strokeWidth={1.25} />}
        title="El link de activación venció"
        description="Escribinos y te enviamos uno nuevo."
        action={<LinkButton href="/qr#preguntas" variant="secondary">Ver contacto</LinkButton>}
      />
    );
  }
  if (step === "unauthorized") {
    return (
      <EmptyState
        icon={<Link2Off aria-hidden className="size-10" strokeWidth={1.25} />}
        title="Este link no es válido"
        description="Puede que la cuenta ya esté activa. Probá ingresar con tu DNI y contraseña."
        action={<LinkButton href="/qr/login">Ir al ingreso</LinkButton>}
      />
    );
  }
  if (step === "success") {
    return (
      <EmptyState
        icon={<CircleCheck aria-hidden className="size-10" strokeWidth={1.25} />}
        title="Tu cuenta está activa"
        description="Desde ahora ingresás con tu DNI y la contraseña que acabás de crear."
        action={<LinkButton href="/qr/mi-espacio">Ir a mi espacio</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-eyebrow text-accent">Te damos la bienvenida</p>
        <h1 className="text-h1 text-brand">Activá tu cuenta</h1>
        <p className="text-body text-text-muted">La Comisión Directiva aprobó tu admisión. Creá tu contraseña para ingresar a tu espacio.</p>
      </header>
      <NewPasswordForm submitLabel="Activar cuenta" loading={initial === "loading"} onDone={() => setStep("success")}>
        <dl className="grid grid-cols-2 gap-4 !rounded-control bg-background/70 px-4 py-3">
          <div>
            <dt className="text-eyebrow text-text-muted">Socio</dt>
            <dd className="mt-1 text-base">{demoMember.number}</dd>
          </div>
          <div>
            <dt className="text-eyebrow text-text-muted">DNI</dt>
            <dd className="mt-1 text-base">••• •••• 0004</dd>
          </div>
        </dl>
      </NewPasswordForm>
      <p className="text-center">
        <DevTag>Demo · link de activación simulado</DevTag>
      </p>
    </div>
  );
}
