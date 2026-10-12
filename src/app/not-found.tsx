import type { Metadata } from "next";
import { cormorant } from "@/app/fonts";
import { SiteFooter } from "@/components/brand/site-footer";
import { MinimalHeader } from "@/components/brand/headers";
import { NotFoundState } from "@/components/ui/system-states";

export const metadata: Metadata = { title: "Página no encontrada | Amarí Dul", robots: { index: false } };

export default function NotFound() {
  return (
    <div className={`${cormorant.variable} flex min-h-screen flex-col bg-background text-foreground`}>
      <MinimalHeader homeHref="/" />
      <main className="flex-1 page-gutter">
        <NotFoundState />
      </main>
      <SiteFooter />
    </div>
  );
}
