// How often each member pays the fee: monthly, quarterly or every six months. The member chooses it
// in the portal; an admin can set it for members who do not use the portal. It decides how often
// the fee reminder reaches them. It is not a payment and does not say whether someone is up to date.
import { eq } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { memberFeeSettings, members, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";

export const FEE_PLAN_VALUES = ["mensual", "trimestral", "semestral"] as const;
export type FeePlan = (typeof FEE_PLAN_VALUES)[number];
export const feePlanInput = z.enum(FEE_PLAN_VALUES, { error: "Elegí cómo vas a pagar." });

export class FeePlanError extends Error {}

export type MemberFeePlan = { plan: FeePlan | null; chosenAt: Date | null; byMember: boolean };

export async function memberFeePlan(db: Database, memberId: string): Promise<MemberFeePlan> {
  const [row] = await db
    .select({ plan: memberFeeSettings.plan, chosenAt: memberFeeSettings.planChosenAt, role: user.role })
    .from(memberFeeSettings)
    .leftJoin(user, eq(user.id, memberFeeSettings.planChosenBy))
    .where(eq(memberFeeSettings.memberId, memberId));
  return { plan: row?.plan ?? null, chosenAt: row?.chosenAt ?? null, byMember: row?.role === "MEMBER" };
}

/** Sets (or, with null, clears) the member's plan. Recorded in the audit log, with who did it. */
export async function setFeePlan(db: Database, actorUserId: string, memberId: string, plan: FeePlan | null, now = new Date()): Promise<void> {
  const [m] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId));
  if (!m) throw new FeePlanError("El socio no existe.");
  await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [before] = await t.select({ plan: memberFeeSettings.plan }).from(memberFeeSettings).where(eq(memberFeeSettings.memberId, memberId));
    if ((before?.plan ?? null) === plan) return;
    const set = { plan, planChosenBy: actorUserId, planChosenAt: now, updatedBy: actorUserId, updatedAt: now };
    await t
      .insert(memberFeeSettings)
      .values({ memberId, ...set })
      .onConflictDoUpdate({ target: memberFeeSettings.memberId, set });
    const [actor] = await t.select({ role: user.role }).from(user).where(eq(user.id, actorUserId));
    await audit(t, {
      actorUserId,
      action: "member.fee_plan_set",
      entityType: "member",
      entityId: memberId,
      metadata: { plan_before: before?.plan ?? null, plan_after: plan, by: actor?.role === "MEMBER" ? "socio" : "administración" },
    });
  });
}
