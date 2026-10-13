"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLockup } from "@/components/brand/headers";

const LINKS = [
  { href: "/#sobre", label: "Sobre Amarí Dul", section: "sobre" },
  { href: "/qr", label: "Producto" },
  { href: "#contacto", label: "Contacto", section: "contacto" },
];

// Over the hero photo the bar is transparent with cream marks; once the page scrolls it turns bone.
// On phones the lockup only appears once scrolled: over the hero, the circular logo is already there.
const linkBase = "font-ui data-[active=true]:underline underline-offset-[10px] decoration-1 transition-colors motion-reduce:transition-none";
const linkTone = { photo: "!text-white/85 hover:!text-white data-[active=true]:!text-white focus-visible:!outline-background", solid: "!text-text-muted hover:!text-forest data-[active=true]:!text-forest" };

export default function Nav({ showContact = true }: { showContact?: boolean }) {
  const links = showContact ? LINKS : LINKS.filter((l) => l.section !== "contacto");
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const ids = LINKS.flatMap((l) => (l.section && document.getElementById(l.section) ? [l.section] : []));
    const update = () => {
      const navBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      let active: string | null = null;
      for (const id of ids) {
        if (document.getElementById(id)!.getBoundingClientRect().top <= navBottom + 8) active = id;
      }
      // Contacto sits at the end of the page and can never reach the top, so the bottom counts as reaching it.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && ids.includes("contacto")) active = "contacto";
      setSection(active);
      setScrolled(window.scrollY > 24);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
    };
  }, [pathname]);

  const isActive = (l: (typeof LINKS)[number]) => (section ? l.section === section : !l.section && l.href === pathname);
  const current = (href: string) => (href === pathname ? "page" : undefined);

  const solid = scrolled || open;
  const linkClass = `${linkBase} ${solid ? linkTone.solid : linkTone.photo}`;

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 motion-reduce:transition-none ${solid ? "border-mist-line bg-background/95 backdrop-blur-md" : "border-transparent bg-transparent"}`}
    >
      <nav aria-label="Principal">
        <div className="page-gutter">
          <div className="nav-column flex items-center justify-between" style={{height: "var(--nav-h)"}}>
            <Link href="/" aria-label="Amarí Dul, inicio" className={`flex min-h-11 items-center gap-2 ${solid ? "" : "max-md:invisible"}`} onClick={() => setOpen(false)}>
              <BrandLockup tone={solid ? "forest" : "cream"} onPhoto={!solid} />
            </Link>

            <ul className="hidden md:flex items-center gap-8 -mr-[0.15em] text-[0.8125rem] uppercase tracking-[0.14em]">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={current(l.href)} data-active={isActive(l)} className={linkClass}>
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
              className={`md:hidden -mr-2 flex h-11 w-11 items-center justify-center ${solid ? "text-forest" : "text-white focus-visible:!outline-background"}`}
            >
              <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        <div id="menu-movil" hidden={!open} className="md:hidden absolute inset-x-0 top-full page-gutter bg-background border-b border-mist-line shadow-[0_18px_30px_-24px_rgb(29_52_30/0.6)]">
          <ul className="nav-column py-2 text-base uppercase tracking-[0.15em]">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={current(l.href)} data-active={isActive(l)} onClick={() => setOpen(false)} className="font-ui block py-3 text-[0.9375rem] !text-text-muted data-[active=true]:!text-forest data-[active=true]:!underline underline-offset-[6px] decoration-1">
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
