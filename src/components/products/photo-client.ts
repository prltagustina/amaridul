// Product photos, in the admin's browser: the photo is re-encoded here as a JPEG of at most
// 1600 px before it is sent, which also drops camera, date and location data. The server checks it again.

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_SIDE = 1600;
const MIN_SIDE = 400;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export type PreparedPhoto = { blob: Blob; width: number; height: number };

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Elegí una foto JPG, PNG o WebP.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("La foto pesa más de 25 MB. Elegí una más liviana.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error("No pudimos abrir la foto. Probá con otra.");
    }
    const { naturalWidth: w, naturalHeight: h } = img;
    if (Math.max(w, h) < MIN_SIDE) throw new Error(`La foto es muy chica: elegí una de al menos ${MIN_SIDE} píxeles de lado.`);
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const width = Math.round(w * scale);
    const height = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no pudo preparar la foto.");
    // A transparent background would turn black in a JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Tu navegador no pudo preparar la foto.");
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function answer(res: Response, fallback: string): Promise<void> {
  const body = res.headers.get("content-type")?.includes("application/json") ? ((await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null) : null;
  if (res.ok && body?.ok) return;
  // Without a JSON answer the session probably ended (the server sent the login page).
  throw new Error(body?.error ?? (res.redirected || res.ok ? "Tu sesión se cerró. Volvé a ingresar y probá de nuevo." : fallback));
}

export async function uploadPhoto(productId: string, photo: PreparedPhoto): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/admin/productos/${productId}/foto`, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: photo.blob });
  } catch {
    throw new Error("No pudimos enviar la foto. Revisá tu conexión y probá de nuevo.");
  }
  await answer(res, "No pudimos guardar la foto. Probá de nuevo.");
}

export async function removePhoto(productId: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/admin/productos/${productId}/foto`, { method: "DELETE" });
  } catch {
    throw new Error("No pudimos quitar la foto. Revisá tu conexión y probá de nuevo.");
  }
  await answer(res, "No pudimos quitar la foto. Probá de nuevo.");
}
