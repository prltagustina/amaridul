import type { ReactNode } from "react";
import { Clock, Compass, Lock, ServerCrash, WifiOff } from "lucide-react";
import { LinkButton } from "./button";

function StateLayout({ icon, code, title, description, action }: { icon: ReactNode; code?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center sm:py-24">
      <span className="flex size-16 items-center justify-center !rounded-full bg-brand-soft text-brand">{icon}</span>
      {code && <p className="text-eyebrow text-accent">{code}</p>}
      <h1 className="text-h1 text-brand">{title}</h1>
      <p className="text-body text-text-muted">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

const icon = "size-7";

export function NotFoundState({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <StateLayout
      icon={<Compass aria-hidden className={icon} strokeWidth={1.25} />}
      code="Error 404"
      title="No encontramos esta página"
      description="Puede que el link esté incompleto o que la página ya no exista."
      action={<LinkButton href={homeHref}>Ir al inicio</LinkButton>}
    />
  );
}

export function SessionExpiredState({ loginHref = "/qr/login" }: { loginHref?: string }) {
  return (
    <StateLayout
      icon={<Clock aria-hidden className={icon} strokeWidth={1.25} />}
      title="Tu sesión terminó"
      description="Por seguridad cerramos la sesión después de un tiempo sin actividad. Ingresá de nuevo para continuar."
      action={<LinkButton href={loginHref}>Ingresar</LinkButton>}
    />
  );
}

export function UnauthorizedState() {
  return (
    <StateLayout
      icon={<Lock aria-hidden className={icon} strokeWidth={1.25} />}
      title="No tenés acceso a esta sección"
      description="Si creés que es un error, escribinos y lo revisamos."
      action={<LinkButton href="/qr" variant="secondary">Volver</LinkButton>}
    />
  );
}

export function ServerErrorState({ action }: { action?: ReactNode }) {
  return (
    <StateLayout
      icon={<ServerCrash aria-hidden className={icon} strokeWidth={1.25} />}
      title="Algo salió mal"
      description="Tuvimos un problema para mostrar esta página. Probá de nuevo en unos minutos."
      action={action ?? <LinkButton href="/">Ir al inicio</LinkButton>}
    />
  );
}

export function OfflineState() {
  return (
    <StateLayout
      icon={<WifiOff aria-hidden className={icon} strokeWidth={1.25} />}
      title="Sin conexión"
      description="Revisá tu conexión a internet. Lo que completaste en este paso se mantiene mientras no cierres la página."
    />
  );
}
