import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  path: string;
  states: readonly string[];
  current: string;
  /** Query parameter that carries the state. */
  param?: string;
  /** Other query parameters to keep when switching. */
  keep?: Record<string, string | undefined>;
  label?: string;
};

/**
 * Development-only state switcher. Hidden by CSS unless the layout sets data-demo,
 * and every demo route also returns 404 outside the demo environment.
 */
export function DevStateBar({ path, states, current, param = "estado", keep = {}, label = "Estado" }: Props) {
  const href = (s: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    if (s !== states[0]) q.set(param, s);
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
  };
  return (
    <nav
      aria-label="Estados de demostración (solo desarrollo)"
      className="dev-only fixed right-3 bottom-3 z-[60] max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 !rounded-full border border-dashed border-accent/60 bg-white/95 px-2 py-1.5 text-[11px] shadow-sm backdrop-blur"
    >
      <span className="px-1.5 font-medium uppercase tracking-[0.12em] text-accent">Dev · {label}</span>
      {states.map((s) => (
        <Link
          key={s}
          href={href(s)}
          aria-current={s === current ? "true" : undefined}
          scroll={false}
          className={cn(
            "!rounded-full px-2 py-0.5",
            s === current ? "bg-accent !text-white" : "!text-text-muted hover:bg-info-bg",
          )}
        >
          {s}
        </Link>
      ))}
      <Link href="/dev/recorrido" className="!rounded-full px-2 py-0.5 !text-accent underline underline-offset-2">
        recorrido
      </Link>
    </nav>
  );
}
