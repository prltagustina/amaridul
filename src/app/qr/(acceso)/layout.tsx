import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { MinimalHeader } from "@/components/brand/headers";
import { LavenderSprig } from "@/components/brand/placeholders";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MinimalHeader />
      <div className="relative flex-1 overflow-hidden">
        <LavenderSprig className="pointer-events-none absolute -right-6 bottom-6 hidden h-64 w-28 text-brand opacity-60 md:block" />
        <main className="page-gutter relative pt-10 pb-24 sm:pt-16">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
      <Footer />
    </>
  );
}
