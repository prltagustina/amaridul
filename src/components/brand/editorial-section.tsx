import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Editorial section shared by the institutional home and /qr: a header column (eyebrow,
 * Cormorant title, hairline) beside the content. "dark" is for sections over a photo.
 */
export function EditorialSection({
  id,
  eyebrow,
  title,
  intro,
  tone = "light",
  decor,
  className,
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  tone?: "light" | "dark";
  /** Absolutely positioned background layers (photo, parallax marks). */
  decor?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("page-gutter relative isolate overflow-hidden py-20 sm:py-28", className)}>
      {decor}
      <div className="nav-column grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
        <header className="md:sticky md:top-[calc(var(--nav-h)+2.5rem)] md:self-start">
          <p className={cn("text-eyebrow", dark ? "text-arena-300" : "text-arena-700")}>{eyebrow}</p>
          <h2 id={`${id}-title`} className={cn("mt-2 text-h1", dark ? "text-white" : "text-forest")}>
            {title}
          </h2>
          {intro && <p className={cn("mt-4 max-w-sm text-body", dark ? "text-white/80" : "text-text-muted")}>{intro}</p>}
          <span aria-hidden className={cn("mt-6 block h-px w-16", dark ? "bg-white/40" : "bg-arena-400")} />
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
