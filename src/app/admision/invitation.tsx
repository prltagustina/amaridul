"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CalendarClock, Link2Off, MailWarning } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { openInvitation, type InvitationView } from "./actions";

const longDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export function ExpiredInvitation() {
  return (
    <EmptyState
      icon={<MailWarning aria-hidden className="size-10" strokeWidth={1.25} />}
      title="Tu invitación venció"
      description="Por seguridad, las invitaciones vencen. Escribinos y te enviamos una nueva para seguir con la misma solicitud."
      action={<LinkButton href="/qr#preguntas" variant="secondary">Ver contacto</LinkButton>}
    />
  );
}

export function InvalidInvitation() {
  return (
    <EmptyState
      icon={<Link2Off aria-hidden className="size-10" strokeWidth={1.25} />}
      title="Este link no es válido"
      description="Puede que ya se haya usado, que se haya enviado uno más nuevo o que esté incompleto. Abrí el link desde el último email que recibiste."
      action={<LinkButton href="/qr" variant="secondary">Volver</LinkButton>}
    />
  );
}

/**
 * The personal token travels in the URL fragment (#t=…): it never reaches the server logs. It is read
 * here and validated with a server action. Without a token, the local demo shows `demo` instead.
 */
export function Invitation({ demo, children }: { demo: ReactNode | null; children: ReactNode }) {
  const [view, setView] = useState<InvitationView | "checking" | "demo">("checking");
  const [token, setToken] = useState("");
  const hasDemo = demo !== null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
      const next = t ? await openInvitation(t) : hasDemo ? ("demo" as const) : ({ status: "invalid" } as const);
      if (cancelled) return;
      setToken(t);
      setView(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasDemo]);

  if (view === "checking") return <LoadingBlock label="Abriendo tu invitación…" lines={4} />;
  if (view === "demo") return <>{demo}</>;
  if (view.status === "expired") return <ExpiredInvitation />;
  if (view.status === "invalid") return <InvalidInvitation />;

  return (
    <>
      <TabbedCard tab={`1. Tu invitación · ${view.reference}`} bodyClassName="space-y-5">
        <p className="font-title text-xl text-forest">Hola, {view.firstName}</p>
        <div className="flex items-start gap-3">
          <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
          <p className="text-body text-foreground">
            Corresponde a tu solicitud <strong className="font-medium">{view.reference}</strong> y vence el{" "}
            <strong className="font-medium">{longDate.format(new Date(view.expiresAt))}</strong>.
          </p>
        </div>
        <p className="text-body text-text-muted">Completarla lleva unos 10 minutos. Lo que cargues se conserva en este navegador mientras no cierres la pestaña.</p>
        <LinkButton href={`/admision/solicitud#t=${token}`} editorial size="lg" full>
          Continuar <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
        </LinkButton>
      </TabbedCard>
      {children}
    </>
  );
}
