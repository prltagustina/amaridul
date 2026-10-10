import { cn } from "@/lib/cn";

/**
 * Circular lockup from the references, built from the real brand SVGs.
 * Sizes itself through container units, so the className sets the width.
 */
export function CircleLogo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Amarí Dul, asociación civil"}
      aria-hidden={decorative || undefined}
      className={cn("relative aspect-square !rounded-full bg-background/95 shadow-[0_10px_40px_-12px_rgba(26,26,24,0.35)] [container-type:inline-size]", className)}
    >
      <span aria-hidden className="absolute inset-[5%] !rounded-full border border-brand/35" />
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-[3.5cqi] px-[15%]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/brand/logo.svg" alt="" className="w-[46%] !h-auto" />
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/brand/wordmark.svg" alt="" className="-mt-[1.5cqi] w-full !h-auto" />
        <div className="flex w-full items-center gap-[2.5cqi] text-brand">
          <span className="h-px flex-1 bg-brand/70" />
          <span className="whitespace-nowrap text-[3.6cqi] font-light uppercase tracking-[0.35em]">Asociación civil</span>
          <span className="h-px flex-1 bg-brand/70" />
        </div>
        <span className="size-[1.6cqi] !rounded-full bg-brand" />
      </div>
    </div>
  );
}
