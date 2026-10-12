"use client";

import Image from "next/image";
import { Droplet, FileBadge, FlaskConical, Info, Sprout } from "lucide-react";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { DevTag } from "@/components/ui/display";
import { FolderSwitcher } from "@/components/ui/folder-tabs";
import { Chip, KeyFact, RatioBar, TechBand, VarietyBadge } from "@/components/ui/technical";
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
    <article aria-labelledby="lot-title" className="@container overflow-hidden !rounded-card border border-mist-line bg-white shadow-[0_18px_40px_-28px_rgba(26,26,24,0.35)]">
      <TechBand tone="lilac" className="relative overflow-hidden px-5 pt-4 pb-5 @md:px-6">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-44 !rounded-full bg-lilac/25 blur-3xl" />
        <p className="relative text-[11px] font-medium tracking-[0.18em] text-white/75 uppercase">Ficha del lote</p>
        <h2 id="lot-title" className="relative mt-1 font-mono text-xl tracking-wide break-all">
          {lot.code}
        </h2>
        <p className="relative mt-1 font-display text-2xl leading-tight">{lot.product}</p>
      </TechBand>

      <div className="bg-mist/60 px-3 pt-4 pb-4 @md:px-5 @md:pb-5">
        <FolderSwitcher
          flat
          label={`Ficha del lote ${lot.code}`}
          tabs={[
            {
              id: "origen",
              label: "Origen",
              tone: "green",
              icon: <Sprout className="size-4" strokeWidth={1.75} />,
              content: (
                <div className="grid gap-6 @xl:grid-cols-[minmax(0,12rem)_1fr]">
                  {lot.image ? (
                    <div className="relative aspect-[4/3] overflow-hidden !rounded-[14px] bg-mist @xl:aspect-square">
                      <Image src={lot.image} alt={`Flor del lote ${lot.code}`} fill placeholder="blur" quality={85} sizes="(min-width: 640px) 12rem, 92vw" className="object-cover" />
                      <DevTag className="absolute right-2 bottom-2">Foto provisoria</DevTag>
                    </div>
                  ) : (
                    <PhotoPlaceholder label="Imagen del producto pendiente" className="aspect-[4/3] !rounded-[14px] @xl:aspect-square" />
                  )}
                  <dl className="grid grid-cols-2 content-start gap-x-5 gap-y-4">
                    {data.map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-xs text-forest/85">{k}</dt>
                        <dd className="mt-0.5 font-medium break-words text-forest">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            },
            {
              id: "composicion",
              label: "Composición",
              tone: "lilac",
              icon: <Droplet className="size-4" strokeWidth={1.75} />,
              content: c ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <VarietyBadge tone="lilac">{lot.chemotype.split("(")[0].trim()}</VarietyBadge>
                    <RatioBar tone="lilac" thc={c.thc} cbd={c.cbd} label="Proporción" className="w-full max-w-[13rem]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium tracking-tight text-lilac-ink">Ratio THC:CBD ≈ {ratioLabel(c.thc, c.cbd)}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip tone="lilac">THC ~{num(c.thc)} mg/ml</Chip>
                      <Chip tone="lilac">CBD ~{num(c.cbd)} mg/ml</Chip>
                    </div>
                  </div>
                  <KeyFact
                    tone="lilac"
                    value={<>1 gota = {num(c.total / c.dropsPerMl)} mg</>}
                    caption="de cannabinoides totales"
                    rows={[
                      ["Concentración", `${num(c.total)} mg/ml`],
                      ["Gotero estándar", `${c.dropsPerMl} gotas/ml`],
                    ]}
                  />
                </div>
              ) : (
                <p className="!rounded-control bg-lilac-soft px-4 py-5 text-center text-small text-lilac-ink">La composición se publica cuando el laboratorio entrega el análisis.</p>
              ),
            },
            {
              id: "analisis",
              label: "Análisis",
              tone: "amber",
              icon: <FlaskConical className="size-4" strokeWidth={1.75} />,
              content: (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.18em] text-amber-ink/85 uppercase">Cromatografía (HPLC)</p>
                    <h3 className="mt-1 text-xl font-medium tracking-tight text-amber-ink">Perfil de cannabinoides</h3>
                  </div>
                  <div className="overflow-hidden !rounded-[12px] border border-mist-line">
                    <table className="w-full text-left text-amber-ink">
                      <caption className="sr-only">Concentración de cannabinoides del lote {lot.code}</caption>
                      <thead className="bg-amber-ink text-xs text-white">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-medium">Compuesto</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">Concentración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lot.cannabinoids.map((x) => (
                          <tr key={x.compound} className="border-t border-mist-line odd:bg-amber-soft/50">
                            <th scope="row" className="px-4 py-2.5 font-medium">{x.compound}</th>
                            <td className="px-4 py-2.5 text-right tabular-nums">{x.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="flex items-start gap-3 !rounded-[12px] bg-amber-soft px-4 py-3 text-sm text-amber-ink">
                    <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
                    {labNote}
                  </p>
                  {lot.hasCertificate ? (
                    <button
                      type="button"
                      onClick={onCertificate}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--amber-deep),#7a4c22)] px-5 text-[15px] font-medium !text-white @md:w-auto @md:text-base"
                    >
                      <FileBadge aria-hidden className="size-4" strokeWidth={1.5} /> Ver certificado de análisis
                    </button>
                  ) : (
                    <p className="text-small text-amber-ink">El certificado de análisis de este lote todavía no está disponible.</p>
                  )}
                </div>
              ),
            },
          ]}
        />
        <p className="mt-3 px-2">
          <DevTag>Valores DEMO · no son análisis reales</DevTag>
        </p>
      </div>
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
