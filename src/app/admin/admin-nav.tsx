"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BellRing, Boxes, ClipboardCheck, FileCheck2, Home, Inbox, Menu, QrCode, ScrollText, Search, ShieldCheck, Tag, UserCheck, UserRound, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BrandLockup } from "@/components/brand/headers";

/** `inDevelopment`: the section exists but has no real records yet (it says so when opened). */
type Item = { href: string; label: string; icon: typeof Home; inDevelopment?: true };

// The register is one list (Padrón); the requests that feed it are inboxes (Solicitudes).
const GROUPS: { label: string | null; items: Item[] }[] = [
  { label: null, items: [{ href: "/admin", label: "Inicio", icon: Home }] },
  {
    label: "Padrón",
    items: [
      { href: "/admin/socios", label: "Socios", icon: Users },
      { href: "/admin/cuota", label: "Recordatorio de cuota", icon: BellRing },
    ],
  },
  {
    label: "Solicitudes",
    items: [
      { href: "/admin/preadmisiones", label: "Preadmisiones", icon: Inbox },
      { href: "/admin/admisiones", label: "Admisiones", icon: ClipboardCheck },
      { href: "/admin/socios-existentes", label: "Solicitudes de socios existentes", icon: UserCheck },
      { href: "/admin/reprocann", label: "Credenciales REPROCANN", icon: FileCheck2 },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: Tag },
      { href: "/admin/lotes", label: "Lotes", icon: Boxes, inDevelopment: true },
      { href: "/admin/codigos", label: "Códigos", icon: QrCode, inDevelopment: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
      { href: "/admin/seguridad", label: "Seguridad", icon: ShieldCheck },
    ],
  },
];

const SEARCH = "/admin/buscar";
/** Typing somewhere: the search shortcut must not steal the key. */
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function AdminNav({ email, signOut }: { email: string; signOut: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // «/» (or Ctrl/⌘ K) opens the search from anywhere in the panel; on the search page, it focuses the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target);
      const k = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey) && !e.altKey;
      if (!slash && !k) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      if (pathname === SEARCH) document.getElementById("admin-search")?.focus();
      else router.push(SEARCH);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);
  const groups = GROUPS;
  // Whole path segments only: "/admin/socios" must not light up on "/admin/socios-existentes".
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const list = (
    // Desktop rows are a little tighter so the whole menu fits a laptop screen; touch targets stay 44 px.
    <div className="space-y-5 lg:space-y-3.5">
      {groups.map((g) => (
        <div key={g.label ?? "inicio"} className="space-y-1">
          {g.label && <p className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, inDevelopment }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 !rounded-control px-3 py-2 text-[0.9375rem] leading-snug lg:min-h-10 lg:py-1.5",
                      active ? "bg-forest-soft font-medium !text-forest" : "!text-foreground/80 hover:bg-surface-sunken hover:!text-forest",
                    )}
                  >
                    <Icon aria-hidden className={cn("size-[1.125rem] shrink-0", active ? "text-forest" : "text-text-muted")} strokeWidth={1.5} />
                    <span className="flex-1">{label}</span>
                    {inDevelopment && <span className="shrink-0 !rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-warning-fg">En desarrollo</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex py-1" aria-label="Amarí Dul, administración">
      <BrandLockup tagline="Administración" />
    </Link>
  );

  return (
    <>
      {/* Mobile / tablet */}
      <header className="border-b border-border bg-surface page-gutter lg:hidden">
        <div className="flex h-[var(--nav-h)] items-center justify-between">
          {brand}
          <div className="-mr-2 flex items-center gap-1">
            <Link href={SEARCH} aria-current={pathname === SEARCH ? "page" : undefined} className="flex size-11 items-center justify-center !rounded-control !text-forest" onClick={() => setOpen(false)}>
              <span className="sr-only">Buscar en el panel</span>
              <Search aria-hidden className="size-6" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="admin-menu"
              className="flex size-11 items-center justify-center !rounded-control text-forest"
            >
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
              {open ? <X aria-hidden className="size-6" strokeWidth={1.5} /> : <Menu aria-hidden className="size-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
        <nav id="admin-menu" aria-label="Administración" hidden={!open} className="space-y-4 border-t border-border pt-3 pb-5">
          {list}
          <div className="border-t border-border pt-3">
            <p className="truncate px-3 text-small text-text-muted">{email}</p>
            <div className="px-3">{signOut}</div>
          </div>
        </nav>
      </header>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        <div className="px-3">{brand}</div>
        <Link
          href={SEARCH}
          aria-current={pathname === SEARCH ? "page" : undefined}
          className={cn(
            "mt-5 flex min-h-10 items-center gap-2.5 !rounded-control border px-3 text-[0.9375rem]",
            pathname === SEARCH ? "border-forest/40 bg-forest-soft font-medium !text-forest" : "border-border bg-white !text-text-muted hover:border-forest/40 hover:!text-forest",
          )}
        >
          <Search aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="flex-1">Buscar</span>
          <kbd aria-hidden className="!rounded-[4px] border border-border px-1.5 font-mono text-[11px] text-text-muted">/</kbd>
        </Link>
        <nav aria-label="Administración" className="mt-5 flex-1 overflow-y-auto">
          {list}
        </nav>
        <div className="space-y-1 border-t border-border px-3 pt-4">
          <p className="flex items-center gap-2 truncate text-small text-text-muted" title={email}>
            <UserRound aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{email}</span>
          </p>
          {signOut}
        </div>
      </aside>
    </>
  );
}
