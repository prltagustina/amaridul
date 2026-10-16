"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Link2Off, MailWarning } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { DevTag, EmptyState, LoadingBlock } from "@/components/ui/display";
import { demoMember } from "@/demo/fixtures";
import { AccessShell } from "../access-shell";
import { activate, openActivation } from "../actions";
import { NewPasswordForm } from "../new-password-form";

type Step = "default" | "loading" | "expired" | "unauthorized" | "success";
type Who = { token: string; memberNumber: string | null; dniMasked: string; firstName: string } | null;

/**
 * The activation token travels in the URL fragment (#t=…) and is checked with a server action.
 * Without a link, the local demo shows the screen with fictitious data.
 */
export default function ActivateFlow({ initial, demo }: { initial: Step; demo: boolean }) {
  const [step, setStep] = useState<Step | "checking">("checking");
  const [who, setWho] = useState<Who>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
      if (!token) {
        if (!cancelled) setStep(demo ? initial : "unauthorized");
        return;
      }
      const v = await openActivation(token);
      if (cancelled) return;
      if (v.status === "ok") {
        setWho({ token, memberNumber: v.memberNumber, dniMasked: v.dniMasked, firstName: v.firstName });
        setStep("default");
      } else setStep(v.status === "expired" ? "expired" : "unauthorized");
    })();
    return () => {
      cancelled = true;
    };
  }, [demo, initial]);

  if (step === "checking") return <LoadingBlock label="Abriendo tu activación…" lines={4} />;

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
          description="Puede que la cuenta ya esté activa o que te hayamos enviado un link más nuevo. Probá ingresar con tu DNI y contraseña."
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
          action={<LinkButton href={who ? "/qr/login" : "/qr/mi-espacio"}>{who ? "Ingresar" : "Ir a mi espacio"}</LinkButton>}
        />
      </AccessShell>
    );
  }

  return (
    <AccessShell
      eyebrow="Te damos la bienvenida"
      title={who ? `Hola, ${who.firstName}` : "Activá tu cuenta"}
      description="La Comisión Directiva aprobó tu admisión. Creá tu contraseña para ingresar a tu espacio."
      tab="Activación"
    >
      <NewPasswordForm
        tab="Tu contraseña"
        submitLabel="Activar cuenta"
        loading={initial === "loading" && !who}
        onSave={async (password) => {
          if (!who) {
            setStep("success");
            return null;
          }
          const r = await activate(who.token, password);
          if (r.ok) setStep("success");
          return r.ok ? null : r.error;
        }}
      >
        <dl className="grid grid-cols-2 gap-4 !rounded-control bg-mist px-4 py-3">
          <div>
            <dt className="text-xs text-forest/85">Socio</dt>
            <dd className="mt-0.5 font-medium text-forest">{who ? (who.memberNumber ?? "A confirmar") : demoMember.number}</dd>
          </div>
          <div>
            <dt className="text-xs text-forest/85">DNI</dt>
            <dd className="mt-0.5 font-medium text-forest">{who?.dniMasked ?? "••• •••• 0004"}</dd>
          </div>
        </dl>
      </NewPasswordForm>
      {!who && (
        <p>
          <DevTag>Demo · link de activación simulado</DevTag>
        </p>
      )}
    </AccessShell>
  );
}
