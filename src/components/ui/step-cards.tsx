"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** `media`: something that goes with the step (the video for the first one), between its text and action. */
export type StepCard = { meta?: string; title: string; detail?: ReactNode; media?: ReactNode; action?: ReactNode };

// Whole class names, so Tailwind generates them.
const COLUMNS = { 2: "md:grid-cols-2", 3: "md:grid-cols-3" } as const;

/**
 * Steps as cards in a row. On a computer all of them are in sight at once; on a phone they are a
 * carousel: one card at a time, swiped, the next one peeking up to the edge of the screen, and dots
 * under it that say where you are and jump to a step. It never moves on its own. An ordered list,
 * so every step is in the page in its order. `bleed` lets the phone's row run to the edges of the
 * container it is in (its negative margin and padding, the same as that container's gutter).
 */
export function StepCards({
  steps,
  label,
  columns = 3,
  bleed,
  aside,
  className,
}: {
  steps: StepCard[];
  label: string;
  columns?: keyof typeof COLUMNS;
  bleed?: string;
  /** What goes with the first step (its video), before the row: at its left on a computer, as tall as it (the cards stretch to it); above the carousel on a phone. */
  aside?: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLOListElement>(null);
  const [current, setCurrent] = useState(0);

  // On a phone, the card at the start of the row is the current one (from how far it has slid).
  function onScroll() {
    const el = track.current;
    const [first, second] = Array.from(el?.children ?? []) as HTMLElement[];
    if (!el || !first) return;
    const step = second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    setCurrent(Math.max(0, Math.min(steps.length - 1, Math.round(el.scrollLeft / step))));
  }

  function go(i: number) {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: card.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className={cn("min-w-0", aside ? "md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-stretch md:gap-6" : null, className)}>
      {aside && <div className="mb-8 md:mb-0">{aside}</div>}
      <div className="min-w-0 md:flex md:flex-col">
        <ol
          ref={track}
          aria-label={label}
          onScroll={onScroll}
          className={cn(
            "relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            bleed,
            "md:mx-0 md:grid md:flex-1 md:snap-none md:gap-4 md:overflow-visible md:px-0",
            COLUMNS[columns],
          )}
        >
          {steps.map((s, i) => (
            <li key={s.title} className="flex w-[82%] shrink-0 snap-start flex-col gap-3 !rounded-card border border-mist-line bg-white p-5 sm:w-[60%] sm:p-6 md:w-auto">
              <p aria-hidden className="font-display text-[2.75rem] leading-[0.9] font-medium text-lila-600 lining-nums">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="space-y-1">
                {s.meta && <p className="text-eyebrow text-lila-800">{s.meta}</p>}
                <h3 className="font-title text-[1.1875rem] leading-snug text-forest">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {s.title}
                </h3>
              </div>
              {s.detail && <div className="text-[0.9375rem] leading-relaxed text-text-muted">{s.detail}</div>}
              {s.media}
              {s.action && <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">{s.action}</div>}
            </li>
          ))}
        </ol>

        {/* Only on a phone, where the row slides: where you are, and a way to jump. */}
        <div className="mt-3 flex items-center justify-center gap-1 md:hidden">
          {steps.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir al paso ${i + 1}: ${s.title}`}
              aria-current={i === current ? "step" : undefined}
              className="group flex size-11 items-center justify-center !rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lila-800"
            >
              <span aria-hidden className={cn("h-2 !rounded-full transition-all motion-safe-only", i === current ? "w-6 bg-lila-800" : "w-2 bg-lila-300 group-hover:bg-lila-500")} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
