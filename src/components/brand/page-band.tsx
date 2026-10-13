import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
  back,
  children,
}: {
  eyebrow?: ReactNode;
  /** Link to the previous view, shown before the eyebrow. */
  back?: { href: string; label: string };
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
    <section className={cn("page-gutter relative overflow-hidden text-white", compact ? "pt-6 sm:pt-8" : "pt-10 sm:pt-14", TONE[tone].band)}>
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 !rounded-full bg-white/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 size-72 !rounded-full bg-white/5 blur-3xl" />
      <div className={cn("relative", columns[width], align === "center" && "text-center")}>
        {back ? (
          // Breadcrumb on the eyebrow line, so a band with a way back keeps the same height as one without.
          <div className={cn("flex items-center gap-2.5 text-[11px] font-medium tracking-[0.2em] uppercase", align === "center" && "justify-center")}>
            <Link href={back.href} className="-my-3 inline-flex items-center gap-1 py-3 !text-white underline-offset-4 hover:underline">
              <ChevronLeft aria-hidden className="size-3.5" strokeWidth={2} />
              {back.label}
            </Link>
            {eyebrow && (
              <>
                <span aria-hidden className="text-white/50">·</span>
                <p className="text-white/80">{eyebrow}</p>
              </>
            )}
          </div>
        ) : (
          eyebrow && <p className="text-[11px] font-medium tracking-[0.2em] text-white/80 uppercase">{eyebrow}</p>
        )}
        <h1 className={cn("mt-3.5 font-display leading-[1.08] font-medium text-balance", compact ? "text-[clamp(1.9rem,1.6rem+1.4vw,2.5rem)]" : "text-[clamp(2.1rem,1.6rem+2.4vw,3rem)]")}>{title}</h1>
        {description && <p className={cn("max-w-xl text-[1.0625rem] leading-relaxed font-light text-white/85", compact ? "mt-1.5" : "mt-3", align === "center" && "mx-auto")}>{description}</p>}
        {children}
        <div className={cn("flex", compact ? "mt-5" : "mt-8", align === "center" && "justify-center", !tab && "h-4")}>
          {tab && <SectionTab tone={tone} className="!bg-background">{tab}</SectionTab>}
        </div>
      </div>
    </section>
  );
}
