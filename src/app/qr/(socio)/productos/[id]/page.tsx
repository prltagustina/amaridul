import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PageBand } from "@/components/brand/page-band";
import { photoSrc, ProductNotices, ProductPreview, ProductStepper } from "@/components/products/product-card";
import { ProductSheet } from "@/components/products/product-sheet";
import { getDb } from "@/server/db";
import { currentMember } from "@/server/member-session";
import { listCatalog } from "@/server/products";

// The whole catalog once per request: the sheet, its place in the catalog and the next one.
const catalog = cache(async () => listCatalog(await getDb()));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = (await catalog()).find((p) => p.id === id);
  return { title: `${product?.name ?? "Producto no disponible"} | Amarí Dul` };
}

/**
 * One product's sheet: origin, composition and analysis, as the association loaded them, and the
 * way to the next one without going back to the catalog. Inactive or unknown: not found.
 */
export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const { id } = await params;
  const all = await catalog();
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) notFound();
  const product = all[i];
  const n = all.length;
  // In the catalog's order, wrapping around; with two products the other one is only «next».
  const next = n > 1 ? all[(i + 1) % n] : null;
  const prev = n > 2 ? all[(i - 1 + n) % n] : null;
  return (
    <main>
      <PageBand compact eyebrow={product.type} title={product.name} back={{ href: "/qr/mi-espacio#productos", label: "Mi espacio" }} width="wide">
        {n > 1 && <ProductStepper position={i + 1} total={n} prev={prev} next={next} />}
      </PageBand>
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className={next ? "portal-column grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10" : "portal-column max-w-[44.5rem]"}>
          <div className="min-w-0 space-y-6">
            <ProductSheet product={product} photoSrc={photoSrc(product)} />
            <ProductNotices />
          </div>
          {next && (
            <aside aria-label="Más productos" className="lg:sticky lg:top-6">
              <div className="!rounded-card border border-mist-line bg-white p-4">
                <ProductPreview product={next} eyebrow="Siguiente producto" />
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
