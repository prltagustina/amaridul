import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { MinimalHeader } from "@/components/brand/headers";
import { CannabisSprig, CornerLeaves } from "@/components/brand/botanicals";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccesoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MinimalHeader />
      <div className="relative isolate flex-1 overflow-hidden">
        <CannabisSprig className="pointer-events-none absolute -right-10 bottom-0 -z-10 hidden h-[26rem] w-auto text-brand/55 md:block" />
        <CornerLeaves flip className="pointer-events-none absolute -right-6 -bottom-3 -z-10 w-36 text-brand/30 md:hidden" />
        <main className="page-gutter relative pt-10 pb-36 sm:pt-14 md:pb-28">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
      <Footer />
    </>
  );
}
