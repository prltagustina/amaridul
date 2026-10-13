import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { logout } from "./actions";
import { AdminNav } from "./admin-nav";

export function EnvironmentNotice() {
  if (process.env.APP_ENV === "production") return null;
  return (
    <div role="region" aria-label="Aviso de entorno" className="border-b border-warning-fg/20 bg-warning-bg page-gutter py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-warning-fg">
      Entorno de prueba · datos ficticios
    </div>
  );
}

/** Sidebar on desktop, collapsible menu on mobile. Sections still run on fixtures until Fase 1 connects them. */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const signOut = (
    <form action={logout}>
      <button type="submit" className="inline-flex min-h-11 items-center gap-2 text-sm !text-text-muted hover:!text-forest">
        <LogOut aria-hidden className="size-4" strokeWidth={1.5} /> Cerrar sesión
      </button>
    </form>
  );
  return (
    <>
      <EnvironmentNotice />
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminNav email={email} signOut={signOut} />
        <main id="contenido" className="min-w-0 flex-1 page-gutter pt-8 pb-24 lg:px-10 lg:pt-10">
          <div className="admin-column">{children}</div>
        </main>
      </div>
    </>
  );
}

export function AdminPageHeader({ title, eyebrow, description, actions, back }: { title: ReactNode; eyebrow?: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8 space-y-4">
      {back && (
        <Link href={back.href} className="inline-flex min-h-10 items-center gap-1.5 text-small !text-text-muted hover:!text-forest">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          {eyebrow && <p className="text-eyebrow text-accent">{eyebrow}</p>}
          <h1 className="text-h1 text-forest">{title}</h1>
          {description && <p className="max-w-2xl text-body text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
