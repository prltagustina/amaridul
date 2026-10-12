import type { Metadata } from "next";
import { cormorant } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";
import Footer from "@/components/Footer";
import { CannabisSprig, CornerLeaves } from "@/components/brand/botanicals";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  title: "Sumate a la comunidad | Amarí Dul",
  robots: { index: false, follow: false },
};

export default function SumateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <MinimalHeader right={<MemberAccessLink />} />
      <div className="relative isolate flex-1 overflow-hidden">
        <CannabisSprig className="pointer-events-none absolute -right-12 bottom-0 -z-10 hidden h-[28rem] w-auto text-brand/40 lg:block" />
        <CornerLeaves className="pointer-events-none absolute -bottom-3 -left-10 -z-10 hidden w-64 text-brand/30 lg:block" />
        {children}
      </div>
      <Footer />
    </div>
  );
}
