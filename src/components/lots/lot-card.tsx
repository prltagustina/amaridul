"use client";

import Image from "next/image";
import { FileBadge, FlaskConical } from "lucide-react";
import { LeafMark } from "@/components/brand/botanicals";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { Button } from "@/components/ui/button";
import { DevTag } from "@/components/ui/display";
import { labNote } from "@/demo/content";
import type { Lot } from "@/demo/fixtures";

/** Public lot card (member portal) and admin editor preview. */
export function LotCard({ lot, onCertificate }: { lot: Lot; onCertificate: () => void }) {
  const data = [
    ["Variedad", lot.variety],
    ["Quimiotipo", lot.chemotype],
    ["Cultivo", lot.cultivated],
    ["Cosecha", lot.harvested],
    ["Análisis", lot.analysed],
    ["Laboratorio", lot.lab],
  ];
  return (
    <article aria-labelledby="lot-title" className="@container overflow-hidden !rounded-card border border-border/80 bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-soft px-5 py-4 sm:px-6">
        <div>
          <p className="text-eyebrow text-brand">Lote</p>
          <h2 id="lot-title" className="font-mono text-lg tracking-wide text-brand">
            {lot.code}
          </h2>
        </div>
        <p className="flex items-center gap-2 text-cta text-brand">
          {lot.product}
          <LeafMark className="w-7 text-brand/70" />
        </p>
      </header>

      <div className="grid gap-6 p-5 @xl:grid-cols-[minmax(0,14rem)_1fr] @md:p-6">
        {lot.image ? (
          <div className="relative aspect-[16/10] overflow-hidden !rounded-control bg-surface-sunken @xl:aspect-[4/5]">
            <Image src={lot.image} alt={`Flor del lote ${lot.code}`} fill placeholder="blur" quality={85} sizes="(min-width: 640px) 14rem, 90vw" className="object-cover" />
            <DevTag className="absolute right-2 bottom-2">Foto provisoria</DevTag>
          </div>
        ) : (
          <PhotoPlaceholder label="Imagen del producto pendiente" className="aspect-[16/10] !rounded-control @xl:aspect-[4/5]" />
        )}
        <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-4">
          {data.map(([k, v]) => (
            <div key={k}>
              <dt className="text-eyebrow text-text-muted">{k}</dt>
              <dd className="mt-0.5 text-base">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="hplc-title" className="space-y-4 border-t border-border px-5 py-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <FlaskConical aria-hidden className="size-5 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-eyebrow text-accent">Análisis HPLC</p>
            <h3 id="hplc-title" className="text-h2 text-brand">
              Perfil de cannabinoides
            </h3>
          </div>
        </div>
        <table className="w-full text-left">
          <caption className="sr-only">Concentración de cannabinoides del lote {lot.code}</caption>
          <thead>
            <tr className="border-b border-border-strong/50 text-eyebrow text-text-muted">
              <th scope="col" className="py-2 font-medium">Compuesto</th>
              <th scope="col" className="py-2 text-right font-medium">Concentración</th>
            </tr>
          </thead>
          <tbody>
            {lot.cannabinoids.map((c) => (
              <tr key={c.compound} className="border-b border-border/70 last:border-0">
                <th scope="row" className="py-2.5 font-normal">{c.compound}</th>
                <td className="py-2.5 text-right tabular-nums">{c.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-small text-text-muted">{labNote}</p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/50 px-5 py-4 sm:px-6">
        {lot.hasCertificate ? (
          <Button variant="secondary" onClick={onCertificate}>
            <FileBadge aria-hidden className="size-4" strokeWidth={1.5} /> Ver certificado de análisis
          </Button>
        ) : (
          <p className="text-small text-text-muted">El certificado de análisis de este lote todavía no está disponible.</p>
        )}
        <DevTag>Valores DEMO · no son análisis reales</DevTag>
      </footer>
    </article>
  );
}

export function CertificatePreview({ lot }: { lot: Lot }) {
  return (
    <div className="relative space-y-4 overflow-hidden !rounded-control border border-border bg-white p-5 font-mono text-xs leading-relaxed text-foreground">
      <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold tracking-[0.3em] text-accent/10 -rotate-12 select-none">
        DEMO
      </span>
      <div className="flex justify-between border-b border-border pb-3">
        <span>{lot.lab}</span>
        <span>Informe N.º DEMO-{lot.code.slice(3)}</span>
      </div>
      <p>Muestra: {lot.product} · Lote {lot.code}</p>
      <p>Fecha de análisis: {lot.analysed} · Método: HPLC-UV</p>
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {lot.cannabinoids.map((c) => (
          <li key={c.compound}>
            {c.compound}: {c.value}
          </li>
        ))}
      </ul>
      <p className="border-t border-border pt-3 text-text-muted">Vista previa ilustrativa. El PDF del laboratorio se va a mostrar acá.</p>
      <DevTag>Certificado DEMO</DevTag>
    </div>
  );
}
