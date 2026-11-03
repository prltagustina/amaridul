import { requireAdmin } from "@/server/auth/session";
import { LOCKUP_CID } from "@/server/email/layout";
import { emailTemplates } from "@/server/email/templates";
import { FEE_PAGE } from "@/lib/fee-payment";

/** The reminder exactly as members would get it, for a fictitious member. Nothing is sent. */
export async function GET(request: Request) {
  await requireAdmin();
  const { html } = emailTemplates.fee_reminder({ name: "Nombre", url: new URL(FEE_PAGE, request.url).toString() });
  // In a browser the embedded lockup (cid:) does not resolve: the same image is served by the site.
  return new Response((html ?? "").replaceAll(`cid:${LOCKUP_CID}`, "/email/lockup-cream.png"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
