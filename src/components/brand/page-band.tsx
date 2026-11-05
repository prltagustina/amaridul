import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InfoTone } from "@/components/ui/technical";

const columns = { content: "content-column", nav: "nav-column", narrow: "mx-auto w-full max-w-md", wide: "portal-column" } as const;

// The section's colour as a solid fill at the same depth (step 800, as Dambar heads its fichas),
// with white text (9.8:1 or more) and the eyebrow in a light accent of the family: green with a
// light green; trámites in Dambar's indigo with its pink; asociarse in the indigo with a lavender.
// The pink is never a large area: only that small accent.
const BAND: Record<InfoTone, { fill: string; eyebrow: string }> = {
  green: { fill: "bg-hoja-800", eyebrow: "text-hoja-300" },
  lilac: { fill: "bg-lila-800", eyebrow: "text-lila-300" },
  magenta: { fill: "bg-lila-800", eyebrow: "text-rosa-300" },
};

/**
 * Page header: a band in the section's solid colour (green for the member's own world and its
 * help, Dambar's indigo for trámites and for asociarse) with the way back, where you are, the title
 * in Cormorant and one short line, in white. Same rhythm on every page, so nothing shifts between
 * sections. `children` sit under the line and inherit the white.
 */
export function PageBand({
  eyebrow,
  title,
  description,
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
  /** Kept for compatibility: the header no longer carries a folder tab. */
  tab?: ReactNode;
  width?: keyof typeof columns;
  align?: "left" | "center";
  /** The section's colour (green, magenta for trámites, lilac for asociarse). */
  tone?: InfoTone;
  /** Member portal: the same fixed rhythm on every page. */
  compact?: boolean;
  children?: ReactNode;
}) {
  const center = align === "center";
  const band = BAND[tone];
  return (
    <section className={cn("page-gutter text-white", band.fill, compact ? "pt-7 pb-8 sm:pt-10 sm:pb-9" : "pt-10 pb-10 sm:pt-14 sm:pb-12")}>
      <div className={cn(columns[width], center && "text-center")}>
        {(back || eyebrow) && (
          <div className={cn("flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm", center && "justify-center")}>
            {back && (
              <Link href={back.href} className="-my-2.5 -ml-1 inline-flex items-center gap-1 py-2.5 pr-1 pl-1 font-medium !text-white underline-offset-4 hover:underline focus-visible:!outline-white">
                <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
                {back.label}
              </Link>
            )}
            {back && eyebrow && (
              <span aria-hidden className="text-white/60">
                /
              </span>
            )}
            {eyebrow && <p className={cn("text-eyebrow", band.eyebrow)}>{eyebrow}</p>}
          </div>
        )}
        <h1 className={cn("text-h1 text-balance", back || eyebrow ? "mt-3" : "")}>{title}</h1>
        {description && <p className={cn("mt-2 measure text-[1.0625rem] leading-relaxed", center && "mx-auto")}>{description}</p>}
        {children}
      </div>
    </section>
  );
}
