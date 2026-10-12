import type { Metadata } from "next";
import { SiteFooter } from "@/components/brand/site-footer";
import { MemberHeader } from "@/components/brand/member-header";
import { demoMember } from "@/demo/fixtures";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SocioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MemberHeader memberName={demoMember.name} />
      <div className="flex-1">{children}</div>
      <SiteFooter wide />
    </>
  );
}
