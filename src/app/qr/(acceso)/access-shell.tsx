import type { ReactNode } from "react";
import { PageBand } from "@/components/brand/page-band";

/** Band + narrow column shared by the member access pages. */
export function AccessShell({
  eyebrow,
  title,
  description,
  tab,
  back,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  tab: string;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <main>
      <PageBand compact eyebrow={eyebrow} title={title} description={description} tab={tab} back={back} width="narrow" />
      <div className="page-gutter pt-6 pb-8 sm:pt-8">
        <div className="mx-auto w-full max-w-md space-y-4">{children}</div>
      </div>
    </main>
  );
}
