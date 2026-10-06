"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#sobre", label: "Sobre Amarí Dul" },
  { href: "/qr", label: "Producto" },
  { href: "#contacto", label: "Contacto" },
];

const linkClass = "!text-background/85 hover:!text-background transition-colors motion-reduce:transition-none aria-[current=page]:!text-background focus-visible:!outline-background";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (href === pathname ? "page" : undefined);

  return (
    <header className="sticky top-0 z-50 bg-[#3f6043]">
      <nav aria-label="Principal">
        <div className="page-gutter">
          <div className="nav-column flex items-center justify-between" style={{height: "var(--nav-h)"}}>
            <Link href="/" aria-label="Amarí Dul, inicio" className="flex items-center focus-visible:!outline-background" onClick={() => setOpen(false)}>
              <img src="/brand/wordmark-bold-cream.svg" alt="" className="!h-[1.375rem] sm:!h-6 !w-auto" />
            </Link>

            <ul className="hidden md:flex items-center gap-8 -mr-[0.15em] lg:mr-[calc(0.875rem-0.15em)] text-sm uppercase tracking-[0.15em]">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={current(l.href)} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <button
              type="button"
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden -mr-2 flex h-11 w-11 items-center justify-center text-background focus-visible:!outline-background"
            >
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        <div id="menu-movil" hidden={!open} className="md:hidden absolute inset-x-0 top-full page-gutter bg-[#4f7053]">
          <ul className="nav-column py-2 text-base uppercase tracking-[0.15em]">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={current(l.href)} onClick={() => setOpen(false)} className="block py-3 !text-background focus-visible:!outline-background aria-[current=page]:!underline underline-offset-[6px] decoration-1">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
