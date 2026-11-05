import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, LogOut } from "lucide-react";
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

/** Sidebar on desktop, collapsible menu on mobile. */
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
        <main id="contenido" className="min-w-0 flex-1 page-gutter pt-7 pb-20 lg:px-10 lg:pt-9">
          <div className="admin-column">{children}</div>
        </main>
      </div>
    </>
  );
}

/**
 * The admin's page header: the way back (always top left, with the same chevron as the portal),
 * where you are, the title, one short line and the page's actions at the right. Denser than the
 * portal's: a smaller title and a shorter description, so lists start high on the screen.
 */
export function AdminPageHeader({ title, eyebrow, description, actions, back }: { title: ReactNode; eyebrow?: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-7 space-y-3 border-b border-mist-line pb-6">
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex min-h-9 items-center gap-1 pr-1 text-sm font-medium !text-forest underline-offset-4 hover:underline">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2} /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && <p className="text-eyebrow text-text-muted">{eyebrow}</p>}
          <h1 className="text-h2 text-balance text-forest">{title}</h1>
          {description && <p className="measure text-small text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
