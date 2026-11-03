"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { choosePlanAction } from "./actions";

type Option = { id: string; label: string; amount: string; period: string };

/** The three ways to pay, as choices. Saving needs a member session (not the local demo). */
export function PlanChooser({ options, current, canSave }: { options: Option[]; current: string | null; canSave: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState(current ?? "");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setMessage(null);
      const r = await choosePlanAction(plan);
      if (!r.ok) return setMessage({ tone: "error", text: r.error });
      setMessage({ tone: "success", text: "Guardamos tu forma de pago. Podés cambiarla cuando quieras." });
      router.refresh();
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[0.9375rem] font-medium text-forest">¿Cómo vas a pagar?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <label
              key={o.id}
              htmlFor={`plan-${o.id}`}
              className={cn(
                "relative flex cursor-pointer flex-col !rounded-control border border-mist-line bg-mist/60 px-4 py-3 transition-colors motion-safe-only hover:border-forest/50",
                "has-[:checked]:border-forest has-[:checked]:bg-forest-soft/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest",
              )}
            >
              <input type="radio" id={`plan-${o.id}`} name="plan" value={o.id} checked={plan === o.id} onChange={() => setPlan(o.id)} className="sr-only" />
              <span className="text-small text-text-muted">{o.label}</span>
              <span className="mt-0.5 text-xl font-title text-forest tabular-nums">{o.amount}</span>
              <span className="text-xs text-text-muted">{o.period}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {message && (
        <Alert tone={message.tone} live>
          {message.text}
        </Alert>
      )}
      {canSave ? (
        <Button type="submit" variant="secondary" loading={pending} loadingLabel="Guardando…" disabled={!plan || plan === current}>
          Guardar mi forma de pago
        </Button>
      ) : (
        <p className="text-small text-text-muted">Vista de demostración: para guardar tu elección, ingresá con tu cuenta.</p>
      )}
    </form>
  );
}
