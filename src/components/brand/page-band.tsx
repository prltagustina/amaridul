import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionTab, TONE, type InfoTone } from "@/components/ui/technical";

const columns = { content: "content-column", nav: "nav-column", narrow: "mx-auto w-full max-w-md", wide: "admin-column" } as const;

/**
 * Page header band in the manner of the Dambar fichas: forest → violet gradient, title,
 * and a folder tab resting on the bottom edge that opens into the page.
 */
export function PageBand({
  eyebrow,
  title,
  description,
  tab,
  width = "content",
  align = "left",
  tone = "green",
  compact = false,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  tab?: ReactNode;
  width?: keyof typeof columns;
  align?: "left" | "center";
  tone?: InfoTone;
  /** Member portal: same fixed rhythm on every page so the band never changes height. */
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={cn("page-gutter relative overflow-hidden text-white", compact ? "pt-8 sm:pt-10" : "pt-10 sm:pt-14", TONE[tone].band)}>
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 !rounded-full bg-white/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 size-72 !rounded-full bg-white/5 blur-3xl" />
      <div className={cn("relative", columns[width], align === "center" && "text-center")}>
        {eyebrow && <p className="text-[11px] font-medium tracking-[0.2em] text-white/80 uppercase">{eyebrow}</p>}
        <h1 className={cn("mt-2 font-display leading-[1.08] font-medium text-balance", compact ? "truncate text-[clamp(1.9rem,1.6rem+1.4vw,2.5rem)]" : "text-[clamp(2.1rem,1.6rem+2.4vw,3rem)]")}>{title}</h1>
        {description && <p className={cn("max-w-xl text-[1.0625rem] leading-relaxed font-light text-white/85", compact ? "mt-1.5 truncate" : "mt-3", align === "center" && "mx-auto")}>{description}</p>}
        {children}
        <div className={cn("flex", compact ? "mt-6" : "mt-8", align === "center" && "justify-center", !tab && "h-4")}>
          {tab && <SectionTab tone={tone} className="!bg-background">{tab}</SectionTab>}
        </div>
      </div>
    </section>
  );
}
