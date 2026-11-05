import { CopyField } from "@/components/ui/copy-value";
import { cn } from "@/lib/cn";
import { FEE_PAYMENT, FEE_PLANS, monthlyFee, periodLabel, pesos } from "@/lib/fee-payment";

/**
 * The fee at a glance, the same in Mi espacio and on the fee page: what the member pays (or the
 * monthly fee while they have not chosen), large, and beside it the card with the account. Both in
 * the first screen, so the alias and the CVU are seen without scrolling.
 */
export function FeeOverview({ planId, className }: { planId: string | null; className?: string }) {
  const plan = FEE_PLANS.find((p) => p.id === planId);
  return (
    <div className={cn("grid gap-7 md:grid-cols-[minmax(min-content,1fr)_minmax(0,25rem)] md:items-center md:gap-8", className)}>
      <div>
        <p className="text-sm text-text-muted">{plan ? "Pagás" : "La cuota es de"}</p>
        <p className="mt-1 font-display text-[3.25rem] leading-none text-forest lining-nums tabular-nums">{pesos(plan ? plan.amount : monthlyFee)}</p>
        <p className="mt-2 text-[1.0625rem] text-foreground">{plan ? `${plan.label} · ${periodLabel(plan.months)}` : "por mes"}</p>
        {plan && plan.months > 1 && <p className="mt-1 text-sm text-text-muted">Equivale a {pesos(monthlyFee)} por mes.</p>}
      </div>
      <PaymentCard />
    </div>
  );
}

/**
 * The association's account as a transfer card (solid green, a step deeper than the header band),
 * the one place it is drawn: on the fee page, at the end of choosing how to pay and in Mi espacio.
 * Whose account and where, then the alias and the CVU large, each with its «Copiar», and the CUIT
 * at its foot.
 */
export function PaymentCard({ className }: { className?: string }) {
  return (
    <section
      aria-label={`Cuenta de ${FEE_PAYMENT.platform} de la asociación`}
      className={cn("relative isolate overflow-hidden !rounded-card bg-hoja-700 px-4 py-5 text-white sm:px-6 sm:py-6", className)}
    >
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 !rounded-full bg-hoja-500/25 blur-3xl" />
      <p className="text-eyebrow text-balance text-white/80">
        {FEE_PAYMENT.platform} · {FEE_PAYMENT.holder}
      </p>
      <div className="mt-4 divide-y divide-white/15">
        <CopyField name="Alias" label="alias" value={FEE_PAYMENT.alias} className="pb-4" />
        <CopyField name="CVU" label="CVU" value={FEE_PAYMENT.cvu} className="py-4" />
        <p className="pt-4 text-sm">
          <span className="text-white/80">CUIT</span> <span className="tabular-nums">{FEE_PAYMENT.cuit}</span>
        </p>
      </div>
    </section>
  );
}
