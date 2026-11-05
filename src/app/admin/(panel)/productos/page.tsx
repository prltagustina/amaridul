import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { CHEMOTYPES, chemotypeLabel, CULTIVATION_MODES, cultivationLabel, listProducts, listVarieties, PRODUCT_TYPES, productTypeLabel, varietyLabel } from "@/server/products";
import ProductsManager, { type ProductRow, type VarietyRow } from "./products-manager";

export default async function ProductosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  // From the panel search: «?editar=<product>» opens that product.
  const { editar } = await searchParams;
  const db = await getDb();
  const [products, varieties] = await Promise.all([listProducts(db), listVarieties(db)]);
  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: productTypeLabel(p.type),
    varietyId: p.varietyId ?? "",
    varietyLabel: p.variety ? varietyLabel(p.variety) : null,
    cultivation: p.cultivation ?? "",
    cultivationLabel: cultivationLabel(p.cultivation),
    chemotype: p.chemotype ?? "",
    chemotypeLabel: chemotypeLabel(p.chemotype),
    cultivatedOn: p.cultivatedOn ?? "",
    description: p.description,
    status: p.status,
    photo: p.photo,
    sheet: {
      harvestedOn: p.harvestedOn ?? "",
      labName: p.labName ?? "",
      analyzedOn: p.analyzedOn ?? "",
      compositionUnit: p.compositionUnit ?? "",
      thc: p.thc === null ? "" : Number(p.thc).toLocaleString("es-AR", { maximumFractionDigits: 2, useGrouping: false }),
      cbd: p.cbd === null ? "" : Number(p.cbd).toLocaleString("es-AR", { maximumFractionDigits: 2, useGrouping: false }),
      dropsPerMl: p.dropsPerMl === null ? "" : String(p.dropsPerMl),
      cannabinoids: p.cannabinoids ?? [],
      hasCertificate: p.hasCertificate,
    },
  }));
  const varietyRows: VarietyRow[] = varieties.map((v) => ({ id: v.id, code: v.code, name: v.name, label: varietyLabel(v) }));
  return (
    <ProductsManager
      rows={rows}
      initialEdit={typeof editar === "string" ? editar : null}
      varieties={varietyRows}
      options={{ types: PRODUCT_TYPES, cultivation: [...CULTIVATION_MODES], chemotypes: [...CHEMOTYPES] }}
    />
  );
}
