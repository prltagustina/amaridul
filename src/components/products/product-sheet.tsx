"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Droplet, FileBadge, FlaskConical, Info, Sprout } from "lucide-react";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { FolderSwitcher } from "@/components/ui/folder-tabs";
import { CannabinoidFigures, KeyFact } from "@/components/ui/technical";
import { labNote } from "@/demo/content";
import type { CatalogItem } from "@/server/products";

const num = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);
const UNIT = { porcentaje: "%", mg_ml: "mg/ml", mg_g: "mg/g" } as const;

/**
 * A product's sheet for members: origin, composition and analysis, as tabs of one sheet (the
 * page's title already names the product). Only what the association loaded is shown; a missing
 * part says it is not published yet. `footer` closes the sheet under every tab.
 */
export function ProductSheet({ product, photoSrc, footer }: { product: CatalogItem; photoSrc: string | null; footer?: ReactNode }) {
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
  const hasComposition = s.thc !== null || s.cbd !== null;
  const total = (s.thc ?? 0) + (s.cbd ?? 0);
  const perDrop = s.unit === "mg_ml" && s.dropsPerMl && total ? total / s.dropsPerMl : null;

  return (
    <div className="@container min-w-0">
      <FolderSwitcher
          label={`Ficha de ${product.name}`}
          footer={footer}
          tabs={[
            {
              id: "origen",
              label: "Origen",
              tone: "green",
              icon: <Sprout className="size-4" strokeWidth={1.75} />,
              content: (
                <div className="space-y-5">
                  {/* The photo fills the sheet's width, like the product previews (4:3, lower on a computer). */}
                  {photoSrc && product.photo ? (
                    <div className="relative aspect-[4/3] max-h-[26rem] w-full overflow-hidden !rounded-[14px] bg-mist">
                      <Image src={photoSrc} alt={`Foto de ${product.name}`} fill unoptimized priority sizes="(min-width: 1024px) 42rem, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <PhotoPlaceholder label="Foto pendiente" className="aspect-[4/3] max-h-[26rem] w-full !rounded-[14px]" />
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
                  <div>
                    {product.chemotype && <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Quimiotipo {product.chemotype}</p>}
                    <h3 className="mt-1 text-xl font-title text-forest">Cannabinoides principales</h3>
                  </div>
                  <CannabinoidFigures thc={s.thc} cbd={s.cbd} unit={unit} />
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
