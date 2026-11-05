import { BadgeCheck, CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/cn";
import { DISPENSING_LABEL, type DispensingEligibility } from "@/lib/dispensing";

/**
 * «Habilitado a dispensa» on the member's page: the result and its three conditions, each with
 * what is missing. Derived on every visit from the membership, the credential and the linkage:
 * nobody marks it by hand, and it stops showing as soon as a condition stops being met.
 */
export function DispensingBlock({ eligibility, className }: { eligibility: DispensingEligibility; className?: string }) {
  const { eligible, conditions } = eligibility;
  return (
    <section aria-labelledby="dispensa" className={cn("!rounded-card border px-5 py-4 sm:px-6", eligible ? "border-success-fg/25 bg-success-bg" : "border-mist-line bg-white", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {eligible ? <BadgeCheck aria-hidden className="size-6 shrink-0 text-success-fg" strokeWidth={1.75} /> : <CircleDashed aria-hidden className="size-6 shrink-0 text-text-muted" strokeWidth={1.75} />}
        <h2 id="dispensa" className={cn("text-h3", eligible ? "text-success-fg" : "text-foreground")}>
          {eligible ? DISPENSING_LABEL : `No habilitado a dispensa · ${eligibility.pending.length === 1 ? "falta 1 condición" : `faltan ${eligibility.pending.length} condiciones`}`}
        </h2>
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {conditions.map((c) => (
          <li key={c.key} className="flex min-w-0 items-start gap-2 text-small">
            {c.met ? <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success-fg" strokeWidth={2} /> : <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-fg" strokeWidth={2} />}
            <span className="min-w-0">
              <span className="block font-medium text-foreground">
                {c.label}
                <span className="sr-only">{c.met ? ": cumplida" : ": pendiente"}</span>
              </span>
              <span className="block text-text-muted">{c.met ? c.state : c.pending}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-muted">Se calcula con las tres condiciones cada vez que se abre la ficha: no se marca a mano. Cargar un archivo o un código no alcanza; cada condición pide la revisión de la asociación.</p>
    </section>
  );
}
