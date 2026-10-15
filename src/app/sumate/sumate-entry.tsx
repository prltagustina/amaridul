"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Sprout } from "lucide-react";
import { DevTag } from "@/components/ui/display";
import { sumateIntro } from "@/demo/content";
import SumateForm from "./sumate-form";

/**
 * The shared /sumate link serves two situations. New people continue to the preadmission as before;
 * existing members go to the legajo update, without a new admission. The choice lives in the hash
 * ("#asociarme"), so a reload keeps it and the browser's back button returns to the two options.
 */
const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export default function SumateEntry() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const choice = hash === "#asociarme" ? "new" : "none";

  const chooseNew = () => {
    window.location.hash = "asociarme";
  };
  const reset = () => {
    history.pushState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  if (choice === "new") {
    return (
      <div className="space-y-6">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1.5 text-small !text-text-muted hover:!text-forest">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} /> Cambiar opción
        </button>
        <div className="space-y-2">
          <h2 className="text-h2 text-forest">Solicitud de preadmisión</h2>
          <p className="text-body text-text-muted">
            {sumateIntro} <DevTag className="align-middle">Texto pendiente</DevTag>
          </p>
        </div>
        <SumateForm demoState="default" />
      </div>
    );
  }

  const option = "group flex w-full items-start gap-4 !rounded-card border border-border bg-surface p-5 text-left shadow-[0_8px_24px_-20px_rgb(40_36_28/0.4)] transition-colors hover:border-forest/50 focus-visible:border-forest sm:p-6 motion-safe-only";
  return (
    <section aria-labelledby="situacion" className="space-y-5">
      <h2 id="situacion" className="text-h2 text-forest">
        ¿Cuál es tu situación?
      </h2>
      <ul className="grid gap-4">
        <li>
          <button type="button" onClick={chooseNew} className={option}>
            <span className="flex size-11 shrink-0 items-center justify-center !rounded-full bg-forest-soft text-forest">
              <Sprout aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block font-title text-lg text-forest">Quiero asociarme a Amarí Dul</span>
              <span className="block text-body text-text-muted">Todavía no soy socio/a y quiero iniciar el proceso.</span>
            </span>
            <ArrowRight aria-hidden className="mt-3 size-5 shrink-0 text-forest" strokeWidth={1.5} />
          </button>
        </li>
        <li>
          <Link href="/sumate/socio-existente" className={option}>
            <span className="flex size-11 shrink-0 items-center justify-center !rounded-full bg-forest-soft text-forest">
              <BadgeCheck aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block font-title text-lg text-forest">Ya soy socio/a de Amarí Dul</span>
              <span className="block text-body text-text-muted">Ya hice mi ingreso a la asociación y quiero actualizar mi legajo y activar mi acceso digital.</span>
            </span>
            <ArrowRight aria-hidden className="mt-3 size-5 shrink-0 text-forest" strokeWidth={1.5} />
          </Link>
        </li>
      </ul>
    </section>
  );
}
