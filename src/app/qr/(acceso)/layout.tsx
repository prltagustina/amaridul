import type { Metadata } from "next";
import { SiteFooter } from "@/components/brand/site-footer";
import { MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MinimalHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter compact />
    </>
  );
}
