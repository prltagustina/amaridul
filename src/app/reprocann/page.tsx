import type { Metadata } from "next";
import { MinimalHeader } from "@/components/brand/headers";
import { PageBand } from "@/components/brand/page-band";
import { SiteFooter } from "@/components/brand/site-footer";
import { ReprocannGuide } from "@/components/reprocann/reprocann-guide";
import { BRAND, SITE_URL } from "@/lib/constants";
import { officialWhatsAppLink, PUBLIC_QUESTION_MESSAGE } from "@/lib/whatsapp";

const title = "Tu código de vinculación REPROCANN";
const description = "Para iniciar o renovar tu REPROCANN con Amarí Dul: dónde encontrar tu código de vinculación, en 3 pasos y con un video de 30 segundos.";
const image = { url: "/og/codigo-de-vinculacion.jpg", width: 1200, height: 630, alt: "¿Dónde encuentro mi código de vinculación? REPROCANN en 3 pasos, con Amarí Dul" };

export const metadata: Metadata = {
  title: `${title} | ${BRAND.name}`,
  description,
  alternates: { canonical: `${SITE_URL}/reprocann` },
  openGraph: { title, description, url: `${SITE_URL}/reprocann`, siteName: BRAND.name, locale: "es_AR", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

/**
 * The page to share for the REPROCANN link code: the video and the steps (the same as Comunidad's)
 * and the way in to join, with a preview of its own when the link is sent.
 */
export default function ReprocannPublicPage() {
  const whatsapp = officialWhatsAppLink(PUBLIC_QUESTION_MESSAGE);
  return (
    <>
      <MinimalHeader />
      <main className="flex-1">
        <PageBand tone="magenta" eyebrow="REPROCANN" title="Tu código de vinculación" description="Para iniciar o renovar tu REPROCANN con la asociación." width="nav" />
        <div className="page-gutter bg-lila-50 py-12 sm:py-16">
          <div className="nav-column">
            <ReprocannGuide whatsapp={whatsapp} join bleed="-mx-6 px-6 scroll-px-6 sm:-mx-4 sm:px-4 sm:scroll-px-4" />
          </div>
        </div>
      </main>
      <SiteFooter tone="neutral" />
    </>
  );
}
