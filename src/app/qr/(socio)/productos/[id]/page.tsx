import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PageBand } from "@/components/brand/page-band";
import { DISPENSING_NOTE, photoSrc, PURCHASE_NOTICE } from "@/components/products/product-card";
import { ProductSheet } from "@/components/products/product-sheet";
import { Alert } from "@/components/ui/display";
import { getDb } from "@/server/db";
import { currentMember } from "@/server/member-session";
import { getCatalogItem } from "@/server/products";

const catalogItem = cache(async (id: string) => getCatalogItem(await getDb(), id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await catalogItem((await params).id);
  return { title: `${product?.name ?? "Producto no disponible"} | Amarí Dul` };
}

/** One product's sheet: origin, composition and analysis, as the association loaded them. Inactive or unknown: not found. */
export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const product = await catalogItem((await params).id);
  if (!product) notFound();
  return (
    <main>
      <PageBand compact tone="green" eyebrow={product.type} title={product.name} tab="Ficha del producto" back={{ href: "/qr/productos", label: "Productos" }} width="wide" />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column">
          <div className="max-w-2xl space-y-6">
            <ProductSheet product={product} photoSrc={photoSrc(product)} />
            <Alert tone="info" title="Comprar desde tu cuenta todavía no está disponible">
              {PURCHASE_NOTICE}
            </Alert>
            <p className="text-small text-text-muted">{DISPENSING_NOTE}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
