import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { products } from "@/server/db/schema";
import { audit } from "@/server/audit/log";

export type ProductType = (typeof products.$inferSelect)["type"];
export type ProductStatus = (typeof products.$inferSelect)["status"];
export type Product = typeof products.$inferSelect;

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "aceite", label: "Aceite" },
  { value: "flor-seca", label: "Flor seca" },
  { value: "crema-topica", label: "Crema tópica" },
  { value: "otro", label: "Otro" },
];

export const productTypeLabel = (t: ProductType) => PRODUCT_TYPES.find((p) => p.value === t)?.label ?? t;

export const productInput = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del producto.").max(80, "El nombre puede tener hasta 80 caracteres."),
  type: z.enum(["aceite", "flor-seca", "crema-topica", "otro"], { error: "Elegí el tipo de producto." }),
  description: z
    .string()
    .trim()
    .max(500, "La descripción puede tener hasta 500 caracteres.")
    .optional()
    .transform((v) => v || null),
  status: z.enum(["activo", "inactivo"]),
});
export type ProductInput = z.infer<typeof productInput>;

export class DuplicateProductError extends Error {}
export class ProductNotFoundError extends Error {}

// Postgres reports the unique index by name, through the driver's error or its cause.
function isDuplicateName(e: unknown): boolean {
  const text = (x: unknown) => (x instanceof Error ? `${x.message} ${(x as { constraint?: string }).constraint ?? ""}` : "");
  return /products_name_unique/.test(text(e) + text((e as { cause?: unknown })?.cause));
}

export async function listProducts(db: Database): Promise<Product[]> {
  return db.select().from(products).orderBy(asc(products.status), asc(products.name));
}

export async function getProduct(db: Database, id: string): Promise<Product | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [p] = await db.select().from(products).where(eq(products.id, id));
  return p ?? null;
}

export async function createProduct(db: Database, actorUserId: string, input: ProductInput): Promise<string> {
  try {
    return await db.transaction(async (tx) => {
      const [p] = await tx.insert(products).values({ ...input, createdBy: actorUserId, updatedBy: actorUserId }).returning({ id: products.id });
      await audit(tx as unknown as Database, { actorUserId, action: "product.created", entityType: "product", entityId: p.id, metadata: { name: input.name, type: input.type, status: input.status } });
      return p.id;
    });
  } catch (e) {
    if (isDuplicateName(e)) throw new DuplicateProductError("Ya existe un producto con ese nombre.");
    throw e;
  }
}

/** Saves the edit and records which fields changed, with their previous and new values. */
export async function updateProduct(db: Database, actorUserId: string, id: string, input: ProductInput): Promise<void> {
  const before = await getProduct(db, id);
  if (!before) throw new ProductNotFoundError("El producto no existe.");
  const changed = (["name", "type", "description", "status"] as const).filter((k) => (before[k] ?? null) !== (input[k] ?? null));
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
