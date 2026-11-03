import { isDemoEnabled } from "@/lib/demo";
import { getDb } from "@/server/db";
import { activeMemberOfRequest } from "@/server/member-request";
import { photoResponse, readProductPhoto } from "@/server/product-photos";

/**
 * The photo of an active product, for members with an active membership (and, locally or on a
 * protected preview, for the screens' review). An inactive product has no photo to show.
 */
export async function GET(request: Request, ctx: RouteContext<"/qr/productos/[id]/foto">) {
  if (!(await activeMemberOfRequest()) && !isDemoEnabled()) return new Response(null, { status: 404 });
  const photo = await readProductPhoto(await getDb(), (await ctx.params).id, { activeOnly: true });
  return photo ? photoResponse(request, photo) : new Response(null, { status: 404 });
}
