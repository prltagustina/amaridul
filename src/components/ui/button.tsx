import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "danger";
export type ButtonShape = "pill" | "admin";

type StyleProps = {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: "md" | "lg";
  /** Cormorant CTA type, for public editorial calls to action. */
  editorial?: boolean;
  full?: boolean;
};

// `!` utilities win over the unlayered global `a { color: inherit }` and focus radius rules.
export function buttonClasses({ variant = "primary", shape = "pill", size = "md", editorial, full }: StyleProps = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 text-center transition-colors motion-safe-only",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    shape === "pill" ? "!rounded-full" : "!rounded-control",
    size === "lg" ? "min-h-13 px-7" : "min-h-11 px-5",
    editorial ? "text-cta" : "text-base font-medium",
    full && "w-full",
    variant === "primary" && "bg-[linear-gradient(135deg,var(--forest)_0%,#3a5f41_100%)] !text-white shadow-[0_10px_24px_-14px_rgba(43,74,51,0.8)] hover:bg-[linear-gradient(135deg,var(--forest-hover)_0%,#467050_100%)]",
    variant === "accent" && "bg-[linear-gradient(135deg,#3f6043_0%,var(--accent)_55%,#557d4c_100%)] !text-white shadow-[0_10px_24px_-14px_rgba(43,74,51,0.7)] hover:bg-[linear-gradient(135deg,#36593f_0%,#45683e_55%,#4d7045_100%)]",
    variant === "secondary" && "border border-forest bg-transparent !text-forest hover:bg-forest-soft",
    variant === "danger" && "border border-error-fg bg-transparent !text-error-fg hover:bg-error-bg",
    variant === "ghost" && "min-h-11 bg-transparent px-1 !text-forest underline-offset-4 hover:underline",
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
          <LoaderCircle aria-hidden className="size-4 animate-spin motion-safe-only" strokeWidth={1.75} />
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

/** Inline text link in brand colour, overriding the global anchor colour. */
export function TextLink({ className, ...rest }: ComponentProps<typeof Link>) {
  return <Link {...rest} className={cn("!text-forest !underline underline-offset-4 decoration-1 hover:decoration-2", className)} />;
}
