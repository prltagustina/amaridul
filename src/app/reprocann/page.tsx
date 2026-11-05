import type { Metadata } from "next";
import { MinimalHeader } from "@/components/brand/headers";
import { PageBand } from "@/components/brand/page-band";
import { SiteFooter } from "@/components/brand/site-footer";
import { ReprocannGuide } from "@/components/reprocann/reprocann-guide";
import { BRAND, SITE_URL } from "@/lib/constants";
import { officialWhatsAppLink, PUBLIC_QUESTION_MESSAGE } from "@/lib/whatsapp";

const title = "Tu REPROCANN con Amarí Dul";
const description = "Para iniciarlo o renovarlo con la asociación: tu código de vinculación, asociarte y cargarlo en tu espacio. Con un video de 30 segundos.";
// A new name with every new image: a messaging app keeps the old one under the old name.
const image = { url: "/og/reprocann.jpg", width: 1200, height: 630, alt: "Tu REPROCANN con Amarí Dul, en 3 pasos: tu código, asociarte y cargarlo" };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/reprocann` },
  openGraph: { title, description, url: `${SITE_URL}/reprocann`, siteName: BRAND.name, locale: "es_AR", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

/**
 * The page to share for starting or renewing REPROCANN with the association, also with whoever is
 * not a member yet: the video and the steps (finding the link code, joining, sending it from the
 * member's space; the same as Comunidad's), with a preview of its own when the link is sent.
 */
export default function ReprocannPublicPage() {
  const whatsapp = officialWhatsAppLink(PUBLIC_QUESTION_MESSAGE);
  return (
    <>
      <MinimalHeader />
      <main className="flex-1">
        <PageBand tone="magenta" eyebrow="REPROCANN" title={title} description="Para iniciarlo o renovarlo con la asociación." width="nav" />
        <div className="page-gutter bg-lila-50 py-12 sm:py-16">
          <div className="nav-column">
            <ReprocannGuide whatsapp={whatsapp} bleed="-mx-6 px-6 scroll-px-6 sm:-mx-4 sm:px-4 sm:scroll-px-4" />
          </div>
        </div>
      </main>
      <SiteFooter tone="neutral" />
    </>
  );
}
