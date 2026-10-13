import type { ReactNode } from "react";
import { Check, Droplet } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Information components in the manner of the Dambar fichas técnicas (folder tabs, gradient
 * bands, data blocks, THC:CBD ratio bars, outlined chips, rule rows, numbered steps), drawn
 * with the Amarí Dul plant palette. Three tones tell the kind of information apart:
 * green = comunidad y trazabilidad, lilac = asociarse, sand = trámites y salud.
 */

export type InfoTone = "green" | "lilac" | "sand";

export const TONE = {
  green: {
    band: "bg-[linear-gradient(118deg,var(--hoja-800)_0%,var(--hoja-700)_50%,var(--hoja-600)_100%)]",
    tab: "border-accent",
    ink: "text-forest",
    fill: "bg-forest",
    soft: "bg-forest-soft",
    line: "border-forest/70",
  },
  lilac: {
    band: "bg-[linear-gradient(118deg,var(--lila-800)_0%,var(--lila-700)_50%,var(--lila-600)_100%)]",
    tab: "border-lilac",
    ink: "text-lilac-ink",
    fill: "bg-lilac-ink",
    soft: "bg-lilac-soft",
    line: "border-lilac-ink/70",
  },
  sand: {
    band: "bg-[linear-gradient(118deg,var(--arena-800)_0%,var(--arena-700)_50%,var(--arena-600)_100%)]",
    tab: "border-arena-500",
    ink: "text-arena-800",
    fill: "bg-arena-700",
    soft: "bg-arena-100",
    line: "border-arena-700/70",
  },
} as const satisfies Record<InfoTone, Record<string, string>>;

/** Three folder tabs, one per information tone (lilac · green · sand), to sit on top of a card. */
export function FolderTabs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-1 px-5", className)}>
      <span className="h-3 flex-1 !rounded-t-[10px] bg-lilac" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-accent" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-arena-400" />
    </div>
  );
}

/** Folder-tab label, as the section markers of the fichas ("1. Conceptos iniciales"). */
export function SectionTab({ children, tone = "green", className }: { children: ReactNode; tone?: InfoTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center !rounded-t-[10px] border-t-4 bg-white px-3.5 pt-1.5 pb-1 text-sm font-medium", TONE[tone].tab, TONE[tone].ink, className)}>
      {children}
    </span>
  );
}

/** Gradient band for page and section headers, in the information tone. */
export function TechBand({ tone = "green", className, children }: { tone?: InfoTone; className?: string; children: ReactNode }) {
  return <div className={cn(TONE[tone].band, "text-white", className)}>{children}</div>;
}

export function VarietyBadge({ tone = "green", children, className }: { tone?: InfoTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center !rounded-[10px] px-3.5 py-1.5 text-lg font-title text-white", TONE[tone].fill, className)}>{children}</span>;
}

export function Chip({ tone = "green", children, className }: { tone?: InfoTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center !rounded-full border px-3 py-1 text-sm tabular-nums", TONE[tone].line, TONE[tone].ink, className)}>{children}</span>;
}

/** THC:CBD proportion bar: forest for THC, lilac for CBD. */
export function RatioBar({ thc, cbd, label, tone = "green", className }: { thc: number; cbd: number; label?: string; tone?: InfoTone; className?: string }) {
  const total = thc + cbd || 1;
  const t = Math.max(6, Math.round((thc / total) * 100));
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className={cn("text-right font-light italic", TONE[tone].ink)}>{label}</p>}
      <div
        role="img"
        aria-label={`Proporción THC:CBD aproximada ${Math.round((thc / total) * 100)} a ${Math.round((cbd / total) * 100)}`}
        className="flex h-5 overflow-hidden !rounded-full text-[10px] font-medium tracking-wide"
      >
        <span className={cn("flex items-center pl-2.5 text-white", TONE[tone].fill)} style={{ width: `${t}%` }}>
          THC
        </span>
        <span className={cn("flex flex-1 items-center justify-end bg-lilac pr-2.5", TONE[tone].ink)}>CBD</span>
      </div>
    </div>
  );
}

