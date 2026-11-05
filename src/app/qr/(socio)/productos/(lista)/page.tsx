import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { EmptyState } from "@/components/ui/display";
import { getDb } from "@/server/db";
import { currentMember } from "@/server/member-session";
import { listCatalog } from "@/server/products";

export const metadata: Metadata = { title: "Productos | Amarí Dul" };

/**
 * «Productos» opens the first product's sheet: there is no list to browse, each sheet leads to the
 * next one (and Mi espacio previews them). With nothing published yet, it says so.
 */
export default async function ProductosPage() {
  const member = await currentMember();
  if (member !== "demo" && member.status !== "activo") redirect("/qr/mi-espacio");
  const [first] = await listCatalog(await getDb());
  if (first) redirect(`/qr/productos/${first.id}`);
  return (
    <main>
      <PageBand compact width="wide" eyebrow="Productos" title="Productos de la asociación" back={{ href: "/qr/mi-espacio", label: "Mi espacio" }} />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="portal-column">
          <EmptyState icon={<Package aria-hidden className="size-9" strokeWidth={1.25} />} title="Todavía no hay productos publicados" description="Cuando la asociación publique sus productos, los vas a ver acá." />
        </div>
      </div>
    </main>
  );
}
