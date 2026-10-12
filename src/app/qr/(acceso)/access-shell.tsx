import type { ReactNode } from "react";
import { PageBand } from "@/components/brand/page-band";

/** Band + narrow column shared by the member access pages. */
export function AccessShell({ eyebrow, title, description, tab, children }: { eyebrow: string; title: string; description?: ReactNode; tab: string; children: ReactNode }) {
  return (
    <main>
      <PageBand eyebrow={eyebrow} title={title} description={description} tab={tab} width="narrow" align="center" />
      <div className="page-gutter pt-8 pb-28 sm:pt-10">
        <div className="mx-auto w-full max-w-md space-y-6">{children}</div>
      </div>
    </main>
  );
}
