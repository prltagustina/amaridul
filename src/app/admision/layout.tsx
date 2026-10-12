import type { Metadata } from "next";
import { systemType } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";
import { SiteFooter } from "@/components/brand/site-footer";
import { MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  title: "Solicitud formal de admisión | Amarí Dul",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdmisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${systemType} theme-hueso flujo-sumate flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <MinimalHeader />
      <div className="relative isolate flex-1 overflow-hidden">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
