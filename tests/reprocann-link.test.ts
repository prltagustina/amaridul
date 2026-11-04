// The REPROCANN «código de vinculación»: the member sends it from their space (or an admin records
// it), it is stored encrypted and never written to the audit log, the member sees it masked, and
// once the association marks the linkage verified the member can no longer change it.
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, members, reprocannCases } from "@/server/db/schema";
import { saveCase, caseInput } from "@/server/reprocann";
import { adminLinkCode, LinkCodeError, linkCodeInput, memberLinkage, pendingLinkages, setLinkCode } from "@/server/reprocann-link";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let n = 0;
async function member() {
  n += 1;
  const { userId, personId } = await ctx.createMember({ n: 700 + n, dni: `9907${String(n).padStart(4, "0")}`, password: "frase ficticia larga" });
  const [m] = await ctx.db.insert(members).values({ personId, userId, status: "activo", origin: "legacy" }).returning({ id: members.id });
  return { memberId: m.id, userId };
}

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.vinculacion@example.com")).id;
});

describe("el código de vinculación", () => {
  it("is read as REPROCANN shows it: letters and numbers, no spaces", () => {
    expect(linkCodeInput.parse("  MXndm5317 ")).toBe("MXndm5317");
    for (const bad of ["ab", "con espacios 123", "<script>", "x".repeat(41)]) expect(linkCodeInput.safeParse(bad).success).toBe(false);
  });

  it("the member sends it: stored encrypted, shown masked to them and in full to the admin, never in the audit log", async () => {
    const a = await member();
    expect(await memberLinkage(ctx.db, ctx.rings.field, a.memberId)).toEqual({ verified: false, sentOn: null, masked: null });
    await setLinkCode(ctx.db, ctx.rings.field, a.userId, a.memberId, "MXndm5317");
    const [row] = await ctx.db.select().from(reprocannCases).where(eq(reprocannCases.memberId, a.memberId));
    expect(row.linkCodeEncrypted).toBeTruthy();
    expect(row.linkCodeEncrypted).not.toContain("MXndm5317");
    expect(await memberLinkage(ctx.db, ctx.rings.field, a.memberId)).toMatchObject({ verified: false, masked: "MXn••••••" });
    expect(await adminLinkCode(ctx.db, ctx.rings.field, a.memberId)).toMatchObject({ code: "MXndm5317", byMember: true });
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.link_code_sent"));
    expect(JSON.stringify(logs.map((l) => l.metadata))).not.toContain("MXndm5317");
    expect(logs.at(-1)!.metadata).toEqual({ by: "socio", replaced: false });
    expect((await pendingLinkages(ctx.db)).map((r) => r.memberId)).toContain(a.memberId);
  });

  it("once verified the member cannot change it; the admin can, and verified linkages leave the to-do list", async () => {
    const a = await member();
    await setLinkCode(ctx.db, ctx.rings.field, a.userId, a.memberId, "AB12CD34");
    await saveCase(ctx.db, adminId, a.memberId, caseInput.parse({ permitStatus: "aprobado", managementSource: "association", responsibleName: "", linkageStatus: "verificada" }));
    expect(await memberLinkage(ctx.db, ctx.rings.field, a.memberId)).toMatchObject({ verified: true });
    await expect(setLinkCode(ctx.db, ctx.rings.field, a.userId, a.memberId, "ZZ99ZZ99")).rejects.toBeInstanceOf(LinkCodeError);
    await setLinkCode(ctx.db, ctx.rings.field, adminId, a.memberId, "ZZ99ZZ99");
    expect(await adminLinkCode(ctx.db, ctx.rings.field, a.memberId)).toMatchObject({ code: "ZZ99ZZ99", byMember: false });
    expect((await pendingLinkages(ctx.db)).map((r) => r.memberId)).not.toContain(a.memberId);
    // An admin can also remove it.
    await setLinkCode(ctx.db, ctx.rings.field, adminId, a.memberId, null);
    expect(await adminLinkCode(ctx.db, ctx.rings.field, a.memberId)).toBeNull();
  });
});
