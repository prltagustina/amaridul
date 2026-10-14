import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { listProducts, PRODUCT_TYPES, productTypeLabel } from "@/server/products";
import ProductsManager, { type ProductRow } from "./products-manager";

export default async function ProductosPage() {
  await requireAdmin();
  const rows: ProductRow[] = (await listProducts(await getDb())).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: productTypeLabel(p.type),
    description: p.description,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
  }));
  return <ProductsManager rows={rows} types={PRODUCT_TYPES} />;
}
