import type { Metadata } from "next";
import { cormorant } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";
import Footer from "@/components/Footer";
import { MinimalHeader } from "@/components/brand/headers";

export const metadata: Metadata = {
  title: "Solicitud formal de admisión | Amarí Dul",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdmisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <MinimalHeader />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
