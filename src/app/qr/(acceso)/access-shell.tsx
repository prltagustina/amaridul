import type { ReactNode } from "react";
import { PageBand } from "@/components/brand/page-band";

/** Band + narrow column shared by the member access pages. */
export function AccessShell({ eyebrow, title, description, tab, children }: { eyebrow: string; title: string; description?: ReactNode; tab: string; children: ReactNode }) {
  return (
    <main>
      <PageBand compact eyebrow={eyebrow} title={title} description={description} tab={tab} width="narrow" />
      <div className="page-gutter pt-6 pb-8 sm:pt-8">
        <div className="mx-auto w-full max-w-md space-y-4">{children}</div>
      </div>
    </main>
  );
}
