"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Boxes, ClipboardCheck, Home, Inbox, Menu, QrCode, ScrollText, ShieldCheck, Tag, UserRound, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { href: "/admin", label: "Inicio", icon: Home, demo: false },
  { href: "/admin/preadmisiones", label: "Preadmisiones", icon: Inbox, demo: true },
  { href: "/admin/admisiones", label: "Admisiones", icon: ClipboardCheck, demo: true },
  { href: "/admin/socios", label: "Socios", icon: Users, demo: true },
  { href: "/admin/productos", label: "Productos", icon: Tag, demo: true },
  { href: "/admin/lotes", label: "Lotes", icon: Boxes, demo: true },
  { href: "/admin/codigos", label: "Códigos", icon: QrCode, demo: true },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText, demo: true },
  { href: "/admin/seguridad", label: "Seguridad", icon: ShieldCheck, demo: false },
];

export function AdminNav({ email, demo, signOut }: { email: string; demo: boolean; signOut: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = SECTIONS.filter((s) => demo || !s.demo);
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

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
                active ? "bg-brand-soft font-medium !text-brand" : "!text-foreground/80 hover:bg-surface-sunken hover:!text-brand",
              )}
            >
              <Icon aria-hidden className={cn("size-[1.125rem]", active ? "text-brand" : "text-text-muted")} strokeWidth={1.5} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const brand = (
    <Link href="/admin" className="flex flex-col gap-0.5 py-1" aria-label="Amarí Dul, administración">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
      <img src="/brand/wordmark-bold.svg" alt="" className="!h-[1.375rem] !w-auto self-start" />
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">Administración</span>
    </Link>
  );

  return (
    <>
      {/* Mobile / tablet */}
      <header className="border-b border-border bg-surface page-gutter lg:hidden">
        <div className="flex h-16 items-center justify-between">
          {brand}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="admin-menu"
            className="-mr-2 flex size-11 items-center justify-center !rounded-control text-brand"
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
