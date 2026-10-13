import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-foreground",
  brand: "bg-forest-soft text-forest",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  error: "bg-error-bg text-error-fg",
  info: "bg-info-bg text-info-fg",
};

export function StatusBadge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 !rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", toneClasses[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

type CardProps = ComponentProps<"div"> & { variant?: "surface" | "sunken" | "outline"; padded?: boolean };

export function Card({ variant = "surface", padded = true, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "!rounded-card",
        variant === "surface" && "border border-mist-line bg-white shadow-[0_18px_40px_-34px_rgb(29_52_30/0.55)]",
        variant === "sunken" && "bg-mist",
        variant === "outline" && "border border-mist-line",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...rest}
    />
  );
}

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  level?: "display" | "h1" | "h2";
  as?: "h1" | "h2" | "h3";
  /** Thin violet rule, as in the product reference. */
  rule?: boolean;
  icon?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, level = "h1", as = "h1", rule, icon, align = "left", className }: SectionHeaderProps) {
  const Heading = as;
  return (
    <header className={cn("space-y-3", align === "center" && "text-center", className)}>
      {(icon || rule) && (
        <div className={cn("flex items-center gap-3", align === "center" && "justify-center")}>
          {icon && <span className="text-accent">{icon}</span>}
          {rule && <span aria-hidden className="h-px flex-1 bg-accent/50" />}
        </div>
      )}
      {eyebrow && <p className="text-eyebrow text-accent">{eyebrow}</p>}
      <Heading className={cn(level === "display" ? "text-display" : level === "h1" ? "text-h1" : "text-h2", "text-forest")}>{title}</Heading>
      {description && <div className="text-body text-text-muted">{description}</div>}
    </header>
  );
}

const alertIcon: Record<Tone, ReactNode> = {
  neutral: <Info aria-hidden className="size-5" strokeWidth={1.5} />,
  brand: <Info aria-hidden className="size-5" strokeWidth={1.5} />,
  info: <Info aria-hidden className="size-5" strokeWidth={1.5} />,
  success: <CircleCheck aria-hidden className="size-5" strokeWidth={1.5} />,
  warning: <TriangleAlert aria-hidden className="size-5" strokeWidth={1.5} />,
  error: <CircleAlert aria-hidden className="size-5" strokeWidth={1.5} />,
};

export function Alert({ tone = "info", title, children, live, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; live?: boolean; className?: string }) {
  return (
    <div
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 !rounded-control px-4 py-3.5", toneClasses[tone], className)}
    >
      <span className="mt-0.5 shrink-0">{alertIcon[tone]}</span>
      <div className="min-w-0 space-y-1 text-small [overflow-wrap:anywhere]">
        {title && <p className="font-medium">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 !rounded-card border border-mist-line bg-white px-6 py-10 text-center", className)}>
      {icon && <span className="text-accent">{icon}</span>}
      <p className="text-h3 text-forest">{title}</p>
      {description && <p className="max-w-md text-small text-text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse motion-safe-only !rounded-control bg-surface-sunken", className)} />;
}

/** Accessible loading block: skeleton lines plus a polite status for screen readers. */
export function LoadingBlock({ label = "Cargando…", lines = 3, className }: { label?: string; lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Marks provisional content (copy, data, illustrations). Visible only in the demo environment. */
export function DevTag({ children = "Pendiente", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "dev-only items-center gap-1 !rounded-full border border-dashed border-accent/70 bg-white/80 px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-[0.12em] text-accent",
        className,
      )}
    >
      Dev · {children}
    </span>
  );
}
