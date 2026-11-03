// A product's technical sheet: origin (harvest, lab, analysis date), composition (THC and CBD,
// drops per ml for oils) and the lab analysis (cannabinoid profile and its PDF certificate). The
// admin fills it in; members see it with the product. Nothing here is about lots or deliveries.
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { productCertificates, products } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { ProductNotFoundError } from "@/server/products";

export const MAX_CERTIFICATE_BYTES = 8 * 1024 * 1024;
export class CertificateError extends Error {}

export const COMPOSITION_UNITS = [
  { value: "porcentaje", label: "%", hint: "Porcentaje (flores)" },
  { value: "mg_ml", label: "mg/ml", hint: "mg/ml (aceites)" },
  { value: "mg_g", label: "mg/g", hint: "mg/g (cremas)" },
] as const;
export type CompositionUnit = (typeof COMPOSITION_UNITS)[number]["value"];
export const unitLabel = (u: CompositionUnit | null) => COMPOSITION_UNITS.find((x) => x.value === u)?.label ?? "";

const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const pastDate = (what: string) =>
  z
    .union([z.iso.date({ error: `Revisá la fecha de ${what}.` }).refine((d) => d <= todayInArgentina(), `La fecha de ${what} no puede ser posterior a hoy.`), z.literal("")])
    .optional()
    .transform((v) => v || null);
/** «18,5» or «18.5» → "18.50"; empty → null. */
const amount = (what: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        ctx.addIssue({ code: "custom", message: `Escribí el ${what} como número, por ejemplo 18,5.` });
        return z.NEVER;
      }
      return n.toFixed(2);
    });

export const sheetInput = z.object({
  harvestedOn: pastDate("cosecha"),
  labName: z
    .string()
    .trim()
    .max(80, "Hasta 80 caracteres.")
    .optional()
    .transform((v) => v || null),
  analyzedOn: pastDate("análisis"),
  compositionUnit: z
    .union([z.enum(["porcentaje", "mg_ml", "mg_g"]), z.literal("")])
    .optional()
    .transform((v) => v || null),
  thc: amount("THC"),
  cbd: amount("CBD"),
  dropsPerMl: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        ctx.addIssue({ code: "custom", message: "Escribí cuántas gotas tiene un ml (de 1 a 100)." });
        return z.NEVER;
      }
      return n;
    }),
  cannabinoids: z
    .array(z.object({ compound: z.string().trim().max(40, "Hasta 40 caracteres."), value: z.string().trim().max(30, "Hasta 30 caracteres.") }))
    .max(20, "Hasta 20 filas.")
    .optional()
    .transform((rows) => {
      const kept = (rows ?? []).filter((r) => r.compound || r.value);
      return kept.length ? kept : null;
    }),
});
export type SheetInput = z.infer<typeof sheetInput>;

const FIELDS = ["harvestedOn", "labName", "analyzedOn", "compositionUnit", "thc", "cbd", "dropsPerMl", "cannabinoids"] as const;

/** Saves the sheet and records which fields changed. Amounts need their unit. */
export async function updateProductSheet(db: Database, actorUserId: string, id: string, input: SheetInput): Promise<void> {
  if ((input.thc || input.cbd) && !input.compositionUnit) throw new ProductSheetError("Elegí la unidad de THC y CBD.");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ProductNotFoundError("El producto no existe.");
  const [before] = await db.select().from(products).where(eq(products.id, id));
  if (!before) throw new ProductNotFoundError("El producto no existe.");
  const same = (k: (typeof FIELDS)[number]) => JSON.stringify(before[k] ?? null) === JSON.stringify(input[k] ?? null);
  const changed = FIELDS.filter((k) => !same(k));
  if (!changed.length) return;
  await db.transaction(async (tx) => {
    await tx.update(products).set({ ...input, updatedBy: actorUserId, updatedAt: new Date() }).where(eq(products.id, id));
    await audit(tx as unknown as Database, { actorUserId, action: "product.sheet_updated", entityType: "product", entityId: id, metadata: { name: before.name, fields: changed.join(", ") } });
  });
}
export class ProductSheetError extends Error {}

// ── Certificate ───────────────────────────────────────────────────────────────────────────────

export async function setProductCertificate(db: Database, actorUserId: string, productId: string, bytes: Uint8Array): Promise<void> {
  if (!bytes.length || bytes.length > MAX_CERTIFICATE_BYTES) throw new CertificateError("El certificado tiene que ser un PDF de hasta 8 MB.");
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new CertificateError("El archivo no es un PDF.");
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new ProductNotFoundError("El producto no existe.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await db.transaction(async (tx) => {
    const [p] = await tx.select({ name: products.name }).from(products).where(eq(products.id, productId)).for("update");
    if (!p) throw new ProductNotFoundError("El producto no existe.");
    const row = { bytes, size: bytes.length, sha256, uploadedBy: actorUserId, uploadedAt: new Date() };
    await tx.insert(productCertificates).values({ productId, ...row }).onConflictDoUpdate({ target: productCertificates.productId, set: row });
    await audit(tx as unknown as Database, { actorUserId, action: "product.certificate_set", entityType: "product", entityId: productId, metadata: { name: p.name, bytes: bytes.length } });
  });
}

export async function removeProductCertificate(db: Database, actorUserId: string, productId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return false;
  return db.transaction(async (tx) => {
    const [gone] = await tx.delete(productCertificates).where(eq(productCertificates.productId, productId)).returning({ productId: productCertificates.productId });
    if (!gone) return false;
    await audit(tx as unknown as Database, { actorUserId, action: "product.certificate_removed", entityType: "product", entityId: productId });
    return true;
  });
}

/** The certificate's bytes, for the routes. With `activeOnly`, a product that is not active has none. */
export async function readProductCertificate(db: Database, productId: string, { activeOnly }: { activeOnly: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return null;
  const [row] = await db
    .select({ bytes: productCertificates.bytes, name: products.name })
    .from(productCertificates)
    .innerJoin(products, eq(products.id, productCertificates.productId))
    .where(activeOnly ? and(eq(productCertificates.productId, productId), eq(products.status, "activo")) : eq(productCertificates.productId, productId));
  return row ?? null;
}

/** The certificate as a PDF shown in the browser, never stored by it. */
export function certificateResponse(cert: { bytes: Uint8Array; name: string }): Response {
  const file = `certificado-${cert.name.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase()}.pdf`;
  return new Response(Buffer.from(cert.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(cert.bytes.byteLength),
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
