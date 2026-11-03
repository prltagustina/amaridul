import type { Metadata } from "next";
import { SiteFooter } from "@/components/brand/site-footer";
import { MemberHeader } from "@/components/brand/member-header";
import { demoMember } from "@/demo/fixtures";
import { currentMember } from "@/server/member-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Every member page is about the person signed in: render it on each request, never at build time
// (a page prerendered without a session would serve the same login redirect to everyone).
export const dynamic = "force-dynamic";

export default async function SocioLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  return (
    <>
      <MemberHeader memberName={member === "demo" ? demoMember.name : member.name} />
      <div className="flex-1">{children}</div>
      <SiteFooter wide compact />
    </>
  );
}