/** Big fact block ("1 gota = 1 mg") with label/value pairs, in the information tone. */
export function KeyFact({ value, caption, rows, tone = "green", className }: { value: ReactNode; caption: ReactNode; rows: [string, ReactNode][]; tone?: InfoTone; className?: string }) {
  return (
    <div className={cn("grid gap-5 !rounded-card p-5 text-white @lg:grid-cols-[auto_1fr] @lg:items-center @lg:p-6", TONE[tone].band, className)}>
      <div className="flex items-center gap-3">
        <Droplet aria-hidden className="size-9 shrink-0 fill-white/90 stroke-none" />
        <div>
          <p className="text-[clamp(1.6rem,1.2rem+2vw,2.25rem)] leading-none font-title whitespace-nowrap tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-white/75">{caption}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm @lg:border-l @lg:border-white/25 @lg:pl-6">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-white/75">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Dark rule rows ("Regla práctica"), in the information tone. */
export function RuleList({ items, tone = "green", className }: { items: ReactNode[]; tone?: InfoTone; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, i) => (
        <li key={i} className={cn("!rounded-[12px] px-5 py-3.5 text-sm leading-relaxed text-white [&_strong]:font-medium", TONE[tone].fill)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Numbered step cards on lavender (dosage-scheme style). */
export function StepCards({ steps, tone = "green", className }: { steps: { title: string; meta?: string; value: ReactNode; detail?: ReactNode }[]; tone?: InfoTone; className?: string }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {steps.map((s, i) => (
        <li key={s.title} className={cn("flex flex-col gap-2.5 !rounded-card border border-mist-line p-4 sm:p-5", TONE[tone].soft, TONE[tone].ink)}>
          <div className="flex items-center gap-3">
            <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center !rounded-[10px] font-medium text-white tabular-nums", TONE[tone].fill)}>{i + 1}</span>
            <div className="min-w-0">
              <p className="font-medium leading-tight">
                <span className="sr-only">Paso {i + 1}: </span>
                {s.title}
              </p>
              {s.meta && <p className="mt-0.5 text-[11px] tracking-[0.12em] uppercase opacity-80">{s.meta}</p>}
            </div>
          </div>
          <span className="text-xl font-title tabular-nums">{s.value}</span>
          {s.detail && <span className="text-sm leading-relaxed opacity-90">{s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

export type StepStatus = "done" | "current" | "upcoming";

const STEP_STATUS: Record<StepStatus, { label: string; eyebrow: string; title: string }> = {
  // Done is always the plant green, also inside the lilac joining flow: it reads as "resolved".
  done: { label: "Completo", eyebrow: "text-[var(--hoja-700)]", title: "text-[var(--hoja-800)]" },
  current: { label: "En curso", eyebrow: "text-forest", title: "text-forest" },
  upcoming: { label: "Después", eyebrow: "text-text-muted", title: "text-foreground/70" },
};

/**
 * Where a person stands in a process: a quiet vertical timeline. Done steps carry a green check,
 * the current one is a filled circle, the next ones are outlined and muted.
 */
export function ProcessTimeline({ steps, className }: { steps: { title: string; status: StepStatus; detail?: ReactNode; meta?: string }[]; className?: string }) {
  return (
    // Equal rows keep the circles evenly spaced and the texts share one left edge, at any width.
    <ol className={cn("grid auto-rows-fr gap-3", className)}>
      {steps.map((s, i) => {
        const st = STEP_STATUS[s.status];
        const last = i === steps.length - 1;
        return (
          <li key={s.title} aria-current={s.status === "current" ? "step" : undefined} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 sm:gap-x-4">
            {!last && (
              // From under this circle to just above the next one, across the gap between rows.
              <span aria-hidden className={cn("absolute top-11 -bottom-2 left-[1.125rem] w-px -translate-x-1/2", s.status === "done" ? "bg-[var(--hoja-300)]" : "bg-mist-line")} />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-9 items-center justify-center !rounded-full text-sm font-medium tabular-nums",
                s.status === "done" && "bg-[var(--hoja-700)] text-white",
                s.status === "current" && "bg-forest text-white ring-4 ring-forest-soft",
                s.status === "upcoming" && "border border-mist-line bg-white text-text-muted",
              )}
            >
              {s.status === "done" ? <Check className="size-4" strokeWidth={2.25} /> : i + 1}
            </span>
            <div className="pt-1 pb-2">
              <p className={cn("text-[11px] font-medium tracking-[0.14em] uppercase", st.eyebrow)}>
                <span className="sr-only">Paso {i + 1}, </span>
                {st.label}
                {s.meta && <span className="text-text-muted"> · {s.meta}</span>}
              </p>
              <p className={cn("mt-1 font-title text-lg leading-snug", st.title)}>{s.title}</p>
              {s.detail && <p className="mt-1 text-sm leading-relaxed text-text-muted">{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Checked list, as the "indicaciones" of the variety cards. */
export function CheckList({ items, tone = "green", className }: { items: ReactNode[]; tone?: InfoTone; className?: string }) {
  return (
    <ul className={cn("space-y-1.5", TONE[tone].ink, className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center !rounded-[4px]", TONE[tone].fill)}>
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** White card with a folder-tab label on top, the main information container of the fichas. */
export function TabbedCard({
  tab,
  tone = "green",
  id,
  className,
  bodyClassName,
  level = 2,
  fill,
  children,
}: {
  tab: ReactNode;
  tone?: InfoTone;
  id?: string;
  className?: string;
  bodyClassName?: string;
  /** The tab is the section heading. */
  level?: 2 | 3;
  /** Stretch to the row height (equal-height card grids). */
  fill?: boolean;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section id={id} className={cn("scroll-mt-6", fill && "flex h-full flex-col", className)}>
      <Heading className="relative z-10 -mb-px flex">
        <SectionTab tone={tone} className="border-x border-mist-line text-[0.9375rem]">
          {tab}
        </SectionTab>
      </Heading>
      <div className={cn("!rounded-card !rounded-tl-none border border-mist-line bg-white p-5 shadow-[0_18px_40px_-32px_rgb(29_52_30/0.55)] sm:p-6", fill && "flex flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}
