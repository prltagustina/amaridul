"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TOP_EDGE, type InfoTone } from "./technical";

/** `hint`: something pending in that section, shown as a dot (and said to screen readers). */
export type FolderTab = { id: string; label: string; tone: InfoTone; icon?: ReactNode; hint?: string; content: ReactNode };

const RING: Record<InfoTone, string> = { green: "focus-visible:outline-forest", lilac: "focus-visible:outline-lilac-ink", magenta: "focus-visible:outline-lila-800" };
const ICON: Record<InfoTone, string> = { green: "text-hoja-600", lilac: "text-lila-600", magenta: "text-rosa-500" };

// One sheet. From 360 px the tabs share the panel's width, so its edges are theirs: the open tab
// is the top of the panel (white, no line under it, its top edge in its section's colour) and the
// others sit behind it, a step greyer. From 640 px they take equal widths and, from 768 px, their
// icons. Under 360 px, two rows of two keys over a panel with its four corners, so no name is cut.
const LAYOUT = {
  list: "grid grid-cols-2 gap-1.5 [&>*:last-child:nth-child(odd)]:col-span-2 min-[22.5rem]:flex min-[22.5rem]:gap-1",
  tab: "!rounded-control px-3 text-[0.9375rem] min-[22.5rem]:flex-auto min-[22.5rem]:!rounded-b-none min-[22.5rem]:!rounded-t-card min-[22.5rem]:border-b-0 min-[22.5rem]:px-1.5 min-[22.5rem]:text-sm sm:flex-1 sm:px-3 sm:text-[0.9375rem]",
  open: "bg-white text-forest min-[22.5rem]:z-10 min-[22.5rem]:-mb-px",
  closed: "bg-arena-100 text-text-muted hover:bg-white/80 hover:text-forest",
  panel: "mt-2 !rounded-card min-[22.5rem]:mt-0 min-[22.5rem]:!rounded-t-none",
} as const;

/**
 * Folder tabs (solapas): one panel visible at a time, drawn as a single sheet with its tabs.
 * `footer` closes the sheet under every tab (the same for all of them: help, for instance).
 * WAI-ARIA tabs pattern with arrow-key navigation; a link to «…#id» opens that tab.
 */
export function FolderSwitcher({
  tabs,
  label,
  initial,
  flat,
  footer,
  className,
}: {
  tabs: FolderTab[];
  label: string;
  initial?: string;
  /** Inside another container: a little less padding. */
  flat?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(initial ?? tabs[0].id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  // A link to «…#tramites» opens that tab, on arrival (after hydration, so the server's first tab
  // stays in sync) and when only the hash changes on the same page.
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (tabs.some((t) => t.id === id)) frame = requestAnimationFrame(() => setActive(id));
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", follow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKey(e: KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div role="tablist" aria-label={label} className={LAYOUT.list}>
        {tabs.map((t, i) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${base}-${t.id}-tab`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${base}-${t.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 border border-mist-line font-ui font-medium whitespace-nowrap transition-colors motion-safe-only sm:gap-2",
                "focus-visible:outline-2 focus-visible:-outline-offset-2",
                RING[t.tone],
                LAYOUT.tab,
                selected ? [LAYOUT.open, TOP_EDGE[t.tone]].join(" ") : LAYOUT.closed,
              )}
            >
              {t.icon && <span aria-hidden className={cn("hidden shrink-0 md:inline-flex [&_svg]:size-4", ICON[t.tone])}>{t.icon}</span>}
              <span>{t.label}</span>
              {t.hint && (
                <>
                  <span aria-hidden className="size-1.5 shrink-0 !rounded-full bg-ambar-500" />
                  <span className="sr-only">, {t.hint}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${base}-${t.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-${t.id}-tab`}
          hidden={t.id !== current.id}
          tabIndex={0}
          className={cn("border border-mist-line bg-white p-5 outline-none focus-visible:outline-2 focus-visible:outline-forest sm:p-7", LAYOUT.panel, flat && "sm:p-6", footer ? "!rounded-b-none" : null)}
        >
          {t.content}
        </div>
      ))}
      {footer && <div className="overflow-hidden !rounded-b-card border border-t-0 border-mist-line">{footer}</div>}
    </div>
  );
}
