import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { Chip, TechBand } from "@/components/ui/technical";
import type { CatalogItem } from "@/server/products";

const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);

/** The photo as members see it. Its URL changes with every new photo, so it is never stale. */
export const photoSrc = (p: Pick<CatalogItem, "id" | "photo">) => (p.photo ? `/qr/productos/${p.id}/foto?v=${p.photo.version}` : null);

/** What describes the product, and only that: nothing about lots, deliveries or certificates. Empty fields are left out. */
export function productFacts(p: CatalogItem): { label: string; value: string }[] {
  const facts = [
    { label: "Tipo", value: p.type },
    { label: "Variedad", value: p.variety },
    { label: "Quimiotipo", value: p.chemotype },
    { label: "Cultivo", value: p.cultivation },
    { label: "Fecha de cultivo", value: day(p.cultivatedOn) },
  ];
  return facts.filter((f): f is { label: string; value: string } => !!f.value);
}

export function FactList({ facts, className }: { facts: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={className ?? "grid grid-cols-2 content-start gap-x-5 gap-y-3"}>
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs text-forest/85">{f.label}</dt>
          <dd className="mt-0.5 font-medium break-words text-forest">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A product in the members' catalog, drawn like the lot sheet: green band, photo, data. The whole card opens its sheet. */
export function ProductCard({ product }: { product: CatalogItem }) {
  const src = photoSrc(product);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden !rounded-card border border-mist-line bg-white shadow-[0_18px_40px_-28px_rgba(26,26,24,0.35)] transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(26,26,24,0.45)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-forest">
      <TechBand tone="green" className="relative overflow-hidden px-5 pt-4 pb-5">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-44 !rounded-full bg-hoja-500/25 blur-3xl" />
        <p className="relative text-[11px] font-medium tracking-[0.18em] text-white/75 uppercase">{product.type}</p>
        <h2 className="relative mt-1 font-display text-2xl leading-tight [overflow-wrap:anywhere]">{product.name}</h2>
      </TechBand>
      <div className="flex flex-1 flex-col gap-4 bg-mist/60 p-4">
        {src ? (
          <div className="relative aspect-[4/3] overflow-hidden !rounded-[14px] bg-mist">
            <Image src={src} alt="" fill unoptimized sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw" className="object-cover" />
          </div>
        ) : (
          <PhotoPlaceholder label="Foto pendiente" className="aspect-[4/3] !rounded-[14px]" />
        )}
        <FactList facts={productFacts(product).filter((f) => f.label !== "Tipo")} className="grid grid-cols-2 content-start gap-x-5 gap-y-3 px-1" />
        <Composition product={product} />
        {product.description && <p className="line-clamp-3 px-1 text-small leading-relaxed text-forest/85">{product.description}</p>}
        <p aria-hidden className="mt-auto flex items-center gap-1.5 px-1 pt-1 text-[0.9375rem] font-medium text-forest">
          Ver ficha <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
        </p>
      </div>
      <Link href={`/qr/productos/${product.id}`} className="absolute inset-0 z-10 focus-visible:outline-none">
        <span className="sr-only">Ver la ficha de {product.name}</span>
      </Link>
    </article>
  );
}

const UNIT = { porcentaje: "%", mg_ml: "mg/ml", mg_g: "mg/g" } as const;

/** THC and CBD as chips, when the association loaded them. */
function Composition({ product }: { product: CatalogItem }) {
  const { thc, cbd, unit } = product.sheet;
  if (thc === null && cbd === null) return null;
  const u = unit ? UNIT[unit] : "";
  const n = (x: number) => x.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {thc !== null && (
        <Chip tone="green">
          THC ~{n(thc)} {u}
        </Chip>
      )}
      {cbd !== null && (
        <Chip tone="green">
          CBD ~{n(cbd)} {u}
        </Chip>
      )}
    </div>
  );
}

export const PURCHASE_NOTICE = "Próximamente vas a poder comprar productos desde tu cuenta. Te avisaremos cuando esté disponible.";
export const DISPENSING_NOTE = "Ver los productos no significa estar habilitado para recibir una dispensa: esas condiciones las define la asociación.";
