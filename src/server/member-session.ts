import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { memberOfUser } from "@/server/members";
import { isDemoEnabled } from "@/lib/demo";

export type PortalMember = NonNullable<Awaited<ReturnType<typeof memberOfUser>>>;

/**
 * The signed-in member for the portal pages. Without a member session the visitor is sent to the
 * login; locally and on previews the fictitious demo member is shown instead, to review the screens.
 */
export const currentMember = cache(async (): Promise<PortalMember | "demo"> => {
  try {
    const current = await getCurrentSession();
    if (current?.user && (current.user as { role?: string }).role === "MEMBER") {
      const m = await memberOfUser(await getDb(), current.user.id);
      if (m && m.status === "activo") return m;
    }
  } catch (e) {
    // No database on previews: fall through to the demo.
    if (!isDemoEnabled()) console.error("Member session error:", e instanceof Error ? e.message : e);
  }
  if (isDemoEnabled()) return "demo";
  redirect("/qr/login");
});
