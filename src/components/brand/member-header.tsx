"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { memberSignOut } from "@/app/qr/(acceso)/actions";
import { BrandLockup } from "./headers";

const LINKS = [
  { href: "/qr/mi-espacio", label: "Mi espacio" },
  { href: "/qr/trazabilidad", label: "Trazabilidad" },
];

/** Private navigation for the member portal. "Salir" closes the session. */
export function MemberHeader({ memberName }: { memberName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);


  const link = (l: (typeof LINKS)[number], mobile = false) => {
    const active = pathname === l.href;
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={cn(
          "inline-flex min-h-11 items-center text-sm tracking-wide",
          mobile ? "px-1 text-lg" : "border-b-2 px-1",
          active ? "border-accent !text-forest" : "border-transparent !text-text-muted hover:!text-forest",
          mobile && active && "font-medium",
        )}
      >
        {l.label}
      </Link>
    );
  };

  return (
    <header className="page-gutter border-b border-border/70 bg-background">
      <div className="admin-column flex h-[var(--nav-h)] items-center justify-between gap-4">
        <Link href="/qr/mi-espacio" aria-label="Amarí Dul, mi espacio" className="flex min-h-11 items-center gap-2">
          <BrandLockup />
        </Link>
        <nav aria-label="Portal de socios" className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => link(l))}
          <span className="h-5 w-px bg-border" aria-hidden />
          <span className="text-small whitespace-nowrap text-text-muted">{memberName}</span>
          <form action={memberSignOut}>
            <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 text-sm !text-text-muted hover:!text-forest">
              <LogOut aria-hidden className="size-4" strokeWidth={1.5} /> Salir
            </button>
          </form>
        </nav>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="member-menu"
          className="-mr-2 flex size-11 items-center justify-center !rounded-control text-forest lg:hidden"
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          {open ? <X aria-hidden className="size-6" strokeWidth={1.5} /> : <Menu aria-hidden className="size-6" strokeWidth={1.5} />}
        </button>
      </div>
      <nav id="member-menu" aria-label="Portal de socios" hidden={!open} className="admin-column border-t border-border/70 pt-2 pb-4 lg:hidden">
        <p className="py-2 text-small text-text-muted">{memberName}</p>
        <div className="flex flex-col">{LINKS.map((l) => link(l, true))}</div>
        <form action={memberSignOut}>
          <button type="submit" className="mt-2 inline-flex min-h-11 items-center gap-2 px-1 text-lg !text-text-muted">
            <LogOut aria-hidden className="size-5" strokeWidth={1.5} /> Salir
          </button>
        </form>
      </nav>
    </header>
  );
}
