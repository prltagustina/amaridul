import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Editorial section shared by the institutional home and /qr: a header column (eyebrow,
 * Cormorant title, intro) beside the content. "dark" is for sections over a photo.
 */
export function EditorialSection({
  id,
  eyebrow,
  title,
  intro,
  tone = "light",
  decor,
  aside,
  stacked = false,
  className,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "light" | "dark";
  /** Absolutely positioned background layers (glows, photos). */
  decor?: ReactNode;
  /** Beside the header's text when `stacked` (a video, for instance); otherwise under the intro. */
  aside?: ReactNode;
  /** The header above the content, both at full width (for content that needs the room). */
  stacked?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("page-gutter relative isolate overflow-hidden py-20 sm:py-28", className)}>
      {decor}
      <div className={cn("nav-column", stacked ? "space-y-10 sm:space-y-12" : "grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14")}>
        {/* Stacked with an aside: the text and the aside side by side on a computer (the aside
            under the text on a phone). Otherwise the aside goes under the intro. */}
        <header className={stacked ? (aside ? "grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-14" : undefined) : "md:self-start"}>
          <div>
            <p className={cn("text-eyebrow", dark ? "text-arena-300" : "text-arena-700")}>{eyebrow}</p>
            <h2 id={`${id}-title`} className={cn("mt-2 text-h1", dark ? "text-white" : "text-forest")}>
              {title}
            </h2>
            {intro && <p className={cn("mt-4 text-body", stacked ? "max-w-xl" : "max-w-sm", dark ? "text-white/80" : "text-text-muted")}>{intro}</p>}
          </div>
          {aside && <div className={stacked ? undefined : "mt-8"}>{aside}</div>}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
