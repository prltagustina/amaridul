import Link from "next/link";
import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Minimal header. "over-photo": transparent with cream marks on top of the hero photograph.
 * "light": cream background for forms (/sumate, /admision, login).
 */
export function MinimalHeader({ tone = "light", right, homeHref = "/qr" }: { tone?: "over-photo" | "light"; right?: ReactNode; homeHref?: string }) {
  const overPhoto = tone === "over-photo";
  return (
    <header className={cn("page-gutter", overPhoto ? "absolute inset-x-0 top-0 z-20" : "border-b border-border/70 bg-background")}>
      <div className="nav-column flex h-[var(--nav-h)] items-center justify-between gap-4">
        <Link href={homeHref} aria-label="Amarí Dul, inicio" className={cn("flex min-h-11 items-center gap-2", overPhoto && "max-md:invisible")}>
          <BrandLockup tone={overPhoto ? "cream" : "forest"} onPhoto={overPhoto} />
        </Link>
        {right}
      </div>
    </header>
  );
}

/** The butterfly from the logo, set to the left of the wordmark at the same height. Cream over the hero photo. */
export function BrandButterfly({ onPhoto = false, className }: { onPhoto?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVG
    <img
      src="/brand/logo.svg"
      alt=""
      className={cn(
        "!w-auto",
        onPhoto && "[filter:brightness(0)_invert(0.93)_sepia(0.18)_drop-shadow(0_1px_6px_rgba(0,0,0,0.35))]",
        className,
      )}
    />
  );
}

export function MemberAccessLink({ tone = "light" }: { tone?: "over-photo" | "light" }) {
  return (
    <Link
      href="/qr/login"
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 !rounded-full px-3 text-sm whitespace-nowrap min-[360px]:px-4 transition-colors motion-safe-only",
        tone === "over-photo"
          ? "border border-white/50 bg-foreground/20 !text-white backdrop-blur-sm hover:bg-foreground/35"
          : "border border-forest/40 !text-forest hover:bg-forest-soft",
      )}
    >
      <UserRound aria-hidden className="size-4" strokeWidth={1.5} />
      {/* Below 360px only the icon fits beside the lockup. */}
      <span className="max-[359px]:sr-only">Acceso socios</span>
    </Link>
  );
}

const LOCKUP = {
  header: { butterfly: "!h-9 min-[420px]:!h-10", column: "w-[7.75rem] gap-1 min-[420px]:w-[8.75rem]", text: "text-[0.4375rem] tracking-[0.2em] min-[420px]:text-[0.5rem] min-[420px]:tracking-[0.22em]" },
  footer: { butterfly: "!h-12", column: "w-[11.25rem] gap-1.5", text: "text-[0.5625rem] tracking-[0.28em]" },
} as const;

/**
 * Brand lockup as in the circular logo: butterfly, wordmark, and the tagline between hairlines
 * beneath it. "cream" sits on green or on the hero photo (with a soft shadow when `onPhoto`).
 */
export function BrandLockup({
  tone = "forest",
  size = "header",
  tagline = "Asociación civil",
  onPhoto = false,
  alt = "",
}: {
  tone?: "forest" | "cream";
  size?: keyof typeof LOCKUP;
  tagline?: string;
  onPhoto?: boolean;
  alt?: string;
}) {
  const cream = tone === "cream";
  const s = LOCKUP[size];
  return (
    <span className={cn("flex items-center gap-2.5", onPhoto && "drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]")}>
      <BrandButterfly onPhoto={cream} className={s.butterfly} />
      <span className={cn("flex flex-col", s.column)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src={cream ? "/brand/wordmark-bold-cream.svg" : "/brand/wordmark-bold.svg"} alt={alt} className="!h-auto w-full" />
        <span className={cn("flex items-center gap-2", cream ? "text-white/85" : "text-hoja-700")}>
          <span aria-hidden className="h-px flex-1 bg-current opacity-60" />
          <span className={cn("whitespace-nowrap uppercase", s.text)}>{tagline}</span>
          <span aria-hidden className="h-px flex-1 bg-current opacity-60" />
        </span>
      </span>
    </span>
  );
}
