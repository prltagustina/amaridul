import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { DISPENSING_NOTE, ProductCard, PURCHASE_NOTICE } from "@/components/products/product-card";
import { Alert, EmptyState } from "@/components/ui/display";
import { getDb } from "@/server/db";
import { currentMember } from "@/server/member-session";
import { listCatalog } from "@/server/products";
import { CATALOG_BAND } from "./band";

export const metadata: Metadata = { title: "Productos | Amarí Dul" };

/**
 * The catalog for members with an active membership; it does not depend on REPROCANN. Read on
 * every request: a product the admin publishes, edits or deactivates shows (or goes) right away.
 */
export default async function ProductosPage() {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const catalog = await listCatalog(await getDb());
  return (
    <main>
      <PageBand compact tone="green" width="wide" {...CATALOG_BAND} />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column space-y-6">
          <Alert tone="info" title="Comprar desde tu cuenta todavía no está disponible">
            {PURCHASE_NOTICE}
          </Alert>
          {catalog.length ? (
            <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Package aria-hidden className="size-9" strokeWidth={1.25} />} title="Todavía no hay productos publicados" description="Cuando la asociación publique su catálogo, lo vas a ver acá." />
          )}
          <p className="text-small text-text-muted">{DISPENSING_NOTE}</p>
        </div>
      </div>
    </main>
  );
}
