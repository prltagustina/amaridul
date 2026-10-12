import type { ComponentProps, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const box = cn(
  "mt-0.5 size-5 shrink-0 accent-[var(--hoja-800)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
);

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "id"> & {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  /** Card look (selection lists) vs plain (consents). */
  card?: boolean;
};

export function Checkbox({ id, label, description, error, card, className, ...rest }: CheckboxProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-3",
          card &&
            "!rounded-control border border-border bg-surface px-4 py-3.5 transition-colors motion-safe-only hover:border-border-strong has-[:checked]:border-forest has-[:checked]:bg-forest-soft/40",
        )}
      >
        <input
          type="checkbox"
          id={id}
          className={box}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
          {...rest}
        />
        <span className="space-y-0.5">
          <span className="block text-base text-foreground">{label}</span>
          {description && (
            <span id={`${id}-desc`} className="block text-small text-text-muted">
              {description}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-small text-error-fg">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      )}
    </div>
  );
}

type Option = { value: string; label: ReactNode; description?: ReactNode };

type GroupProps = {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: readonly Option[];
  className?: string;
};

/** Multiple choice as selectable cards inside a fieldset/legend. */
export function CheckboxGroup({
  name,
  legend,
  hint,
  error,
  options,
  values,
  onToggle,
  className,
}: GroupProps & { values: readonly string[]; onToggle: (value: string, checked: boolean) => void }) {
  return (
    <fieldset className={cn("space-y-3", className)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}>
      <legend className="mb-1 text-label text-foreground">{legend}</legend>
      {hint && <p id={`${name}-hint`} className="text-small text-text-muted">{hint}</p>}
      <div className="space-y-2.5">
        {options.map((o) => (
          <Checkbox
            key={o.value}
            card
            id={`${name}-${o.value}`}
            name={name}
            value={o.value}
            label={o.label}
            description={o.description}
            checked={values.includes(o.value)}
            onChange={(e) => onToggle(o.value, e.target.checked)}
          />
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-small text-error-fg">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Single choice as selectable cards inside a fieldset/legend. */
export function RadioGroup({
  name,
  legend,
  hint,
  error,
  options,
  value,
  onChange,
  inline,
  className,
}: GroupProps & { value: string; onChange: (value: string) => void; inline?: boolean }) {
  return (
    <fieldset className={cn("space-y-3", className)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}>
      <legend className="mb-1 text-label text-foreground">{legend}</legend>
      {hint && <p id={`${name}-hint`} className="text-small text-text-muted">{hint}</p>}
      <div className={cn(inline ? "grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap" : "space-y-2.5")}>
        {options.map((o) => (
          <label
            key={o.value}
            htmlFor={`${name}-${o.value}`}
            className="flex cursor-pointer items-start gap-3 !rounded-control border border-border bg-surface px-4 py-3.5 transition-colors motion-safe-only hover:border-border-strong has-[:checked]:border-forest has-[:checked]:bg-forest-soft/40"
          >
            <input
              type="radio"
              id={`${name}-${o.value}`}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className={box}
            />
            <span className="space-y-0.5">
              <span className="block text-base text-foreground">{o.label}</span>
              {o.description && <span className="block text-small text-text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-small text-error-fg">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      )}
    </fieldset>
  );
}
