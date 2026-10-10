import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { auditLogs, session, sessionActivity, twoFactor, user } from "@/server/db/schema";
import { assertAdminEmailAllowed, breakGlassResetSecondFactor } from "@/server/auth/admin-accounts";
import { checkAdminSession } from "@/server/auth/admin-session";
import { ADMIN_IDLE_MS, ADMIN_SESSION_MS } from "@/server/auth/create-auth";
import { cookiesFrom, makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let admin: Awaited<ReturnType<typeof ctx.createAdmin>>;
let rawSecret = "";
let backupCodes: string[] = [];

const totp = () => createOTP(rawSecret).totp();
const signIn = () => ctx.post("/sign-in/email", { email: admin.email, password: admin.password });

beforeAll(async () => {
  ctx = await makeContext();
  admin = await ctx.createAdmin();
});

describe("admin account rules", () => {
  it("only @example.com outside production, never @example.com in production", () => {
    expect(() => assertAdminEmailAllowed("real.person@gmail.com", "local")).toThrow();
    expect(() => assertAdminEmailAllowed("admin.local@example.com", "local")).not.toThrow();
    expect(() => assertAdminEmailAllowed("admin.local@example.com", "production")).toThrow();
  });
});

describe("admin: email + password + TOTP", () => {
  it("before enrolment, password grants an admin session created with an 8 h expiry (enrolment-only in the UI)", async () => {
    const res = await signIn();
    expect(res.status).toBe(200);
    // Read the row before any get-session: Better Auth's global sliding refresh (updateAge) later
    // extends it, which is why requireAdmin() enforces the 8 h cap from createdAt (tested below).
    const [row] = await ctx.db.select().from(session).where(eq(session.userId, admin.id));
    const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
    expect(ttl).toBeLessThanOrEqual(ADMIN_SESSION_MS + 1000);
    expect(ttl).toBeGreaterThan(ADMIN_SESSION_MS - 60_000);
    const s = await ctx.sessionOf(cookiesFrom(res));
    expect(s.user.role).toBe("ADMIN");
  });

  it("enrols TOTP; secret and backup codes are stored encrypted", async () => {
    const cookie = cookiesFrom(await signIn());
    const enable = await ctx.post("/two-factor/enable", { password: admin.password }, cookie);
    expect(enable.status).toBe(200);
    const body = await enable.json();
    backupCodes = body.backupCodes;
    rawSecret = new TextDecoder().decode(base32.decode(new URL(body.totpURI).searchParams.get("secret")!));
    expect((await ctx.post("/two-factor/verify-totp", { code: await totp() }, cookie)).status).toBe(200);

    const [stored] = await ctx.db.select().from(twoFactor).where(eq(twoFactor.userId, admin.id));
    expect(stored.secret).not.toContain(rawSecret);
    expect(stored.backupCodes).not.toContain(backupCodes[0]);
    const [u] = await ctx.db.select().from(user).where(eq(user.id, admin.id));
    expect(u.twoFactorEnabled).toBe(true);
  });

  it("after enrolment, the password alone gives no session", async () => {
    const res = await signIn();
    expect((await res.clone().json()).twoFactorRedirect).toBe(true);
    expect(await ctx.sessionOf(cookiesFrom(res))).toBeNull();
  });

  it("a TOTP code completes the login and the sign-in is audited", async () => {
    const pending = cookiesFrom(await signIn());
    const res = await ctx.post("/two-factor/verify-totp", { code: await totp() }, pending);
    expect(res.status).toBe(200);
    expect((await ctx.sessionOf(cookiesFrom(res))).user.id).toBe(admin.id);
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "auth.admin_signed_in"));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((l) => l.actorUserId === admin.id)).toBe(true);
  });

  it("a wrong TOTP code is rejected", async () => {
    const pending = cookiesFrom(await signIn());
    expect((await ctx.post("/two-factor/verify-totp", { code: "000000" }, pending)).status).not.toBe(200);
  });

  it("a backup code works exactly once", async () => {
    const first = await ctx.post("/two-factor/verify-backup-code", { code: backupCodes[0] }, cookiesFrom(await signIn()));
    expect(first.status).toBe(200);
    const again = await ctx.post("/two-factor/verify-backup-code", { code: backupCodes[0] }, cookiesFrom(await signIn()));
    expect(again.status).not.toBe(200);
  });
});

describe("admin session limits (8 h absolute, 30 min idle)", () => {
  async function freshSession() {
    const res = await ctx.post("/two-factor/verify-totp", { code: await totp() }, cookiesFrom(await signIn()));
    const s = await ctx.sessionOf(cookiesFrom(res));
    return { id: s.session.id as string, createdAt: new Date(s.session.createdAt) };
  }

  it("ok while active, records activity", async () => {
    const s = await freshSession();
    expect(await checkAdminSession(ctx.db, s)).toBe("ok");
    expect(await ctx.db.select().from(sessionActivity).where(eq(sessionActivity.sessionId, s.id))).toHaveLength(1);
  });

  it("expires 8 h after creation even with activity", async () => {
    const s = await freshSession();
    expect(await checkAdminSession(ctx.db, s, new Date(s.createdAt.getTime() + ADMIN_SESSION_MS + 1))).toBe("expired");
    expect(await ctx.db.select().from(session).where(eq(session.id, s.id))).toHaveLength(0);
  });

  it("expires after 30 min without activity", async () => {
    const s = await freshSession();
    const t0 = new Date();
    expect(await checkAdminSession(ctx.db, s, t0)).toBe("ok");
    expect(await checkAdminSession(ctx.db, s, new Date(t0.getTime() + ADMIN_IDLE_MS + 1))).toBe("idle");
    expect(await ctx.db.select().from(session).where(eq(session.id, s.id))).toHaveLength(0);
  });
});

describe("emergency access (break-glass)", () => {
  it("removes the second factor and all sessions, keeps the password, and is audited", async () => {
    const live = cookiesFrom(await ctx.post("/two-factor/verify-totp", { code: await totp() }, cookiesFrom(await signIn())));
    expect(await ctx.sessionOf(live)).not.toBeNull();

    await breakGlassResetSecondFactor(ctx.db, admin.email);

    expect(await ctx.sessionOf(live)).toBeNull();
    expect(await ctx.db.select().from(twoFactor).where(eq(twoFactor.userId, admin.id))).toHaveLength(0);
    const relogin = await signIn();
    expect(relogin.status).toBe(200);
    expect((await relogin.clone().json()).twoFactorRedirect).toBeUndefined();
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "admin.break_glass_second_factor_reset"));
    expect(logs).toHaveLength(1);
  });

  it("refuses non-admin accounts", async () => {
    const m = await ctx.createMember({ n: 90, dni: "99000090", password: "contraseña-ficticia-90" });
    await expect(breakGlassResetSecondFactor(ctx.db, m.email)).rejects.toThrow();
  });
});
