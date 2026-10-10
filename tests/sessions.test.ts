import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { session, user } from "@/server/db/schema";
import { proxy } from "@/proxy";
import { cookiesFrom, makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
beforeAll(async () => {
  ctx = await makeContext();
});

const login = async (dni: string, password: string) => cookiesFrom(await ctx.post("/sign-in/dni", { dni, password }));

describe("revocation and suspension", () => {
  it("deleting a user's sessions takes effect on the very next request", async () => {
    const m = await ctx.createMember({ n: 11, dni: "99000011", password: "contraseña-ficticia-11" });
    const cookie = await login("99000011", "contraseña-ficticia-11");
    expect(await ctx.sessionOf(cookie)).not.toBeNull();
    await ctx.db.delete(session).where(eq(session.userId, m.userId));
    expect(await ctx.sessionOf(cookie)).toBeNull();
  });

  it("a disabled user cannot get a new session through any path", async () => {
    const m = await ctx.createMember({ n: 12, dni: "99000012", password: "contraseña-ficticia-12" });
    await ctx.db.update(user).set({ status: "disabled" }).where(eq(user.id, m.userId));
    expect((await ctx.post("/sign-in/dni", { dni: "99000012", password: "contraseña-ficticia-12" })).status).toBe(401);
    expect((await ctx.post("/sign-in/email", { email: m.email, password: "contraseña-ficticia-12" })).status).not.toBe(200);
  });
});

describe("password reset / recovery", () => {
  it("emails a link with the token in the fragment; token is single-use; sessions are revoked", async () => {
    const m = await ctx.createMember({ n: 13, dni: "99000013", password: "contraseña-ficticia-13" });
    const cookie = await login("99000013", "contraseña-ficticia-13");

    expect((await ctx.post("/request-password-reset", { email: m.email })).status).toBe(200);
    const mail = ctx.email.sent.find((e) => e.to === m.email && e.template === "password_reset")!;
    const url = new URL(mail.text.match(/https:\/\/\S+/)![0]);
    expect(url.pathname).toBe("/qr/recuperar");
    expect(url.search).toBe("");
    const token = new URLSearchParams(url.hash.slice(1)).get("t")!;
    expect(token).toBeTruthy();

    expect((await ctx.post("/reset-password", { token, newPassword: "contraseña-nueva-13" })).status).toBe(200);
    expect((await ctx.post("/reset-password", { token, newPassword: "otra-contraseña-13" })).status).not.toBe(200);
    expect(await ctx.sessionOf(cookie)).toBeNull();
    expect((await ctx.post("/sign-in/dni", { dni: "99000013", password: "contraseña-nueva-13" })).status).toBe(200);
  });

  it("enforces the minimum password length", async () => {
    const m = await ctx.createMember({ n: 14, dni: "99000014", password: "contraseña-ficticia-14" });
    await ctx.post("/request-password-reset", { email: m.email });
    const mail = ctx.email.sent.filter((e) => e.to === m.email).at(-1)!;
    const token = new URLSearchParams(new URL(mail.text.match(/https:\/\/\S+/)![0]).hash.slice(1)).get("t")!;
    expect((await ctx.post("/reset-password", { token, newPassword: "corta" })).status).not.toBe(200);
  });
});

describe("proxy (optimistic redirect only)", () => {
  const req = (path: string, cookie?: string) =>
    new NextRequest(new URL(path, "https://amaridul.test"), { headers: cookie ? { cookie } : {} });

  it("redirects /admin pages to login without a session cookie", () => {
    const res = proxy(req("/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://amaridul.test/admin/login");
  });

  it("lets the login page and requests with a session cookie through", () => {
    expect(proxy(req("/admin/login")).headers.get("location")).toBeNull();
    expect(proxy(req("/admin/seguridad", "__Secure-better-auth.session_token=abc")).headers.get("location")).toBeNull();
  });
});
