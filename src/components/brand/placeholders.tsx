import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Editorial stand-in for a photograph that has not been supplied yet. Never stock imagery. */
export function PhotoPlaceholder({ label = "Foto pendiente", className, children, tagPosition = "bottom" }: { label?: string; className?: string; children?: ReactNode; tagPosition?: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[radial-gradient(120%_80%_at_20%_10%,#c7d3bf_0%,transparent_55%),radial-gradient(90%_70%_at_85%_90%,#d9c9da_0%,transparent_55%),linear-gradient(160deg,#9fb093_0%,#6f8566_45%,#56694f_100%)]",
        className,
      )}
    >
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.18]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 400">
        <defs>
          <pattern id="leaf-pattern" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
            <path d="M10 40 C 25 25, 55 25, 70 40 C 55 55, 25 55, 10 40 Z M10 40 L70 40" fill="none" stroke="#f2ebdd" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#leaf-pattern)" />
      </svg>
      <span
        className={cn(
          "absolute right-3 z-10 !rounded-full bg-foreground/55 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm",
          tagPosition === "bottom" ? "bottom-3" : "top-3",
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
