"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { choosePlanAction } from "./actions";
import { PaymentCard } from "./payment-details";

type Option = { id: string; label: string; amount: string; period: string };

/**
 * How often the member pays, chosen in a dialog over the page they are on, in two steps: the three
 * ways as choices (a change is saved for their own record only), then how to pay what they chose,
 * with the association's account to copy. Keeping the same way leads to the second step too.
 * Without a member session (the local demo) nothing is saved.
 */
export function PlanChooser({
  options,
  current,
  canSave,
  monthly,
  label,
  variant = "primary",
}: {
  options: Option[];
  current: string | null;
  canSave: boolean;
  /** The monthly fee, already formatted. */
  monthly: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "pay">("choose");
  const [plan, setPlan] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const chosen = options.find((o) => o.id === plan);
  // Keeping the same way leads straight to how to pay; only a change is saved.
  const changes = canSave && plan !== current;

  function show() {
    setPlan(current ?? "");
    setError(null);
    setSaved(false);
    setStep("choose");
    setOpen(true);
  }

  function next() {
    if (!changes) return setStep("pay");
    start(async () => {
      setError(null);
      const r = await choosePlanAction(plan);
      if (!r.ok) return setError(r.error);
      setSaved(true);
      setStep("pay");
      router.refresh();
    });
  }

  const paying = step === "pay" && chosen;
  return (
    <>
      <Button variant={variant} size="sm" onClick={show} aria-haspopup="dialog">
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        shape="pill"
        title={paying ? "Cómo pagar tu cuota" : "Elegí tu forma de pago"}
        description={paying ? undefined : `La cuota social es de ${monthly} por mes. Podés cambiar la forma de pago cuando quieras.`}
        confirmLabel={paying ? "Listo" : pending ? "Guardando…" : changes ? "Guardar" : "Ver cómo pagar"}
        onConfirm={paying ? () => setOpen(false) : next}
        confirmDisabled={!paying && (pending || !plan)}
        hideCancel={!!paying}
      >
        {paying ? (
          <>
            {saved && (
              <p aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-success-fg">
                <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                Guardamos tu forma de pago.
              </p>
            )}
            <div>
              <p className="text-sm text-text-muted">Transferí</p>
              <p className="mt-1 font-display text-[2.75rem] leading-none text-forest lining-nums tabular-nums">{chosen.amount}</p>
              <p className="mt-2 text-[0.9375rem] text-text-muted">
                {chosen.period} · {chosen.label.toLowerCase()}
              </p>
            </div>
            <PaymentCard />
          </>
        ) : (
          <>
            <fieldset>
              <legend className="sr-only">¿Cómo vas a pagar?</legend>
              <div className="space-y-2.5">
                {options.map((o) => (
                  <label
                    key={o.id}
                    htmlFor={`plan-${o.id}`}
                    className={cn(
                      "group flex min-h-16 cursor-pointer items-center gap-4 !rounded-control border border-mist-line bg-white px-4 py-3 transition-colors motion-safe-only hover:border-forest/50",
                      "has-[:checked]:border-forest has-[:checked]:bg-forest-soft/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest",
                    )}
                  >
                    <input type="radio" id={`plan-${o.id}`} name="plan" value={o.id} checked={plan === o.id} onChange={() => setPlan(o.id)} className="sr-only" />
                    <span aria-hidden className="flex size-5 shrink-0 items-center justify-center !rounded-full border border-border-strong bg-white group-has-[:checked]:border-forest group-has-[:checked]:bg-forest">
                      <span className="size-2 !rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{o.label}</span>
                      <span className="block text-sm text-text-muted">
                        {o.period}
                        {o.id === current && " · la actual"}
                      </span>
                    </span>
                    <span className="font-title text-xl text-forest tabular-nums">{o.amount}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && (
              <Alert tone="error" live>
                {error}
              </Alert>
            )}
            {!canSave && <p className="text-small text-text-muted">Vista de demostración: para guardar tu elección, ingresá con tu cuenta.</p>}
          </>
        )}
      </Dialog>
    </>
  );
}
