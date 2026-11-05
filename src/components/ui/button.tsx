import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * One family of buttons for the portal and the admin, all filled, by importance:
 * - primary: what the person came to do, or has pending (solid forest green, white text);
 * - secondary: going somewhere or the other actions (the same green, as a soft fill with forest
 *   text: clearly a button, without the weight of the primary);
 * - neutral: small tools inside the data (copying an alias), filled in sand, without colour, so
 *   colour stays for what matters;
 * - ghost (tertiary): a minor action next to others, shown as text;
 * - danger: destructive actions (solid dark red);
 * - accent / join: the public calls to action (join is the joining flow's violet);
 * - light: a call to action over a photo or a coloured band (cream fill, forest text).
 * Same shape (pill), heights (40, 44 or 48 px), type, icon size (16 px) and gap everywhere; text at
 * 7:1 or more on every fill.
 */
export type ButtonVariant = "primary" | "secondary" | "neutral" | "ghost" | "danger" | "accent" | "join" | "light";
/** Kept for compatibility: every button now has the same shape. */
export type ButtonShape = "pill" | "admin";
export type ButtonSize = "sm" | "md" | "lg";

type StyleProps = {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: ButtonSize;
  /** Larger, bolder CTA type for public calls to action. */
  editorial?: boolean;
  full?: boolean;
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-[0.9375rem]",
  lg: "min-h-12 px-6 text-base",
};

// `!` utilities win over the unlayered global `a { color: inherit }` and focus radius rules.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-forest !text-white hover:bg-forest-hover",
  accent: "bg-accent !text-white hover:bg-accent-hover",
  join: "bg-lila-800 !text-white hover:bg-lila-700",
  light: "bg-background !text-forest hover:bg-white focus-visible:!outline-background",
  secondary: "bg-hoja-200 !text-forest hover:bg-hoja-300",
  neutral: "bg-arena-200/70 !text-foreground hover:bg-arena-300/70",
  danger: "bg-error-fg !text-white hover:bg-error-fg/85",
  ghost: "!px-2 bg-transparent !text-forest underline-offset-4 hover:underline",
};

export function buttonClasses({ variant = "primary", size = "md", editorial, full }: StyleProps = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 !rounded-full text-center leading-tight transition-colors motion-safe-only",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    SIZES[size],
    editorial ? "text-cta" : "font-ui",
    VARIANTS[variant],
    full && "w-full",
  );
}

type ButtonProps = ComponentProps<"button"> & StyleProps & { loading?: boolean; loadingLabel?: string };

export function Button({ variant, shape, size, editorial, full, loading, loadingLabel, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, shape, size, editorial, full }), className)}
    >
      {loading ? (
        <>
          <LoaderCircle aria-hidden className="animate-spin motion-safe-only" strokeWidth={1.75} />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & StyleProps & { className?: string; children: ReactNode };

export function LinkButton({ variant, shape, size, editorial, full, className, ...rest }: LinkButtonProps) {
  return <Link {...rest} className={cn(buttonClasses({ variant, shape, size, editorial, full }), className)} />;
}

/** A link to another site (WhatsApp, the official REPROCANN site) with the look of a button. */
export function AnchorButton({ variant = "secondary", size, editorial, full, className, ...rest }: ComponentProps<"a"> & StyleProps) {
  return <a {...rest} className={cn(buttonClasses({ variant, size, editorial, full }), className)} />;
}

const iconButton = (variant: "ghost" | "secondary" | "danger") =>
  cn(
    "inline-flex size-11 shrink-0 items-center justify-center !rounded-full transition-colors motion-safe-only [&_svg]:size-5",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50",
    variant === "ghost" && "!text-forest hover:bg-forest-soft",
    variant === "secondary" && "bg-hoja-200 !text-forest hover:bg-hoja-300",
    variant === "danger" && "!text-error-fg hover:bg-error-bg",
  );

/**
 * A compact action with only an icon: 44 × 44 px, its full name for screen readers and, on a
 * computer, as a tooltip. Use it where the context makes the icon clear.
 */
export function IconButton({ label, variant = "ghost", className, children, ...rest }: ComponentProps<"button"> & { label: string; variant?: "ghost" | "secondary" | "danger" }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cn(iconButton(variant), className)}>
      {children}
    </button>
  );
}

/** Inline text link in brand colour, overriding the global anchor colour. */
export function TextLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return <Link {...rest} className={cn("!text-forest !underline underline-offset-4 decoration-1 hover:decoration-2", className)} />;
}
