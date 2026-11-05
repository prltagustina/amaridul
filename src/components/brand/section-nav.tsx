"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** `short`: the name on a phone, where the four have to share one line. */
export type SectionLink = { id: string; label: string; short?: string };

/**
 * The sections of a long page, under the main menu and always in reach: each link scrolls to its
 * section and the one being read is marked. One line at every width (shorter names on a phone).
 * The sections it points to leave room for it (`--anchor-offset` on their container).
 */
export function SectionNav({ items, label }: { items: SectionLink[]; label: string }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const edge = (ref.current?.getBoundingClientRect().bottom ?? 0) + 8;
      let current: string | null = null;
      for (const { id } of items) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= edge) current = id;
      }
      // The last section may never reach the top: at the bottom of the page, it is the one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = items[items.length - 1].id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  return (
    <nav ref={ref} aria-label={label} className="page-gutter sticky top-[var(--nav-h)] z-40 border-b border-mist-line bg-background/95 backdrop-blur-md">
      <ul className="nav-column flex h-12 items-stretch justify-between gap-2 overflow-x-auto [scrollbar-width:none] sm:justify-center sm:gap-10">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="flex shrink-0">
              <a
                href={`#${it.id}`}
                aria-current={on ? "true" : undefined}
                className={cn("relative inline-flex items-center px-1 font-ui text-sm whitespace-nowrap transition-colors motion-safe-only", on ? "!text-forest" : "!text-text-muted hover:!text-forest")}
              >
                {it.short ? (
                  <>
                    <span className="sm:hidden">{it.short}</span>
                    <span className="hidden sm:inline">{it.label}</span>
                  </>
                ) : (
                  it.label
                )}
                {on && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 !rounded-full bg-forest" />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
