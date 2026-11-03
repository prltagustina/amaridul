import { isDemoEnabled } from "@/lib/demo";
import { getDb } from "@/server/db";
import { activeMemberOfRequest } from "@/server/member-request";
import { certificateResponse, readProductCertificate } from "@/server/product-sheet";

/** The lab certificate of an active product, for members with an active membership. */
export async function GET(_request: Request, ctx: RouteContext<"/qr/productos/[id]/certificado">) {
  if (!(await activeMemberOfRequest()) && !isDemoEnabled()) return new Response(null, { status: 404 });
  const cert = await readProductCertificate(await getDb(), (await ctx.params).id, { activeOnly: true });
  return cert ? certificateResponse(cert) : new Response(null, { status: 404 });
}
