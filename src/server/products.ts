import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { products, varieties } from "@/server/db/schema";
import { audit } from "@/server/audit/log";

export type ProductType = (typeof products.$inferSelect)["type"];
export type ProductStatus = (typeof products.$inferSelect)["status"];
export type Product = typeof products.$inferSelect;
export type Variety = typeof varieties.$inferSelect;

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "aceite", label: "Aceite" },
  { value: "crema", label: "Crema" },
  { value: "inflorescencia", label: "Inflorescencia" },
];
export const CULTIVATION_MODES = [
  { value: "exterior", label: "Exterior" },
  { value: "controladas", label: "Condiciones controladas" },
] as const;
export const CHEMOTYPES = [
  { value: "1", label: "Quimiotipo 1" },
  { value: "2", label: "Quimiotipo 2" },
  { value: "3", label: "Quimiotipo 3" },
] as const;

const labelOf = (list: readonly { value: string; label: string }[], v: string | null) => (v ? (list.find((o) => o.value === v)?.label ?? v) : null);
export const productTypeLabel = (t: ProductType) => labelOf(PRODUCT_TYPES, t) ?? t;
export const cultivationLabel = (v: string | null) => labelOf(CULTIVATION_MODES, v);
export const chemotypeLabel = (v: string | null) => labelOf(CHEMOTYPES, v);
/** "G1" until the definitive name is set, then "G1 · Name". */
export const varietyLabel = (v: Pick<Variety, "code" | "name">) => (v.name ? `${v.code} · ${v.name}` : v.code);

export const productInput = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del producto.").max(80, "El nombre puede tener hasta 80 caracteres."),
  type: z.enum(["aceite", "crema", "inflorescencia"], { error: "Elegí el tipo de producto." }),
  varietyId: z.uuid({ error: "Elegí la variedad." }),
  cultivation: z.enum(["exterior", "controladas"], { error: "Elegí la modalidad de cultivo." }),
  chemotype: z.enum(["1", "2", "3"], { error: "Elegí el quimiotipo." }),
  description: z
    .string()
    .trim()
    .max(500, "La descripción puede tener hasta 500 caracteres.")
    .optional()
    .transform((v) => v || null),
  status: z.enum(["activo", "inactivo"]),
});
export type ProductInput = z.infer<typeof productInput>;

export const varietyNameInput = z
  .string()
  .trim()
  .max(60, "El nombre puede tener hasta 60 caracteres.")
  .transform((v) => v || null);

export class DuplicateProductError extends Error {}
export class ProductNotFoundError extends Error {}
export class UnknownVarietyError extends Error {}

// Postgres reports the unique index by name, through the driver's error or its cause.
function isDuplicateName(e: unknown): boolean {
  const text = (x: unknown) => (x instanceof Error ? `${x.message} ${(x as { constraint?: string }).constraint ?? ""}` : "");
  return /products_name_unique/.test(text(e) + text((e as { cause?: unknown })?.cause));
}

export async function listVarieties(db: Database): Promise<Variety[]> {
  return db.select().from(varieties).orderBy(asc(varieties.code));
}

export type ProductWithVariety = Product & { variety: Pick<Variety, "code" | "name"> | null };

export async function listProducts(db: Database): Promise<ProductWithVariety[]> {
  const rows = await db
    .select({ p: products, code: varieties.code, vname: varieties.name })
    .from(products)
    .leftJoin(varieties, eq(varieties.id, products.varietyId))
    .orderBy(asc(products.status), asc(products.name));
  return rows.map((r) => ({ ...r.p, variety: r.code ? { code: r.code, name: r.vname } : null }));
}

export async function getProduct(db: Database, id: string): Promise<Product | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await db.select().from(products).where(eq(products.id, id));
  return p ?? null;
}

async function assertVariety(db: Database, id: string) {
  const [v] = await db.select({ id: varieties.id }).from(varieties).where(eq(varieties.id, id));
  if (!v) throw new UnknownVarietyError("La variedad elegida no existe.");
}

export async function createProduct(db: Database, actorUserId: string, input: ProductInput): Promise<string> {
  await assertVariety(db, input.varietyId);
  try {
    return await db.transaction(async (tx) => {
      const [p] = await tx.insert(products).values({ ...input, createdBy: actorUserId, updatedBy: actorUserId }).returning({ id: products.id });
      await audit(tx as unknown as Database, {
        actorUserId,
        action: "product.created",
        entityType: "product",
        entityId: p.id,
        metadata: { name: input.name, type: input.type, cultivation: input.cultivation, chemotype: input.chemotype, status: input.status },
      });
      return p.id;
    });
  } catch (e) {
    if (isDuplicateName(e)) throw new DuplicateProductError("Ya existe un producto con ese nombre.");
    throw e;
  }
}

const EDITABLE = ["name", "type", "varietyId", "cultivation", "chemotype", "description", "status"] as const;

/** Saves the edit and records which fields changed, with their previous and new values. */
export async function updateProduct(db: Database, actorUserId: string, id: string, input: ProductInput): Promise<void> {
  const before = await getProduct(db, id);
  if (!before) throw new ProductNotFoundError("El producto no existe.");
  await assertVariety(db, input.varietyId);
  const changed = EDITABLE.filter((k) => (before[k] ?? null) !== (input[k] ?? null));
  if (!changed.length) return;
  try {
    await db.transaction(async (tx) => {
      await tx.update(products).set({ ...input, updatedBy: actorUserId, updatedAt: new Date() }).where(eq(products.id, id));
      const metadata: Record<string, string | null> = {};
      for (const k of changed) {
        metadata[`${k}_before`] = before[k] ?? null;
        metadata[`${k}_after`] = input[k] ?? null;
      }
      await audit(tx as unknown as Database, { actorUserId, action: "product.updated", entityType: "product", entityId: id, metadata });
    });
  } catch (e) {
    if (isDuplicateName(e)) throw new DuplicateProductError("Ya existe un producto con ese nombre.");
    throw e;
  }
}

/** Sets (or clears) the definitive name of a variety. The code (G1…G4) never changes. */
export async function renameVariety(db: Database, actorUserId: string, id: string, name: string | null): Promise<void> {
  const [v] = await db.select().from(varieties).where(eq(varieties.id, id));
  if (!v) throw new UnknownVarietyError("La variedad no existe.");
  if ((v.name ?? null) === name) return;
  await db.transaction(async (tx) => {
    await tx.update(varieties).set({ name, updatedBy: actorUserId, updatedAt: new Date() }).where(eq(varieties.id, id));
    await audit(tx as unknown as Database, { actorUserId, action: "variety.renamed", entityType: "variety", entityId: id, metadata: { variety: v.code, name_before: v.name, name_after: name } });
  });
}
