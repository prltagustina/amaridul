import type { Metadata } from "next";
import { cormorant } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";
import Footer from "@/components/Footer";
import { MemberAccessLink, MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  title: "Sumate a la comunidad | Amarí Dul",
  robots: { index: false, follow: false },
};

export default function SumateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <MinimalHeader right={<MemberAccessLink />} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
