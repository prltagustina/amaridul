import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { account, session, twoFactor, user } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { hashPassword, MIN_PASSWORD_LENGTH } from "./password";

export type AppEnv = "local" | "test" | "preview" | "production";

/** Outside production only reserved test addresses are allowed, so real emails never land in dev data. */
export function assertAdminEmailAllowed(email: string, appEnv: AppEnv): void {
  const isExample = /@example\.(com|org|net)$/i.test(email);
  if (appEnv !== "production" && !isExample) {
    throw new Error("Fuera de producción solo se permiten emails @example.com para el admin");
  }
  if (appEnv === "production" && isExample) {
    throw new Error("En producción no se permiten emails de prueba");
  }
}

/** Creates an active ADMIN with a credential account. TOTP is enrolled by the admin at first login. */
export async function createAdminAccount(
  db: Database,
  opts: { email: string; name: string; password: string; appEnv: AppEnv },
): Promise<string> {
  assertAdminEmailAllowed(opts.email, opts.appEnv);
  if (opts.password.length < MIN_PASSWORD_LENGTH) throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  const passwordHash = await hashPassword(opts.password);
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(user)
      .values({ name: opts.name, email: opts.email.toLowerCase(), role: "ADMIN", status: "active", emailVerified: true })
      .returning({ id: user.id });
    await tx.insert(account).values({ userId: u.id, accountId: u.id, providerId: "credential", password: passwordHash });
    await audit(tx as unknown as Database, { action: "admin.created", entityType: "user", entityId: u.id });
    return u.id;
  });
}

/**
 * Emergency access: removes the admin's second factor and every session, forcing TOTP re-enrolment.
 * The password is untouched. Runnable only by someone with database access; always audited.
 */
export async function breakGlassResetSecondFactor(db: Database, email: string): Promise<string> {
  const [u] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.email, email.toLowerCase()));
  if (!u || u.role !== "ADMIN") throw new Error("No existe un admin con ese email");
  await db.transaction(async (tx) => {
    await tx.delete(twoFactor).where(eq(twoFactor.userId, u.id));
    await tx.update(user).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(user.id, u.id));
    await tx.delete(session).where(eq(session.userId, u.id));
    await audit(tx as unknown as Database, { action: "admin.break_glass_second_factor_reset", entityType: "user", entityId: u.id });
  });
  return u.id;
}
