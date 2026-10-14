"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { createProduct, DuplicateProductError, productInput, ProductNotFoundError, renameVariety, UnknownVarietyError, updateProduct, varietyNameInput } from "@/server/products";

export type ProductFormValues = { name: string; type: string; varietyId: string; cultivation: string; chemotype: string; description: string; status: string };
export type ProductActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ProductFormValues, string>> };

function parse(values: ProductFormValues) {
  const r = productInput.safeParse(values);
  if (r.success) return { data: r.data } as const;
  const fieldErrors: Partial<Record<keyof ProductFormValues, string>> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof ProductFormValues;
    fieldErrors[k] ??= issue.message;
  }
  return { result: { ok: false, error: "Revisá los datos marcados.", fieldErrors } } as const;
}

function failure(e: unknown): ProductActionResult {
  if (e instanceof DuplicateProductError) return { ok: false, error: e.message, fieldErrors: { name: e.message } };
  if (e instanceof ProductNotFoundError) return { ok: false, error: "El producto ya no existe. Recargá la página." };
  if (e instanceof UnknownVarietyError) return { ok: false, error: e.message, fieldErrors: { varietyId: e.message } };
  console.error("Product save failed:", e instanceof Error ? e.message : e);
  return { ok: false, error: "No pudimos guardar el producto. Probá de nuevo." };
}

export async function createProductAction(values: ProductFormValues): Promise<ProductActionResult> {
  const { user } = await requireAdmin();
  const parsed = parse(values);
  if (!parsed.data) return parsed.result;
  try {
    await createProduct(await getDb(), user.id, parsed.data);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/productos");
  return { ok: true };
}

export async function updateProductAction(id: string, values: ProductFormValues): Promise<ProductActionResult> {
  const { user } = await requireAdmin();
  const parsed = parse(values);
  if (!parsed.data) return parsed.result;
  try {
    await updateProduct(await getDb(), user.id, String(id), parsed.data);
  } catch (e) {
    return failure(e);
  }
  revalidatePath("/admin/productos");
  return { ok: true };
}

export async function renameVarietyAction(id: string, name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireAdmin();
  const parsed = varietyNameInput.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await renameVariety(await getDb(), user.id, String(id), parsed.data);
  } catch (e) {
    if (e instanceof UnknownVarietyError) return { ok: false, error: e.message };
    console.error("Variety rename failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos guardar el nombre. Probá de nuevo." };
  }
  revalidatePath("/admin/productos");
  return { ok: true };
}
