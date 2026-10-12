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
      <div className="nav-column flex h-16 items-center justify-between gap-4">
        <Link href={homeHref} aria-label="Amarí Dul, inicio" className="flex min-h-11 items-center gap-2">
          <BrandButterfly onPhoto={overPhoto} className={overPhoto ? "!h-8" : "!h-7 sm:!h-8"} />
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
          <img
            src={overPhoto ? "/brand/wordmark-bold-cream.svg" : "/brand/wordmark-bold.svg"}
            alt=""
            className={cn("!w-auto", overPhoto ? "!h-6 drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" : "!h-[1.375rem] sm:!h-6")}
          />
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
        "inline-flex min-h-10 items-center gap-2 !rounded-full px-4 text-sm tracking-wide transition-colors motion-safe-only",
        tone === "over-photo"
          ? "border border-white/50 bg-foreground/20 !text-white backdrop-blur-sm hover:bg-foreground/35"
          : "border border-forest/40 !text-forest hover:bg-forest-soft",
      )}
    >
      <UserRound aria-hidden className="size-4" strokeWidth={1.5} />
      Acceso socios
    </Link>
  );
}
