"use client";

import { useState } from "react";
import { CircleCheck, Link2Off, MailWarning } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { DevTag, EmptyState } from "@/components/ui/display";
import { demoMember } from "@/demo/fixtures";
import { AccessShell } from "../access-shell";
import { NewPasswordForm } from "../new-password-form";

type Step = "default" | "loading" | "expired" | "unauthorized" | "success";

export default function ActivateFlow({ initial }: { initial: Step }) {
  const [step, setStep] = useState<Step>(initial);

  if (step === "expired") {
    return (
      <AccessShell eyebrow="Socios" title="Activá tu cuenta" tab="Activación">
        <EmptyState
          icon={<MailWarning aria-hidden className="size-10" strokeWidth={1.25} />}
          title="El link de activación venció"
          description="Escribinos y te enviamos uno nuevo."
          action={<LinkButton href="/qr#preguntas" variant="secondary">Ver contacto</LinkButton>}
        />
      </AccessShell>
    );
  }
  if (step === "unauthorized") {
    return (
      <AccessShell eyebrow="Socios" title="Activá tu cuenta" tab="Activación">
        <EmptyState
          icon={<Link2Off aria-hidden className="size-10" strokeWidth={1.25} />}
          title="Este link no es válido"
          description="Puede que la cuenta ya esté activa. Probá ingresar con tu DNI y contraseña."
          action={<LinkButton href="/qr/login">Ir al ingreso</LinkButton>}
        />
      </AccessShell>
    );
  }
  if (step === "success") {
    return (
      <AccessShell eyebrow="Te damos la bienvenida" title="Tu cuenta está activa" tab="Activación">
        <EmptyState
          icon={<CircleCheck aria-hidden className="size-10" strokeWidth={1.25} />}
          title="Ya podés ingresar"
          description="Desde ahora ingresás con tu DNI y la contraseña que acabás de crear."
          action={<LinkButton href="/qr/mi-espacio">Ir a mi espacio</LinkButton>}
        />
      </AccessShell>
    );
  }

  return (
    <AccessShell
      eyebrow="Te damos la bienvenida"
      title="Activá tu cuenta"
      description="La Comisión Directiva aprobó tu admisión. Creá tu contraseña para ingresar a tu espacio."
      tab="Activación"
    >
      <NewPasswordForm tab="Tu contraseña" submitLabel="Activar cuenta" loading={initial === "loading"} onDone={() => setStep("success")}>
        <dl className="grid grid-cols-2 gap-4 !rounded-control bg-mist px-4 py-3">
          <div>
            <dt className="text-xs text-forest/85">Socio</dt>
            <dd className="mt-0.5 font-medium text-forest">{demoMember.number}</dd>
          </div>
          <div>
            <dt className="text-xs text-forest/85">DNI</dt>
            <dd className="mt-0.5 font-medium text-forest">••• •••• 0004</dd>
          </div>
        </dl>
      </NewPasswordForm>
      <p>
        <DevTag>Demo · link de activación simulado</DevTag>
      </p>
    </AccessShell>
  );
}
