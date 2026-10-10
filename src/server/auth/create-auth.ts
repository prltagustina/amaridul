import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import type { Database } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import type { Keyring } from "@/server/crypto/keyring";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { dniSignIn } from "./dni-sign-in";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, verifyPassword } from "./password";

export const MEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_TTL_S = 30 * 60;

export type AuthDeps = {
  db: Database;
  baseURL: string;
  secret: string;
  lookupRing: Keyring;
  email: EmailSender;
  replyTo?: string;
  /** Sets cookies from Server Actions. Off in tests, where there is no Next request scope. */
  withNextCookies?: boolean;
  rateLimit?: boolean;
};

export function createAuth(deps: AuthDeps) {
  const { db } = deps;

  const roleOf = async (userId: string) =>
    (await db.select({ role: schema.user.role, status: schema.user.status }).from(schema.user).where(eq(schema.user.id, userId)))[0];

  return betterAuth({
    appName: "Amarí Dul",
    baseURL: deps.baseURL,
    secret: deps.secret,
    trustedOrigins: [deps.baseURL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
      },
    }),
    advanced: { database: { generateId: "uuid" } },
    session: {
      expiresIn: MEMBER_SESSION_MS / 1000,
      updateAge: 24 * 60 * 60,
      // Must stay off: a cookie cache delays revocation and suspension.
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "MEMBER", input: false },
        status: { type: "string", required: false, defaultValue: "pending_activation", input: false },
        personId: { type: "string", required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      password: { hash: hashPassword, verify: verifyPassword },
      resetPasswordTokenExpiresIn: PASSWORD_RESET_TTL_S,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        // Token goes in the fragment: never sent to the server, logs or Referer.
        const { subject, text } = emailTemplates.password_reset({ url: `${deps.baseURL}/qr/recuperar#t=${token}` });
        await deps.email.send({ to: user.email, subject, text, template: "password_reset", replyTo: deps.replyTo });
      },
    },
    rateLimit: {
      enabled: deps.rateLimit ?? true,
      storage: "memory",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 10 },
        "/two-factor/verify-backup-code": { window: 60, max: 10 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Every session-creating path (DNI, email, 2FA) goes through here.
          before: async (session) => {
            const u = await roleOf(session.userId);
            if (!u || u.status !== "active") return false;
            if (u.role === "ADMIN") {
              return { data: { ...session, expiresAt: new Date(Date.now() + ADMIN_SESSION_MS) } };
            }
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const created = ctx.context.newSession;
        if (!created) return;
        const u = await roleOf(created.user.id);
        if (u?.role === "ADMIN") {
          await audit(db, { actorUserId: created.user.id, action: "auth.admin_signed_in", entityType: "user", entityId: created.user.id, metadata: { via: ctx.path } });
        }
      }),
    },
    plugins: [
      twoFactor({ issuer: "Amarí Dul" }),
      dniSignIn({ db, lookupRing: deps.lookupRing }),
      ...(deps.withNextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
