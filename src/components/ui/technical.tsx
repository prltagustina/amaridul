import type { ReactNode } from "react";
import { Check, Droplet } from "lucide-react";
import { cn } from "@/lib/cn";

/*
 * Technical layer adapted from the Dambar fichas técnicas: indigo data blocks, folder tabs,
 * THC:CBD ratio bars and outlined chips. Used where the content is technical (lots, dosage,
 * member data); the editorial pages keep the Amarí Dul language.
 */

/** Three folder tabs (pink · indigo · peach) to sit on top of a white card. */
export function FolderTabs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-1 px-5", className)}>
      <span className="h-3 flex-1 !rounded-t-[10px] bg-pink" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-indigo-2" />
      <span className="h-3 flex-1 !rounded-t-[10px] bg-peach" />
    </div>
  );
}

/** Folder-tab label, as the section markers of the fichas ("1. Conceptos iniciales"). */
export function SectionTab({ children, tone = "pink", className }: { children: ReactNode; tone?: "pink" | "peach" | "indigo"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center !rounded-t-[10px] border-t-4 bg-white px-3.5 pt-1.5 pb-1 text-sm font-medium text-indigo",
        tone === "pink" && "border-pink",
        tone === "peach" && "border-peach",
        tone === "indigo" && "border-indigo-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Indigo → blue gradient band for technical headers. */
export function TechBand({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("bg-[linear-gradient(110deg,var(--indigo)_0%,#43418e_55%,var(--indigo-2)_100%)] text-white", className)}>{children}</div>;
}

export function VarietyBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center !rounded-[10px] bg-indigo px-3.5 py-1.5 text-lg font-medium tracking-tight text-white", className)}>{children}</span>;
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center !rounded-full border border-indigo/70 px-3 py-1 text-sm text-indigo tabular-nums", className)}>{children}</span>;
}

/** THC:CBD proportion bar: indigo for THC, pink for CBD. */
export function RatioBar({ thc, cbd, label, className }: { thc: number; cbd: number; label?: string; className?: string }) {
  const total = thc + cbd || 1;
  const t = Math.max(6, Math.round((thc / total) * 100));
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-right font-light text-indigo italic">{label}</p>}
      <div
        role="img"
        aria-label={`Proporción THC:CBD aproximada ${Math.round((thc / total) * 100)} a ${Math.round((cbd / total) * 100)}`}
        className="flex h-5 overflow-hidden !rounded-full text-[10px] font-medium tracking-wide"
      >
        <span className="flex items-center bg-indigo pl-2.5 text-white" style={{ width: `${t}%` }}>
          THC
        </span>
        <span className="flex flex-1 items-center justify-end bg-pink pr-2.5 text-indigo">CBD</span>
      </div>
    </div>
  );
}

/** Big indigo fact block ("1 gota = 1 mg") with label/value pairs. */
export function KeyFact({ value, caption, rows, className }: { value: ReactNode; caption: ReactNode; rows: [string, ReactNode][]; className?: string }) {
  return (
    <div className={cn("grid gap-5 !rounded-card bg-indigo p-5 text-white @lg:grid-cols-[auto_1fr] @lg:items-center @lg:p-6", className)}>
      <div className="flex items-center gap-3">
        <Droplet aria-hidden className="size-9 shrink-0 fill-white/90 stroke-none" />
        <div>
          <p className="text-[clamp(1.6rem,1.2rem+2vw,2.25rem)] leading-none font-medium tracking-tight whitespace-nowrap tabular-nums">{value}</p>
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

/** Dark indigo rule rows ("Regla práctica para empezar"). */
export function RuleList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, i) => (
        <li key={i} className="!rounded-[12px] bg-indigo px-5 py-3.5 text-sm leading-relaxed text-white [&_strong]:font-medium">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Numbered step cards on lavender (dosage-scheme style). */
export function StepCards({ steps, className }: { steps: { title: string; meta?: string; value: ReactNode; detail?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col gap-2 !rounded-card border border-lavender-line bg-lavender p-4 text-indigo">
          <span className="text-2xl leading-none font-medium tabular-nums">{i + 1}.</span>
          <span className="font-medium">{s.title}</span>
          {s.meta && <span className="text-[11px] tracking-[0.12em] uppercase opacity-80">{s.meta}</span>}
          <span className="mt-1 text-lg font-medium tabular-nums">{s.value}</span>
          {s.detail && <span className="text-xs leading-relaxed opacity-85">{s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Checked list in indigo, as the "indicaciones" of the variety cards. */
export function CheckList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("space-y-1.5 text-indigo", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center !rounded-[4px] bg-indigo">
            <Check className="size-3 text-white" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
