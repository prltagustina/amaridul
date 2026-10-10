import { logout } from "./actions";
import { linkButtonClass } from "./styles";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-border page-gutter">
      <div className="content-column flex min-h-14 items-center justify-between gap-4">
        <nav aria-label="Administración" className="flex items-center gap-6 text-sm uppercase tracking-[0.15em]">
          <a href="/admin" className="!text-[#3f6043]">Panel</a>
          <a href="/admin/seguridad" className="!text-text-muted hover:!text-[#3f6043]">Seguridad</a>
        </nav>
        <form action={logout} className="flex items-center gap-4">
          <span className="hidden text-sm text-text-muted sm:inline">{email}</span>
          <button type="submit" className={linkButtonClass}>Cerrar sesión</button>
        </form>
      </div>
    </header>
  );
}

export function EnvironmentNotice() {
  if (process.env.APP_ENV === "production") return null;
  return (
    <p className="border-b border-border bg-white page-gutter py-2 text-center text-xs uppercase tracking-[0.15em] text-text-muted">
      Entorno de prueba · datos ficticios
    </p>
  );
}
