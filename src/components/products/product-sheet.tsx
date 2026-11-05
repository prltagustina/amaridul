"use client";

import Image from "next/image";
import { Droplet, FileBadge, FlaskConical, Info, Sprout } from "lucide-react";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { FolderSwitcher } from "@/components/ui/folder-tabs";
import { Chip, KeyFact, RatioBar, VarietyBadge } from "@/components/ui/technical";
import { labNote } from "@/demo/content";
import type { CatalogItem } from "@/server/products";

const num = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);
const UNIT = { porcentaje: "%", mg_ml: "mg/ml", mg_g: "mg/g" } as const;

/** "1:2" or "5:1", rounded to the nearest whole ratio. */
function ratioLabel(thc: number, cbd: number) {
  if (!thc || !cbd) return thc ? "THC" : "CBD";
  return thc >= cbd ? `${Math.round(thc / cbd)}:1` : `1:${Math.round(cbd / thc)}`;
}

/**
 * A product's sheet for members: origin, composition and analysis, as tabs of one sheet (the
 * page's title already names the product). Only what the association loaded is shown; a missing
 * part says it is not published yet.
 */
export function ProductSheet({ product, photoSrc }: { product: CatalogItem; photoSrc: string | null }) {
  const s = product.sheet;
  const origin: [string, string | null][] = [
    ["Variedad", product.variety],
    ["Quimiotipo", product.chemotype],
    ["Cultivo", product.cultivation],
    ["Fecha de cultivo", day(product.cultivatedOn)],
    ["Cosecha", day(s.harvestedOn)],
    ["Análisis", day(s.analyzedOn)],
    ["Laboratorio", s.labName],
  ];
  const facts = origin.filter((f): f is [string, string] => !!f[1]);
  const unit = s.unit ? UNIT[s.unit] : "";
  const thc = s.thc ?? 0;
  const cbd = s.cbd ?? 0;
  const hasComposition = s.thc !== null || s.cbd !== null;
  const total = thc + cbd;
  const perDrop = s.unit === "mg_ml" && s.dropsPerMl && total ? total / s.dropsPerMl : null;

  return (
    <div className="@container min-w-0">
      <FolderSwitcher
          label={`Ficha de ${product.name}`}
          tabs={[
            {
              id: "origen",
              label: "Origen",
              tone: "green",
              icon: <Sprout className="size-4" strokeWidth={1.75} />,
              content: (
                <div className="space-y-5">
                  {photoSrc && product.photo ? (
                    <div className="flex justify-center overflow-hidden !rounded-[14px] bg-mist">
                      <Image src={photoSrc} alt={`Foto de ${product.name}`} width={product.photo.width} height={product.photo.height} unoptimized priority className="h-auto max-h-[26rem] w-auto max-w-full" />
                    </div>
                  ) : (
                    <PhotoPlaceholder label="Foto pendiente" className="aspect-[4/3] max-h-[22rem] w-full !rounded-[14px]" />
                  )}
                  {facts.length > 0 && (
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 @md:grid-cols-3">
                      {facts.map(([k, v]) => (
                        <div key={k} className="min-w-0">
                          <dt className="text-xs text-forest/85">{k}</dt>
                          <dd className="mt-0.5 font-medium break-words text-forest">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {product.description && <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-forest">{product.description}</p>}
                </div>
              ),
            },
            {
              id: "composicion",
              label: "Composición",
              tone: "green",
              icon: <Droplet className="size-4" strokeWidth={1.75} />,
              content: hasComposition ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {product.chemotype && <VarietyBadge tone="green">Quimiotipo {product.chemotype}</VarietyBadge>}
                    {total > 0 && <RatioBar tone="green" thc={thc} cbd={cbd} label="Proporción" className="w-full max-w-[13rem]" />}
                  </div>
                  <div>
                    {total > 0 && <h3 className="text-xl font-title text-forest">Relación THC:CBD ≈ {ratioLabel(thc, cbd)}</h3>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {s.thc !== null && (
                        <Chip tone="green">
                          THC ~{num(s.thc)} {unit}
                        </Chip>
                      )}
                      {s.cbd !== null && (
                        <Chip tone="green">
                          CBD ~{num(s.cbd)} {unit}
                        </Chip>
                      )}
                    </div>
                  </div>
                  {perDrop !== null && (
                    <KeyFact
                      tone="green"
                      value={<>1 gota = {num(perDrop)} mg</>}
                      caption="de cannabinoides totales"
                      rows={[
                        ["Concentración", `${num(total)} mg/ml`],
                        ["Gotero estándar", `${s.dropsPerMl} gotas/ml`],
                      ]}
                    />
                  )}
                </div>
              ) : (
                <p className="!rounded-control bg-forest-soft px-4 py-5 text-center text-small text-forest">La composición se publica cuando el laboratorio entrega el análisis.</p>
              ),
            },
            {
              id: "analisis",
              label: "Análisis",
              tone: "green",
              icon: <FlaskConical className="size-4" strokeWidth={1.75} />,
              content: (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Cromatografía (HPLC)</p>
                    <h3 className="mt-1 text-xl font-title text-forest">Perfil de cannabinoides</h3>
                  </div>
                  {s.cannabinoids.length ? (
                    <div className="overflow-hidden !rounded-[12px] border border-mist-line">
                      <table className="w-full text-left text-forest">
                        <caption className="sr-only">Perfil de cannabinoides de {product.name}</caption>
                        <thead className="bg-forest text-xs text-white">
                          <tr>
                            <th scope="col" className="px-4 py-2.5 font-medium">
                              Compuesto
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Concentración
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.cannabinoids.map((x, i) => (
                            <tr key={`${x.compound}-${i}`} className="border-t border-mist-line odd:bg-forest-soft/50">
                              <th scope="row" className="px-4 py-2.5 font-medium">
                                {x.compound}
                              </th>
                              <td className="px-4 py-2.5 text-right tabular-nums">{x.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="!rounded-control bg-forest-soft px-4 py-5 text-center text-small text-forest">El perfil se publica cuando el laboratorio entrega el análisis.</p>
                  )}
                  {(s.cannabinoids.length > 0 || s.labName) && (
                    <p className="flex items-start gap-3 !rounded-[12px] bg-forest-soft px-4 py-3 text-sm text-forest">
                      <Info aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
                      {labNote}
                    </p>
                  )}
                  {s.hasCertificate ? (
                    <a
                      href={`/qr/productos/${product.id}/certificado`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))] px-5 text-[15px] font-medium !text-white @md:w-auto @md:text-base"
                    >
                      <FileBadge aria-hidden className="size-4" strokeWidth={1.5} /> Ver certificado de análisis
                      <span className="sr-only">(PDF, se abre en otra pestaña)</span>
                    </a>
                  ) : (
                    <p className="text-small text-forest">El certificado de análisis de este producto todavía no está disponible.</p>
                  )}
                </div>
              ),
            },
          ]}
        />
    </div>
  );
}
