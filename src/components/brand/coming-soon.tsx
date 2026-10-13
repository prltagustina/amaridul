import type { ReactNode } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { PageBand } from "@/components/brand/page-band";
import { LinkButton } from "@/components/ui/button";
import { TabbedCard, type InfoTone } from "@/components/ui/technical";

/**
 * Public stand-in for a flow that is not live yet (member access, joining). Production shows this
 * honest notice instead of the demo, which only runs locally and on private previews.
 */
export function ComingSoon({
  eyebrow,
  title,
  tab,
  tone = "green",
  heading,
  children,
}: {
  eyebrow: string;
  title: string;
  tab: string;
  tone?: InfoTone;
  heading: string;
  children: ReactNode;
}) {
  return (
    <main>
      <PageBand compact eyebrow={eyebrow} title={title} tab={tab} tone={tone} width="narrow" />
      <div className="page-gutter pt-6 pb-8 sm:pt-8">
        <div className="mx-auto w-full max-w-md">
          <TabbedCard tab="Próximamente" tone={tone} bodyClassName="space-y-4">
            <Clock aria-hidden className="size-8 text-forest" strokeWidth={1.25} />
            <p className="font-title text-xl text-forest">{heading}</p>
            <div className="space-y-3 text-body text-text-muted">{children}</div>
            <LinkButton href="/qr" variant="secondary" full>
              <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} /> Volver
            </LinkButton>
          </TabbedCard>
        </div>
      </div>
    </main>
  );
}
