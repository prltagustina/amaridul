import type { Metadata } from "next";
import { systemType } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";
import { SiteFooter } from "@/components/brand/site-footer";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  title: "Sumate a la comunidad | Amarí Dul",
  robots: { index: false, follow: false },
};

export default function SumateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${systemType} theme-hueso flujo-sumate flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <MinimalHeader right={<MemberAccessLink />} />
      <div className="relative isolate flex-1 overflow-hidden">
        {children}
      </div>
      <SiteFooter compact />
    </div>
  );
}
