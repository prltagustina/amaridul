import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { sameOrigin } from "@/server/member-request";
import { PhotoError, photoResponse, readPhotoBody, readProductPhoto, removeProductPhoto, setProductPhoto } from "@/server/product-photos";
import { ProductNotFoundError } from "@/server/products";

// The photo of one product, for the admin: seen whatever the product's status, replaced or removed.
// The browser sends the photo already re-encoded as a JPEG; the server checks it again.

const failure = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export async function GET(request: Request, ctx: RouteContext<"/admin/productos/[id]/foto">) {
  await requireAdmin();
  const photo = await readProductPhoto(await getDb(), (await ctx.params).id, { activeOnly: false });
  return photo ? photoResponse(request, photo) : new Response(null, { status: 404 });
}

export async function PUT(request: Request, ctx: RouteContext<"/admin/productos/[id]/foto">) {
  if (!sameOrigin(request)) return new Response(null, { status: 404 });
  const { user } = await requireAdmin();
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim() !== "image/jpeg") return failure(415, "La foto tiene que llegar como JPG. Elegila de nuevo.");
  const body = await readPhotoBody(request);
  if (!body) return failure(413, "La foto pesa más de 2 MB. Elegila de nuevo para que se achique.");
  try {
    const photo = await setProductPhoto(await getDb(), user.id, (await ctx.params).id, body);
    return Response.json({ ok: true, photo });
  } catch (e) {
    if (e instanceof PhotoError) return failure(400, e.message);
    if (e instanceof ProductNotFoundError) return failure(404, "El producto ya no existe. Recargá la página.");
    console.error("Product photo save failed:", e instanceof Error ? e.message : e);
    return failure(500, "No pudimos guardar la foto. Probá de nuevo.");
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/admin/productos/[id]/foto">) {
  if (!sameOrigin(request)) return new Response(null, { status: 404 });
  const { user } = await requireAdmin();
  try {
    await removeProductPhoto(await getDb(), user.id, (await ctx.params).id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Product photo removal failed:", e instanceof Error ? e.message : e);
    return failure(500, "No pudimos quitar la foto. Probá de nuevo.");
  }
}
