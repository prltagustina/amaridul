// Product photos for the members' catalog. They live in the database, apart from the private storage
// of member documents: the admin's browser re-encodes the photo as a JPEG of at most 1600 px, and
// this module checks it again and keeps only the image, without camera, date or location data.
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { productPhotos, products } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { photoMeta, ProductNotFoundError, type PhotoMeta } from "@/server/products";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTO_SIDE = 2400;

export class PhotoError extends Error {}

// Start of frame markers, which carry the image size; C4 (DHT), C8 and CC (DAC) are not frames.
const FRAMES = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const isRestart = (m: number) => m >= 0xd0 && m <= 0xd7;

/**
 * The same JPEG without its APPn and comment segments, wherever they are: EXIF (camera, date, GPS
 * position), XMP, IPTC, colour profiles and embedded thumbnails. The image data is copied as it is;
 * anything after the end of the image is dropped. Null when the bytes are not a well-formed JPEG.
 */
export function cleanJpeg(b: Uint8Array): { bytes: Uint8Array; width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let width = 0;
  let height = 0;
  let scans = 0;
  let p = 2;
  while (p + 1 < b.length) {
    if (b[p] !== 0xff) return null;
    while (b[p + 1] === 0xff) p++; // fill bytes before a marker
    const marker = b[p + 1];
    if (marker === undefined) return null;
    if (marker === 0xd9) {
      if (!scans || !width || !height) return null;
      out.push(b.subarray(p, p + 2));
      const bytes = new Uint8Array(out.reduce((n, x) => n + x.length, 0));
      let at = 0;
      for (const x of out) {
        bytes.set(x, at);
        at += x.length;
      }
      return { bytes, width, height };
    }
    if (marker === 0x00 || marker === 0x01 || marker === 0xd8 || isRestart(marker) || p + 3 >= b.length) return null;
    const length = (b[p + 2] << 8) | b[p + 3];
    const end = p + 2 + length;
    if (length < 2 || end > b.length) return null;
    if (FRAMES.has(marker)) {
      if (length < 8 || width) return null;
      height = (b[p + 5] << 8) | b[p + 6];
      width = (b[p + 7] << 8) | b[p + 8];
    }
    const metadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!metadata) out.push(b.subarray(p, end));
    p = end;
    if (marker === 0xda) {
      scans++;
      // The coded image runs until the next marker; FF00 is an escaped byte and FFD0–FFD7 a restart.
      let q = p;
      while (q + 1 < b.length && !(b[q] === 0xff && b[q + 1] !== 0x00 && !isRestart(b[q + 1]))) q++;
      if (q + 1 >= b.length) return null;
      out.push(b.subarray(p, q));
      p = q;
    }
  }
  return null;
}

/** Saves (or replaces) the product's photo. Throws PhotoError with a message for the admin. */
export async function setProductPhoto(db: Database, actorUserId: string, productId: string, raw: Uint8Array): Promise<PhotoMeta> {
  if (raw.length > MAX_PHOTO_BYTES) throw new PhotoError("La foto pesa más de 2 MB. Elegila de nuevo para que se achique.");
  const clean = cleanJpeg(raw);
  if (!clean) throw new PhotoError("El archivo no es una foto JPG válida.");
  if (clean.width > MAX_PHOTO_SIDE || clean.height > MAX_PHOTO_SIDE) throw new PhotoError(`La foto mide más de ${MAX_PHOTO_SIDE} píxeles por lado.`);
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new ProductNotFoundError("El producto no existe.");
  const sha256 = createHash("sha256").update(clean.bytes).digest("hex");
  const row = { bytes: clean.bytes, width: clean.width, height: clean.height, sha256, updatedBy: actorUserId, updatedAt: new Date() };
  await db.transaction(async (tx) => {
    const [product] = await tx.select({ name: products.name }).from(products).where(eq(products.id, productId)).for("update");
    if (!product) throw new ProductNotFoundError("El producto no existe.");
    const [before] = await tx.select({ sha256: productPhotos.sha256 }).from(productPhotos).where(eq(productPhotos.productId, productId));
    if (before?.sha256 === sha256) return;
    await tx
      .insert(productPhotos)
      .values({ productId, ...row })
      .onConflictDoUpdate({ target: productPhotos.productId, set: row });
    await audit(tx as unknown as Database, {
      actorUserId,
      action: "product.photo_set",
      entityType: "product",
      entityId: productId,
      metadata: { name: product.name, width: clean.width, height: clean.height, bytes: clean.bytes.length, replaced: !!before },
    });
  });
  return photoMeta(row);
}

/** Removes the product's photo; false when it had none. */
export async function removeProductPhoto(db: Database, actorUserId: string, productId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return false;
  return db.transaction(async (tx) => {
    const [gone] = await tx.delete(productPhotos).where(eq(productPhotos.productId, productId)).returning({ productId: productPhotos.productId });
    if (!gone) return false;
    const [product] = await tx.select({ name: products.name }).from(products).where(eq(products.id, productId));
    await audit(tx as unknown as Database, { actorUserId, action: "product.photo_removed", entityType: "product", entityId: productId, metadata: { name: product?.name ?? null } });
    return true;
  });
}

/** The photo's bytes, for the image routes. With `activeOnly`, a product that is not active has none. */
export async function readProductPhoto(db: Database, productId: string, { activeOnly }: { activeOnly: boolean }) {
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return null;
  const [row] = await db
    .select({ bytes: productPhotos.bytes, sha256: productPhotos.sha256, width: productPhotos.width, height: productPhotos.height })
    .from(productPhotos)
    .innerJoin(products, eq(products.id, productPhotos.productId))
    .where(activeOnly ? and(eq(productPhotos.productId, productId), eq(products.status, "activo")) : eq(productPhotos.productId, productId));
  return row ? { bytes: row.bytes, meta: photoMeta(row) } : null;
}

/**
 * The photo as an image response. A URL that names the current version (`?v=`) can be kept by the
 * browser: a new photo gets a new URL, so nothing stale is shown. Any other URL is never stored.
 */
export function photoResponse(request: Request, photo: { bytes: Uint8Array; meta: PhotoMeta }): Response {
  const versioned = new URL(request.url).searchParams.get("v") === photo.meta.version;
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(photo.bytes.byteLength),
      "Cache-Control": versioned ? "private, max-age=31536000, immutable" : "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/** Reads at most MAX_PHOTO_BYTES of a request body, whatever it claims. Null when it is larger. */
export const readPhotoBody = (request: Request) => readLimitedBody(request, MAX_PHOTO_BYTES);

/** Reads at most `max` bytes of a request body, whatever it claims. Null when it is larger. */
export async function readLimitedBody(request: Request, max: number): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    body.set(c, at);
    at += c.length;
  }
  return body;
}
