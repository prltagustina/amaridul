import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleDashed, CircleDot, Clock3, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { EYEBROW, TOP_EDGE, type InfoTone } from "./technical";

export type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-foreground",
  brand: "bg-forest-soft text-forest",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  error: "bg-error-bg text-error-fg",
  info: "bg-info-bg text-info-fg",
};

// Each state carries its icon too: the colour is never the only way to tell them apart.
const badgeIcon: Record<Tone, LucideIcon> = {
  success: CircleCheck,
  warning: Clock3,
  error: CircleAlert,
  info: Info,
  brand: CircleDot,
  neutral: CircleDashed,
};

/**
 * A state, as a pill. Equivalent states look alike side by side: same height, padding, type and a
 * shared minimum width, text centred on one line. `compact` drops the minimum width (inline use).
 */
export function StatusBadge({ tone = "neutral", children, className, compact }: { tone?: Tone; children: ReactNode; className?: string; compact?: boolean }) {
  const Icon = badgeIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 !rounded-full px-3 text-[0.8125rem] leading-none font-medium whitespace-nowrap",
        !compact && "min-w-[7.5rem]",
        toneClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
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
        variant === "surface" && "border border-mist-line bg-white",
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
      className={cn("flex gap-3 !rounded-control border border-current/10 px-4 py-3.5", toneClasses[tone], className)}
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
      {icon && <span className="flex size-14 items-center justify-center !rounded-full bg-forest-soft text-forest [&_svg]:size-7">{icon}</span>}
      <p className="text-h3 text-forest">{title}</p>
      {description && <p className="max-w-md text-small text-text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/**
 * A group of related information with its title and, at the right, its actions: the container
 * for what needs one (data, a form, a list). Plain white, a hairline border, no shadow.
 */
export function Panel({
  title,
  eyebrow,
  actions,
  description,
  id,
  level = 2,
  tone,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  id?: string;
  level?: 2 | 3;
  /** The panel's last line, across its width (help, for instance). */
  footer?: ReactNode;
  /** The section's colour: the panel's top edge and the eyebrow (green, magenta or lilac). */
  tone?: InfoTone;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section id={id} aria-labelledby={title && id ? `${id}-title` : undefined} className={cn("relative scroll-mt-6 !rounded-card border border-mist-line bg-white", tone && TOP_EDGE[tone], footer ? "overflow-hidden" : null, className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0 space-y-1">
            {eyebrow && (
              <p className={cn("text-eyebrow", tone ? EYEBROW[tone] : "text-text-muted", tone === "magenta" && "flex items-center gap-2")}>
                {/* Trámites carry a touch of Dambar's pink by their eyebrow. */}
                {tone === "magenta" && <span aria-hidden className="size-1.5 shrink-0 !rounded-full bg-rosa-400" />}
                {eyebrow}
              </p>
            )}
            {title && (
              <Heading id={id ? `${id}-title` : undefined} className="text-h3 text-forest">
                {title}
              </Heading>
            )}
            {description && <p className="measure text-small text-text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("px-5 pt-4 pb-5 sm:px-6 sm:pb-6", !(title || actions) && "pt-5 sm:pt-6", bodyClassName)}>{children}</div>
      {footer && <div className="border-t border-mist-line">{footer}</div>}
    </section>
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
