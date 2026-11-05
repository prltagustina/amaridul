import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Orientation and step-by-step guides. Violet is orientation (help, information); inside the
 * trámites sections (REPROCANN) the same blocks take magenta, the colour of that section.
 * Never for states or errors.
 */
export type GuideTone = "violet" | "magenta";

const SURFACE: Record<GuideTone, { box: string; chip: string; eyebrow: string; number: string; line: string }> = {
  violet: { box: "border-lila-200 bg-lila-50", chip: "bg-lila-100 text-lila-700", eyebrow: "text-lila-700", number: "border-lila-300 bg-lila-100 text-lila-800", line: "bg-lila-200" },
  magenta: { box: "border-rosa-200 bg-rosa-50", chip: "bg-rosa-100 text-lila-800", eyebrow: "text-lila-800", number: "border-rosa-300 bg-rosa-100 text-lila-800", line: "bg-rosa-200" },
};

/** An orientation block: who it is for, a short title, a line or two and its actions. */
export function Guidance({ eyebrow, title, icon, children, actions, id, tone = "violet", className }: { eyebrow?: ReactNode; title: ReactNode; icon?: ReactNode; children?: ReactNode; actions?: ReactNode; id?: string; tone?: GuideTone; className?: string }) {
  const t = SURFACE[tone];
  return (
    <section id={id} className={cn("scroll-mt-6 !rounded-card border px-5 py-5 sm:px-6", t.box, className)}>
      <div className="flex items-start gap-4">
        {icon && <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center !rounded-full [&_svg]:size-5", t.chip)}>{icon}</span>}
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow && <p className={cn("text-eyebrow", t.eyebrow)}>{eyebrow}</p>}
          <h2 className="text-h3 text-forest">{title}</h2>
          {children && <div className="measure space-y-2 text-[0.9375rem] leading-relaxed text-foreground/85">{children}</div>}
          {actions && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

export type GuideStep = { title: string; detail?: ReactNode; media?: ReactNode; action?: ReactNode };

/**
 * Steps in order, one action each: a number, a short title, a line when it helps, and the
 * button for that step. A plain vertical sequence on a phone; nothing hidden or carousel-like.
 * It does not mark steps as done: the system cannot know.
 */
export function StepGuide({ steps, label, tone = "violet", className }: { steps: GuideStep[]; label: string; tone?: GuideTone; className?: string }) {
  const t = SURFACE[tone];
  return (
    <ol aria-label={label} className={cn("space-y-0", className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className={cn("absolute top-11 bottom-1 left-5 w-px -translate-x-1/2", t.line)} />}
          <span aria-hidden className={cn("relative flex size-10 items-center justify-center !rounded-full border font-ui text-[0.9375rem] tabular-nums", t.number)}>
            {i + 1}
          </span>
          <div className="min-w-0 space-y-2 pt-1.5">
            <h3 className="text-[1.0625rem] leading-snug font-title text-forest">
              <span className="sr-only">Paso {i + 1}: </span>
              {s.title}
            </h3>
            {s.detail && <div className="measure text-[0.9375rem] leading-relaxed text-text-muted">{s.detail}</div>}
            {s.action && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">{s.action}</div>}
            {s.media}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Help that closes a sheet or a panel, as its last line: a question, a sentence and one action, in
 * the violet of orientation. It belongs to what it helps with, instead of a box beside it.
 */
export function HelpStrip({ icon, title, children, action, className }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3 bg-lila-50 px-5 py-4", className)}>
      {icon && (
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center !rounded-full bg-lila-100 text-lila-700 [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="min-w-0 flex-1 basis-56 text-sm leading-relaxed text-text-muted">
        <span className="font-medium text-foreground">{title}</span> {children}
      </p>
      {action}
    </div>
  );
}
