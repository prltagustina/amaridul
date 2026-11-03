import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { sameOrigin } from "@/server/member-request";
import { readLimitedBody } from "@/server/product-photos";
import { CertificateError, certificateResponse, MAX_CERTIFICATE_BYTES, readProductCertificate, removeProductCertificate, setProductCertificate } from "@/server/product-sheet";
import { ProductNotFoundError } from "@/server/products";

// The lab certificate of one product, for the admin: seen whatever the product's status, replaced or removed.

const failure = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export async function GET(_request: Request, ctx: RouteContext<"/admin/productos/[id]/certificado">) {
  await requireAdmin();
  const cert = await readProductCertificate(await getDb(), (await ctx.params).id, { activeOnly: false });
  return cert ? certificateResponse(cert) : new Response(null, { status: 404 });
}

export async function PUT(request: Request, ctx: RouteContext<"/admin/productos/[id]/certificado">) {
  if (!sameOrigin(request)) return new Response(null, { status: 404 });
  const { user } = await requireAdmin();
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim() !== "application/pdf") return failure(415, "El certificado tiene que ser un PDF.");
  const body = await readLimitedBody(request, MAX_CERTIFICATE_BYTES);
  if (!body) return failure(413, "El certificado pesa más de 8 MB.");
  try {
    await setProductCertificate(await getDb(), user.id, (await ctx.params).id, body);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof CertificateError) return failure(400, e.message);
    if (e instanceof ProductNotFoundError) return failure(404, "El producto ya no existe. Recargá la página.");
    console.error("Product certificate save failed:", e instanceof Error ? e.message : e);
    return failure(500, "No pudimos guardar el certificado. Probá de nuevo.");
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/admin/productos/[id]/certificado">) {
  if (!sameOrigin(request)) return new Response(null, { status: 404 });
  const { user } = await requireAdmin();
  try {
    await removeProductCertificate(await getDb(), user.id, (await ctx.params).id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Product certificate removal failed:", e instanceof Error ? e.message : e);
    return failure(500, "No pudimos quitar el certificado. Probá de nuevo.");
  }
}
