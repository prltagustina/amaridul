import type { ReactNode } from "react";
import { Check, Droplet } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Information components in the manner of the Dambar fichas técnicas (folder tabs, gradient
 * bands, data blocks, THC:CBD ratio bars, outlined chips, rule rows, numbered steps), drawn
 * with the Amarí Dul palette. The three brand colours, by section: green (the member's own world
 * and every action), magenta (trámites y salud: REPROCANN) and lilac (asociarse and orientation).
 */

export type InfoTone = "green" | "lilac" | "magenta";

/** A section's colour as a fill, at the same weight in the three (whole class names, for Tailwind). */
export const ACCENT_BAR: Record<InfoTone, string> = { green: "bg-hoja-500", magenta: "bg-rosa-400", lilac: "bg-lila-500" };
/**
 * The coloured top edge of a sheet (a panel, the open tab): 3 px that are the sheet's own edge,
 * following its rounded corners and thinning into the side borders. Its 1 px border takes the
 * colour and an inset line adds the rest, so the sheet keeps the size of the others.
 */
export const TOP_EDGE: Record<InfoTone, string> = {
  green: "border-t-hoja-500 shadow-[inset_0_2px_0_0_var(--hoja-500)]",
  magenta: "border-t-rosa-400 shadow-[inset_0_2px_0_0_var(--rosa-400)]",
  lilac: "border-t-lila-500 shadow-[inset_0_2px_0_0_var(--lila-500)]",
};
/** A section's eyebrow, in its colour (the pink sections write in Dambar's indigo, as its fichas do). */
export const EYEBROW: Record<InfoTone, string> = { green: "text-accent", magenta: "text-lila-800", lilac: "text-lila-700" };

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
  magenta: {
    // Dambar's pink with its indigo ink, as in its fichas.
    band: "bg-rosa-200 !text-lila-800",
    tab: "border-rosa-300",
    ink: "text-lila-800",
    fill: "bg-lila-800",
    soft: "bg-rosa-50",
    line: "border-rosa-300",
  },
} as const satisfies Record<InfoTone, Record<string, string>>;

/** Three folder tabs, one per brand colour (lilac · green · magenta), to sit on top of a card. */
export function FolderTabs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-1 px-5", className)}>
      <span className="h-3 flex-1 !rounded-t-[10px] bg-lilac" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-accent" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-rosa-300" />
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

/**
 * THC:CBD proportion bar: forest for THC, lilac for CBD, each part named inside. Each part keeps
 * room for its name (2.75rem), so a very uneven ratio (31:1) never cuts «CBD».
 */
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
        <span className={cn("flex min-w-[2.75rem] items-center pl-2.5 text-white", TONE[tone].fill)} style={{ width: `${t}%` }}>
          THC
        </span>
        <span className={cn("flex min-w-[2.75rem] flex-1 items-center justify-end bg-lilac pr-2.5", TONE[tone].ink)}>CBD</span>
      </div>
    </div>
  );
}

/** "1:2" or "5:1", rounded to the nearest whole ratio. */
export function ratioLabel(thc: number, cbd: number) {
  if (!thc || !cbd) return thc ? "THC" : "CBD";
  return thc >= cbd ? `${Math.round(thc / cbd)}:1` : `1:${Math.round(cbd / thc)}`;
}

/**
 * The two main cannabinoids as large figures, each on its own tint (THC green, CBD lilac), and
 * under them their proportion on the ratio bar. Only the values the lab gave.
 */
export function CannabinoidFigures({ thc, cbd, unit, className }: { thc: number | null; cbd: number | null; /** As shown after the figure: «%», «mg/ml». */ unit: string; className?: string }) {
  const figures = [
    { key: "THC", name: "Tetrahidrocannabinol", value: thc, tint: "bg-hoja-100", ink: "text-forest" },
    { key: "CBD", name: "Cannabidiol", value: cbd, tint: "bg-lila-100", ink: "text-lila-800" },
  ].filter((f): f is typeof f & { value: number } => f.value !== null);
  const t = thc ?? 0;
  const c = cbd ?? 0;
  return (
    <div className={cn("space-y-5", className)}>
      <dl className={cn("grid gap-3", figures.length > 1 ? "grid-cols-2" : null)}>
        {figures.map((f) => (
          <div key={f.key} className={cn("flex min-w-0 flex-col !rounded-card px-4 pt-4 pb-5 @md:px-5 @md:pt-5", f.tint)}>
            <dt>
              <span className={cn("block text-eyebrow", f.ink)}>{f.key}</span>
              <span lang="es" className="mt-1 block text-sm text-text-muted hyphens-auto">
                {f.name}
              </span>
            </dt>
            <dd className={cn("mt-auto pt-4 font-display text-[2.75rem] leading-none lining-nums tabular-nums @md:text-[3.25rem]", f.ink)}>
              {f.value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
              <span className="ml-1.5 font-sans text-base text-text-muted">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      {t > 0 && c > 0 && (
        <div>
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-text-muted">Proporción THC:CBD</span>
            <span className="font-medium text-forest tabular-nums">≈ {ratioLabel(t, c)}</span>
          </p>
          <RatioBar thc={t} cbd={c} className="mt-2" />
        </div>
      )}
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
 * the current one is a filled circle on a slightly raised card, the next ones are outlined and muted.
 */
export function ProcessTimeline({ steps, className }: { steps: { title: string; status: StepStatus; detail?: ReactNode; meta?: string }[]; className?: string }) {
  return (
    // Equal rows keep the circles evenly spaced, and every step sits in the same card, at any width.
    <ol className={cn("grid auto-rows-fr gap-3", className)}>
      {steps.map((s, i) => {
        const st = STEP_STATUS[s.status];
        const last = i === steps.length - 1;
        return (
          <li key={s.title} aria-current={s.status === "current" ? "step" : undefined} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 sm:gap-x-4">
            {!last && (
              // From under this circle to just above the next one, across the gap between rows.
              <span aria-hidden className={cn("absolute top-[3.125rem] -bottom-2 left-[1.125rem] w-px -translate-x-1/2", s.status === "done" ? "bg-[var(--hoja-300)]" : "bg-mist-line")} />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-2.5 flex size-9 items-center justify-center !rounded-full text-sm font-medium tabular-nums",
                s.status === "done" && "bg-[var(--hoja-700)] text-white",
                s.status === "current" && "bg-forest text-white ring-4 ring-forest-soft",
                s.status === "upcoming" && "border border-mist-line bg-white text-text-muted",
              )}
            >
              {s.status === "done" ? <Check className="size-4" strokeWidth={2.25} /> : i + 1}
            </span>
            <div
              className={cn(
                "h-full !rounded-card border px-4 py-3.5 sm:px-5",
                s.status === "current" ? "border-forest/25 bg-white shadow-[0_8px_24px_-18px_rgb(40_36_28/0.35)]" : "border-mist-line",
                s.status === "done" && "bg-white",
                s.status === "upcoming" && "bg-white/55",
              )}
            >
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

/**
 * A titled panel: the title (once a folder tab on top) inside a plain white panel with a hairline
 * border and no shadow, like every other container of the system.
 */
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
    <section id={id} className={cn("relative scroll-mt-6 !rounded-card border border-mist-line bg-white", tone !== "green" && TOP_EDGE[tone], fill && "flex h-full flex-col", className)}>
      <Heading className={cn("px-5 pt-5 text-h3 sm:px-6 sm:pt-6", tone === "lilac" ? "text-lilac-ink" : "text-forest")}>{tab}</Heading>
      <div className={cn("px-5 pt-4 pb-5 sm:px-6 sm:pb-6", fill && "flex flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}
