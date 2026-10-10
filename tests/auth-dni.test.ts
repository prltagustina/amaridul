import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { account, auditLogs, authLockouts, personIdentities, session, user } from "@/server/db/schema";
import { parseKeyring } from "@/server/crypto/keyring";
import { GENERIC_LOGIN_ERROR } from "@/server/auth/dni-sign-in";
import { MAX_FAILED_ATTEMPTS } from "@/server/auth/lockout";
import { b64key, cookiesFrom, makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
beforeAll(async () => {
  ctx = await makeContext();
});

describe("member login: DNI + password", () => {
  it("signs in with any DNI formatting and sets a secure session cookie", async () => {
    const m = await ctx.createMember({ n: 1, dni: "99000001", password: "contraseña-ficticia-1" });
    const res = await ctx.post("/sign-in/dni", { dni: "99.000.001", password: "contraseña-ficticia-1" });
    expect(res.status).toBe(200);
    const raw = res.headers.getSetCookie().find((c) => c.includes("session_token"))!;
    expect(raw).toMatch(/^__Secure-better-auth\.session_token=/);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/Secure/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    const s = await ctx.sessionOf(cookiesFrom(res));
    expect(s.user.id).toBe(m.userId);
    expect(s.user.role).toBe("MEMBER");
  });

  it("stores passwords as Argon2id", async () => {
    const [acc] = await ctx.db.select().from(account).limit(1);
    expect(acc.password).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("never stores the DNI in auth tables or the audit log", async () => {
    const dump = JSON.stringify([
      await ctx.db.select().from(user),
      await ctx.db.select().from(account),
      await ctx.db.select().from(session),
      await ctx.db.select().from(auditLogs),
    ]);
    expect(dump).not.toContain("99000001");
  });

  it("answers unknown DNI, wrong password and malformed DNI with the same generic error", async () => {
    const responses = [
      await ctx.post("/sign-in/dni", { dni: "99000001", password: "incorrecta" }),
      await ctx.post("/sign-in/dni", { dni: "99999999", password: "incorrecta" }),
      await ctx.post("/sign-in/dni", { dni: "abc", password: "incorrecta" }),
    ];
    for (const r of responses) {
      expect(r.status).toBe(401);
      expect((await r.json()).message).toBe(GENERIC_LOGIN_ERROR);
    }
    await ctx.db.delete(authLockouts);
  });

  it("rejects members that are not active (pending activation or disabled)", async () => {
    await ctx.createMember({ n: 2, dni: "99000002", password: "contraseña-ficticia-2", status: "pending_activation" });
    await ctx.createMember({ n: 3, dni: "99000003", password: "contraseña-ficticia-3", status: "disabled" });
    expect((await ctx.post("/sign-in/dni", { dni: "99000002", password: "contraseña-ficticia-2" })).status).toBe(401);
    expect((await ctx.post("/sign-in/dni", { dni: "99000003", password: "contraseña-ficticia-3" })).status).toBe(401);
  });

  it(`locks the account after ${MAX_FAILED_ATTEMPTS} consecutive failures, even for the right password`, async () => {
    const m = await ctx.createMember({ n: 4, dni: "99000004", password: "contraseña-ficticia-4" });
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await ctx.post("/sign-in/dni", { dni: "99000004", password: "mal" });
    const locked = await ctx.post("/sign-in/dni", { dni: "99000004", password: "contraseña-ficticia-4" });
    expect(locked.status).toBe(401);
    expect((await locked.json()).message).toBe(GENERIC_LOGIN_ERROR);

    await ctx.db.update(authLockouts).set({ lockedUntil: new Date(Date.now() - 1000) }).where(eq(authLockouts.userId, m.userId));
    const ok = await ctx.post("/sign-in/dni", { dni: "99000004", password: "contraseña-ficticia-4" });
    expect(ok.status).toBe(200);
    expect(await ctx.db.select().from(authLockouts).where(eq(authLockouts.userId, m.userId))).toHaveLength(0);
  });

  it("an admin cannot sign in through the DNI path", async () => {
    const m = await ctx.createMember({ n: 5, dni: "99000005", password: "contraseña-ficticia-5" });
    await ctx.db.update(user).set({ role: "ADMIN" }).where(eq(user.id, m.userId));
    expect((await ctx.post("/sign-in/dni", { dni: "99000005", password: "contraseña-ficticia-5" })).status).toBe(401);
  });

  it("rate-limits the DNI endpoint per IP", async () => {
    const limited = await makeContext({ rateLimit: true });
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await limited.post("/sign-in/dni", { dni: "99000099", password: "x" }, undefined, "198.51.100.7")).status);
    expect(statuses).toContain(429);
  });
});

describe("lookup key rotation", () => {
  it("logs in with a lookup made under the old key and moves it to the active one", async () => {
    const k1 = b64key();
    const field = parseKeyring(`v1:${b64key()}`, "v1");
    const old = await makeContext({ rings: { field, lookup: parseKeyring(`v1:${k1}`, "v1") } });
    const m = await old.createMember({ n: 6, dni: "99000006", password: "contraseña-ficticia-6" });

    const rotated = await makeContext({ db: old.db, rings: { field, lookup: parseKeyring(`v1:${k1},v2:${b64key()}`, "v2") } });
    const res = await rotated.post("/sign-in/dni", { dni: "99000006", password: "contraseña-ficticia-6" });
    expect(res.status).toBe(200);
    const [row] = await old.db.select().from(personIdentities).where(eq(personIdentities.personId, m.personId));
    expect(row.dniLookupKeyVersion).toBe("v2");
  });
});
