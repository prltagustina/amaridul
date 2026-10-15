import type { Metadata } from "next";
import { PageBand } from "@/components/brand/page-band";
import ExistingMemberForm from "./existing-member-form";

export const metadata: Metadata = {
  title: "Actualización de legajo de socio | Amarí Dul",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SocioExistentePage() {
  return (
    <main>
      <PageBand
        compact
        tone="lilac"
        eyebrow="Ya soy socio/a"
        title="Actualización de legajo de socio"
        description="Si ya formás parte de Amarí Dul, completá tus datos para incorporarlos al sistema y activar tu acceso digital."
        tab="Actualización de legajo"
        back={{ href: "/sumate", label: "Sumate" }}
      />
      <div className="page-gutter pt-8 pb-12 sm:pt-10">
        <div className="content-column">
          <ExistingMemberForm />
        </div>
      </div>
    </main>
  );
}
