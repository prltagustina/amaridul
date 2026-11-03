import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PageBand } from "@/components/brand/page-band";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { DISPENSING_NOTE, FactList, photoSrc, productFacts, PURCHASE_NOTICE } from "@/components/products/product-card";
import { Alert } from "@/components/ui/display";
import { getDb } from "@/server/db";
import { currentMember } from "@/server/member-session";
import { getCatalogItem } from "@/server/products";

const catalogItem = cache(async (id: string) => getCatalogItem(await getDb(), id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await catalogItem((await params).id);
  return { title: `${product?.name ?? "Producto no disponible"} | Amarí Dul` };
}

/** One product's sheet: its photo in its own proportions and what describes it. Inactive or unknown: not found. */
export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const product = await catalogItem((await params).id);
  if (!product) notFound();
  const src = photoSrc(product);
  return (
    <main>
      <PageBand compact tone="green" eyebrow={product.type} title={product.name} tab="Ficha del producto" back={{ href: "/qr/productos", label: "Productos" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column space-y-6">
          <article aria-label={`Ficha de ${product.name}`} className="@container overflow-hidden !rounded-card border border-mist-line bg-white shadow-[0_18px_40px_-28px_rgba(26,26,24,0.35)]">
            <div className="grid gap-6 bg-mist/60 p-4 sm:p-6 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @3xl:items-start">
              {src && product.photo ? (
                <div className="flex justify-center overflow-hidden !rounded-[14px] bg-mist">
                  <Image src={src} alt={`Foto de ${product.name}`} width={product.photo.width} height={product.photo.height} unoptimized priority className="h-auto max-h-[34rem] w-auto max-w-full" />
                </div>
              ) : (
                <PhotoPlaceholder label="Foto pendiente" className="aspect-[4/3] !rounded-[14px]" />
              )}
              <div className="space-y-5 px-1">
                <FactList facts={productFacts(product).filter((f) => f.label !== "Tipo")} />
                {product.description && <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-forest">{product.description}</p>}
              </div>
            </div>
          </article>
          <Alert tone="info" title="Comprar desde tu cuenta todavía no está disponible">
            {PURCHASE_NOTICE}
          </Alert>
          <p className="text-small text-text-muted">{DISPENSING_NOTE}</p>
        </div>
      </div>
    </main>
  );
}
