"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Boxes, ClipboardCheck, Home, Inbox, Menu, QrCode, ScrollText, ShieldCheck, Tag, UserRound, Users, X, UserCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { BrandLockup } from "@/components/brand/headers";

const SECTIONS = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/preadmisiones", label: "Preadmisiones", icon: Inbox },
  { href: "/admin/admisiones", label: "Admisiones", icon: ClipboardCheck },
  { href: "/admin/socios", label: "Socios", icon: Users },
  { href: "/admin/socios-existentes", label: "Socios existentes", icon: UserCheck },
  { href: "/admin/productos", label: "Productos", icon: Tag },
  { href: "/admin/lotes", label: "Lotes", icon: Boxes },
  { href: "/admin/codigos", label: "Códigos", icon: QrCode },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
  { href: "/admin/seguridad", label: "Seguridad", icon: ShieldCheck },
];

export function AdminNav({ email, signOut }: { email: string; signOut: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = SECTIONS;
  // Whole path segments only: "/admin/socios" must not light up on "/admin/socios-existentes".
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const list = (
    <ul className="space-y-0.5">
      {sections.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 !rounded-control px-3 text-[0.9375rem]",
                active ? "bg-forest-soft font-medium !text-forest" : "!text-foreground/80 hover:bg-surface-sunken hover:!text-forest",
              )}
            >
              <Icon aria-hidden className={cn("size-[1.125rem]", active ? "text-forest" : "text-text-muted")} strokeWidth={1.5} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
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
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="admin-menu"
            className="-mr-2 flex size-11 items-center justify-center !rounded-control text-forest"
          >
            <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
            {open ? <X aria-hidden className="size-6" strokeWidth={1.5} /> : <Menu aria-hidden className="size-6" strokeWidth={1.5} />}
          </button>
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
        <nav aria-label="Administración" className="mt-8 flex-1 overflow-y-auto">
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
