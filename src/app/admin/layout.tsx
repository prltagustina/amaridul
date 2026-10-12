import type { Metadata } from "next";
import { cormorant } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Administración | Amarí Dul",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${cormorant.variable} theme-hueso flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      {children}
    </div>
  );
}
