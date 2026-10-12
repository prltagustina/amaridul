"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { InfoTone } from "./technical";

export type FolderTab = { id: string; label: string; tone: InfoTone; icon?: ReactNode; content: ReactNode };

// Each folder has its own colour: the closed tab shows it softly, the open one in full.
const STYLE: Record<InfoTone, { closed: string; open: string; edge: string; ring: string }> = {
  green: {
    closed: "bg-forest-soft text-forest hover:bg-[#d5e2ce]",
    open: "bg-[linear-gradient(135deg,var(--forest),#3a5f41)] text-white",
    edge: "border-t-forest",
    ring: "focus-visible:outline-forest",
  },
  lilac: {
    closed: "bg-lilac-soft text-lilac-ink hover:bg-[#e6daf0]",
    open: "bg-[linear-gradient(135deg,var(--lilac-deep),#5d4880)] text-white",
    edge: "border-t-lilac-ink",
    ring: "focus-visible:outline-lilac-ink",
  },
  amber: {
    closed: "bg-amber-soft text-amber-ink hover:bg-[#f8e2c8]",
    open: "bg-[linear-gradient(135deg,var(--amber-deep),#7a4c22)] text-white",
    edge: "border-t-amber-ink",
    ring: "focus-visible:outline-amber-ink",
  },
};

/**
 * Overlapping folder tabs (fichas superpuestas): one panel visible at a time, each folder in
 * its own information colour. WAI-ARIA tabs pattern with arrow-key navigation.
 */
export function FolderSwitcher({ tabs, label, initial, flat, className }: { tabs: FolderTab[]; label: string; initial?: string; /** Inside another card: border instead of shadow. */ flat?: boolean; className?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0].id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function onKey(e: KeyboardEvent, i: number) {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className={cn("relative", className)}>
      <div role="tablist" aria-label={label} className="relative flex items-end pl-2">
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
              style={{ zIndex: selected ? 30 : 20 - i }}
              className={cn(
                "relative -ml-2 flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 !rounded-t-[14px] px-3 pt-2.5 pb-3 text-[0.8125rem] font-medium shadow-[0_-6px_14px_-10px_rgba(26,26,24,0.35)] transition-[transform,background-color] duration-200 motion-safe-only sm:flex-none sm:px-5 sm:text-sm",
                "focus-visible:outline-2 focus-visible:-outline-offset-4",
                STYLE[t.tone].ring,
                selected ? cn(STYLE[t.tone].open, "-mb-1 translate-y-0") : cn(STYLE[t.tone].closed, "translate-y-1"),
              )}
            >
              {t.icon && <span aria-hidden className="hidden shrink-0 min-[400px]:inline-flex">{t.icon}</span>}
              <span className="truncate">{t.label}</span>
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
          className={cn(
            "relative z-[25] !rounded-card !rounded-tl-none border-t-[5px] bg-white p-5 outline-none sm:p-6",
            flat ? "border-x border-b border-x-mist-line border-b-mist-line" : "shadow-[0_24px_50px_-34px_rgba(26,26,24,0.45)]",
            STYLE[t.tone].edge,
          )}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
