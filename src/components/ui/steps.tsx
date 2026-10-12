import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepStatus = "complete" | "current" | "incomplete" | "upcoming";
export type Step = { id: string; label: string; status: StepStatus };

/** "Paso N de M" + progress bar + step list. Completed/incomplete steps can be reopened. */
export function StepIndicator({ steps, onSelect, hideCurrentLabel }: { steps: Step[]; onSelect?: (id: string) => void; hideCurrentLabel?: boolean }) {
  const currentIndex = Math.max(0, steps.findIndex((s) => s.status === "current"));
  const done = steps.filter((s) => s.status === "complete").length;
  const current = steps[currentIndex];
  return (
    <nav aria-label="Progreso de la solicitud" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-eyebrow text-accent">
          Paso {currentIndex + 1} de {steps.length}
        </p>
        <p className="text-small text-text-muted">{done} completos</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-label="Pasos completos"
        className="h-1.5 overflow-hidden !rounded-full bg-surface-sunken"
      >
        <div className="h-full !rounded-full bg-accent transition-[width] duration-500 motion-safe-only" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      {!hideCurrentLabel && (
        <p className="text-h3 text-foreground">
          <span className="sr-only">Paso actual: </span>
          {current.label}
        </p>
      )}
      <ol className="flex flex-wrap gap-0.5 min-[360px]:gap-1.5">
        {steps.map((s, i) => {
          const clickable = onSelect && (s.status === "complete" || s.status === "incomplete");
          const content = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-6 items-center justify-center !rounded-full text-[11px] font-medium",
                  s.status === "complete" && "bg-brand text-white",
                  s.status === "current" && "bg-accent text-white",
                  s.status === "incomplete" && "bg-warning-bg text-warning-fg",
                  s.status === "upcoming" && "border border-border-strong text-text-muted",
                )}
              >
                {s.status === "complete" ? <Check className="size-3.5" strokeWidth={2} /> : s.status === "incomplete" ? <CircleAlert className="size-3.5" strokeWidth={2} /> : String.fromCharCode(65 + i)}
              </span>
              <span className="sr-only">
                {s.label} —{" "}
                {s.status === "complete" ? "completo" : s.status === "current" ? "actual" : s.status === "incomplete" ? "incompleto" : "pendiente"}
              </span>
            </>
          );
          return (
            <li key={s.id}>
              {clickable ? (
                <button type="button" onClick={() => onSelect(s.id)} title={s.label} className="flex !rounded-full p-0.5 hover:bg-surface-sunken">
                  {content}
                </button>
              ) : (
                <span title={s.label} aria-current={s.status === "current" ? "step" : undefined} className="flex p-0.5">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
