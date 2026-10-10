import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DevTag } from "@/components/ui/display";

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

function leafPath(len: number) {
  const w = len * 0.32;
  return `M0 0 C ${len * 0.25} ${-w}, ${len * 0.75} ${-w}, ${len} 0 C ${len * 0.75} ${w}, ${len * 0.25} ${w}, 0 0 Z M0 0 L ${len * 0.92} 0`;
}

/** Provisional line-art branch (placeholder for the commissioned botanical illustrations). */
export function BotanicalBranch({ className, flip = false }: { className?: string; flip?: boolean }) {
  const leaves = [0.18, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9];
  // Quadratic stem from bottom-left to top-right.
  const p0 = [20, 230],
    p1 = [90, 120],
    p2 = [230, 30];
  const at = (t: number) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
  ];
  return (
    <span className={cn("relative inline-block", className)}>
      <svg aria-hidden viewBox="0 0 250 250" className={cn("h-full w-full", flip && "-scale-x-100")} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${p0} Q${p1} ${p2}`} />
        {leaves.map((t, i) => {
          const [x, y] = at(t);
          const side = i % 2 === 0 ? -1 : 1;
          const angle = -40 + side * 55 + t * 10;
          const len = 58 - t * 26;
          return <path key={t} d={leafPath(len)} transform={`translate(${x} ${y}) rotate(${angle})`} />;
        })}
      </svg>
      <DevTag className="absolute bottom-0 left-0">Ilustración provisional</DevTag>
    </span>
  );
}

/** Provisional lavender sprig in the accent tones of the second reference. */
export function LavenderSprig({ className }: { className?: string }) {
  const buds = Array.from({ length: 9 }, (_, i) => i);
  return (
    <span className={cn("relative inline-block", className)}>
      <svg aria-hidden viewBox="0 0 120 260" className="h-full w-full" fill="none" strokeLinecap="round">
        <path d="M60 255 C 58 190, 62 130, 60 40" stroke="currentColor" strokeWidth="1" />
        <path d="M60 200 C 45 185, 35 170, 30 150 M60 170 C 75 155, 85 140, 88 120" stroke="currentColor" strokeWidth="1" />
        {buds.map((i) => (
          <ellipse key={i} cx={60 + (i % 2 ? 6 : -6)} cy={40 + i * 9} rx="4.5" ry="7" transform={`rotate(${i % 2 ? 20 : -20} ${60 + (i % 2 ? 6 : -6)} ${40 + i * 9})`} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="0.8" />
        ))}
      </svg>
    </span>
  );
}
