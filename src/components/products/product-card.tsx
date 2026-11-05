import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { cn } from "@/lib/cn";
import type { CatalogItem } from "@/server/products";

/** The photo as members see it. Its URL changes with every new photo, so it is never stale. */
export const photoSrc = (p: Pick<CatalogItem, "id" | "photo">) => (p.photo ? `/qr/productos/${p.id}/foto?v=${p.photo.version}` : null);

/** The product's photo, or the leaf placeholder, filling its frame. */
function Photo({ product, sizes, className }: { product: CatalogItem; sizes: string; className?: string }) {
  const src = photoSrc(product);
  return (
    <div className={cn("relative overflow-hidden bg-mist", className)}>
      {src ? (
        <Image src={src} alt="" fill unoptimized sizes={sizes} className="object-cover transition-transform duration-300 motion-safe-only group-hover:scale-[1.03]" />
      ) : (
        <PhotoPlaceholder label="Foto pendiente" className="size-full max-sm:[&>span]:hidden" />
      )}
    </div>
  );
}

/**
 * A product in a short preview (Mi espacio, the next product on a sheet): the photo, its type and
 * name, and «Ver ficha», one click to its sheet. In a row beside a small photo on a phone; photo on
 * top from 640 px. `eyebrow` replaces the type over the name (the type then goes under it).
 */
export function ProductPreview({ product, eyebrow }: { product: CatalogItem; eyebrow?: string }) {
  return (
    <Link
      href={`/qr/productos/${product.id}`}
      aria-label={`${eyebrow ? `${eyebrow}: ` : "Ver la ficha de "}${product.name}`}
      className="group grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 !rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest sm:grid-cols-1 sm:items-start sm:gap-3"
    >
      <Photo product={product} sizes="(min-width: 640px) 16rem, 6rem" className="aspect-square !rounded-control sm:aspect-[4/3]" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-eyebrow text-accent">{eyebrow ?? product.type}</p>
        <p className="font-title text-lg leading-snug text-forest underline-offset-4 [overflow-wrap:anywhere] group-hover:underline">{product.name}</p>
        {(eyebrow ? product.type : product.variety) && <p className="truncate text-sm text-text-muted">{eyebrow ? product.type : product.variety}</p>}
        <p className="flex items-center gap-1.5 pt-1.5 text-sm font-medium text-forest">
          Ver ficha <ArrowRight aria-hidden className="size-4 transition-transform motion-safe-only group-hover:translate-x-0.5" strokeWidth={1.5} />
        </p>
      </div>
    </Link>
  );
}

/**
 * Going through the catalog from a sheet, without going back to it: «‹ Anterior · Producto 2 de 3
 * · Siguiente ›», in the catalog's order. It wraps around, so there is always a next one.
 */
export function ProductStepper({ position, total, prev, next }: { position: number; total: number; prev: CatalogItem | null; next: CatalogItem | null }) {
  // It sits in the page's coloured header: white, like the rest of it.
  const link = "inline-flex min-h-11 items-center gap-1 font-medium !text-white underline-offset-4 hover:underline focus-visible:!outline-white";
  return (
    <nav aria-label="Recorrer los productos" className="mt-4 flex flex-wrap items-center gap-x-5 text-sm">
      {prev && (
        <Link href={`/qr/productos/${prev.id}`} className={cn(link, "-ml-1")}>
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} /> Anterior<span className="sr-only">: {prev.name}</span>
        </Link>
      )}
      <span className="text-white tabular-nums">
        Producto {position} de {total}
      </span>
      {next && (
        <Link href={`/qr/productos/${next.id}`} className={link}>
          Siguiente<span className="sr-only"> producto: {next.name}</span> <ChevronRight aria-hidden className="size-4" strokeWidth={1.75} />
        </Link>
      )}
    </nav>
  );
}

export const PURCHASE_NOTICE = "Próximamente vas a poder comprar productos desde tu cuenta. Te avisaremos cuando esté disponible.";
export const DISPENSING_NOTE = "Ver los productos no habilita una dispensa: para eso hacen falta tres condiciones (membresía activa, credencial REPROCANN verificada y vinculación con Amarí Dul verificada). Las ves en Mi espacio, en Trámites.";
