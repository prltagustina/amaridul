"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** `media`: something that goes with the step (the video for the first one), between its text and action. */
export type StepCard = { meta?: string; title: string; detail?: ReactNode; media?: ReactNode; action?: ReactNode };

// Whole class names, so Tailwind generates them.
const COLUMNS = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" } as const;

/**
 * Steps as cards in a row. From 1024 px all of them are in sight at once; narrower (a phone, a
 * tablet) they are a carousel: one card at a time, swiped, the next one peeking up to the edge of the screen, and dots
 * under it that say where you are and jump to a step. It never moves on its own. An ordered list,
 * so every step is in the page in its order. `bleed` lets the phone's row run to the edges of the
 * container it is in (its negative margin and padding, the same as that container's gutter).
 * `layout="list"` stacks the cards instead, each with its number at its left (for a
 * narrow column beside a tall `aside`).
 */
export function StepCards({
  steps,
  label,
  columns = 3,
  layout = "row",
  bleed,
  aside,
  className,
}: {
  steps: StepCard[];
  label: string;
  columns?: keyof typeof COLUMNS;
  layout?: "row" | "list";
  bleed?: string;
  /**
   * What goes with the first step (its video), before the steps: from 1024 px at their left, in a
   * cell as tall as they are (the aside fills it); narrower, above them.
   */
  aside?: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLOListElement>(null);
  const list = layout === "list";
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
    <div className={cn("min-w-0", aside ? "lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-6" : null, className)}>
      {aside && <div className="mb-8 lg:mb-0">{aside}</div>}
      <div className="min-w-0 lg:flex lg:flex-col">
        <ol
          ref={track}
          aria-label={label}
          onScroll={onScroll}
          className={cn(
            "relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            bleed,
            "lg:mx-0 lg:grid lg:flex-1 lg:snap-none lg:gap-4 lg:overflow-visible lg:px-0",
            list ? "lg:gap-3" : COLUMNS[columns],
          )}
        >
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={cn(
                "flex w-[82%] shrink-0 snap-start flex-col gap-3 !rounded-card border border-mist-line bg-white p-5 sm:w-[60%] sm:p-6 lg:w-auto",
                list ? "lg:flex-row lg:gap-5 lg:py-5" : null,
              )}
            >
              <p aria-hidden className={cn("font-display text-[2.75rem] leading-[0.9] font-medium text-lila-600 lining-nums", list ? "lg:w-12 lg:shrink-0" : null)}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="space-y-1">
                  {s.meta && <p className="text-eyebrow text-lila-800">{s.meta}</p>}
                  <h3 className="font-title text-[1.1875rem] leading-snug text-forest">
                    <span className="sr-only">Paso {i + 1}: </span>
                    {s.title}
                  </h3>
                </div>
                {s.detail && <div className="text-[0.9375rem] leading-relaxed text-text-muted">{s.detail}</div>}
                {s.media}
                {s.action && <div className={cn("mt-auto flex flex-wrap items-center gap-x-4 gap-y-2", list ? "lg:pt-0" : "pt-2")}>{s.action}</div>}
              </div>
            </li>
          ))}
        </ol>

        {/* Only where the row slides (below 1024 px): where you are, and a way to jump. */}
        <div className="mt-3 flex items-center justify-center gap-1 lg:hidden">
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
