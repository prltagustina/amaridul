"use client";

import Image from "next/image";
import { FileBadge, Info } from "lucide-react";
import { LeafMark } from "@/components/brand/botanicals";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { DevTag } from "@/components/ui/display";
import { Chip, KeyFact, RatioBar, SectionTab, TechBand, VarietyBadge } from "@/components/ui/technical";
import { labNote } from "@/demo/content";
import type { Lot } from "@/demo/fixtures";

const num = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

/** "1:2" or "5:1", rounded to the nearest whole ratio. */
function ratioLabel(thc: number, cbd: number) {
  if (!thc || !cbd) return thc ? "THC" : "CBD";
  return thc >= cbd ? `${Math.round(thc / cbd)}:1` : `1:${Math.round(cbd / thc)}`;
}

/** Lot sheet for the member portal and the admin editor preview (Amarí Dul + Dambar technical layer). */
export function LotCard({ lot, onCertificate }: { lot: Lot; onCertificate: () => void }) {
  const data = [
    ["Variedad", lot.variety],
    ["Quimiotipo", lot.chemotype],
    ["Cultivo", lot.cultivated],
    ["Cosecha", lot.harvested],
    ["Análisis", lot.analysed],
    ["Laboratorio", lot.lab],
  ];
  const c = lot.composition;
  return (
    <article aria-labelledby="lot-title" className="@container overflow-hidden !rounded-card border border-lavender-line bg-white shadow-[0_18px_40px_-28px_rgba(70,53,119,0.45)]">
      <TechBand className="px-5 pt-5 @md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.18em] text-white/75 uppercase">Ficha del lote</p>
            <h2 id="lot-title" className="mt-1 font-mono text-xl tracking-wide break-all">
              {lot.code}
            </h2>
            <p className="mt-1 font-display text-2xl leading-tight">{lot.product}</p>
          </div>
          <LeafMark className="w-10 shrink-0 text-white/80" />
        </div>
        <div className="mt-4 flex">
          <SectionTab>Trazabilidad</SectionTab>
        </div>
      </TechBand>

      <div className="grid gap-6 p-5 @xl:grid-cols-[minmax(0,15rem)_1fr] @md:p-6">
        {lot.image ? (
          <div className="relative aspect-[4/3] overflow-hidden !rounded-[14px] bg-lavender @xl:aspect-[4/5]">
            <Image src={lot.image} alt={`Flor del lote ${lot.code}`} fill placeholder="blur" quality={85} sizes="(min-width: 640px) 15rem, 92vw" className="object-cover" />
            <DevTag className="absolute right-2 bottom-2">Foto provisoria</DevTag>
          </div>
        ) : (
          <PhotoPlaceholder label="Imagen del producto pendiente" className="aspect-[4/3] !rounded-[14px] @xl:aspect-[4/5]" />
        )}
        <dl className="grid grid-cols-2 content-start gap-x-5 gap-y-4">
          {data.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-indigo/85">{k}</dt>
              <dd className="mt-0.5 font-medium break-words text-indigo">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {c && (
        <section aria-labelledby="composition-title" className="space-y-5 border-t border-lavender-line px-5 py-6 @md:px-6">
          <div className="!rounded-card border border-lavender-line bg-lavender p-4 @md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <VarietyBadge>{lot.chemotype.split("(")[0].trim()}</VarietyBadge>
              <RatioBar thc={c.thc} cbd={c.cbd} label="Proporción" className="w-full max-w-[13rem]" />
            </div>
            <h3 id="composition-title" className="mt-5 text-xl font-medium tracking-tight text-indigo">
              Ratio THC:CBD ≈ {ratioLabel(c.thc, c.cbd)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip>THC ~{num(c.thc)} mg/ml</Chip>
              <Chip>CBD ~{num(c.cbd)} mg/ml</Chip>
            </div>
          </div>
          <KeyFact
            value={<>1 gota = {num(c.total / c.dropsPerMl)} mg</>}
            caption="de cannabinoides totales"
            rows={[
              ["Concentración", `${num(c.total)} mg/ml`],
              ["Gotero estándar", `${c.dropsPerMl} gotas/ml`],
            ]}
          />
        </section>
      )}

      <section aria-labelledby="hplc-title" className="space-y-4 border-t border-lavender-line px-5 py-6 @md:px-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-indigo/85 uppercase">Cromatografía (HPLC)</p>
          <h3 id="hplc-title" className="mt-1 text-2xl font-medium tracking-tight text-indigo">
            Perfil de cannabinoides
          </h3>
        </div>
        <div className="overflow-hidden !rounded-[12px] border border-lavender-line">
          <table className="w-full text-left text-indigo">
            <caption className="sr-only">Concentración de cannabinoides del lote {lot.code}</caption>
            <thead className="bg-indigo text-xs text-white">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Compuesto</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Concentración</th>
              </tr>
            </thead>
            <tbody>
              {lot.cannabinoids.map((x) => (
                <tr key={x.compound} className="border-t border-lavender-line odd:bg-lavender/50">
                  <th scope="row" className="px-4 py-2.5 font-medium">{x.compound}</th>
                  <td className="px-4 py-2.5 text-right tabular-nums">{x.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-3 !rounded-[12px] bg-lavender px-4 py-3 text-sm text-indigo">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
          {labNote}
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-lavender-line px-5 py-4 @md:px-6">
        {lot.hasCertificate ? (
          <button
            type="button"
            onClick={onCertificate}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-full border border-indigo px-4 text-[15px] font-medium !text-indigo hover:bg-lavender @md:w-auto @md:px-5 @md:text-base"
          >
            <FileBadge aria-hidden className="size-4" strokeWidth={1.5} /> Ver certificado de análisis
          </button>
        ) : (
          <p className="text-small text-indigo/80">El certificado de análisis de este lote todavía no está disponible.</p>
        )}
        <DevTag>Valores DEMO · no son análisis reales</DevTag>
      </footer>
    </article>
  );
}

export function CertificatePreview({ lot }: { lot: Lot }) {
  return (
    <div className="relative space-y-4 overflow-hidden !rounded-control border border-border bg-white p-5 font-mono text-xs leading-relaxed text-foreground">
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full select-none" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        <text x="200" y="120" textAnchor="middle" transform="rotate(-12 200 100)" fill="var(--color-accent)" fillOpacity="0.1" fontSize="64" fontWeight="700" letterSpacing="18">
          DEMO
        </text>
      </svg>
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
