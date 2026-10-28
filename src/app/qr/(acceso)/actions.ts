"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getAuth } from "@/server/auth";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { MemoryRateLimiter } from "@/server/rate-limit/limiter";
import { activateAccount, checkActivation, memberAccountByDni, resendActivation, type ActivationCheck } from "@/server/members";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";

// Private previews have no database: the member screens keep working as a demo there.
const preview = () => process.env.VERCEL_ENV === "preview";

export type LoginResult = { ok: true } | { ok: false; error: "generic" | "rate" };

/** DNI + password through the Fase 0 endpoint (lockout, constant-time, same message for every failure). */
export async function memberLogin(dni: string, password: string): Promise<LoginResult> {
  if (preview()) return { ok: true };
  try {
    const auth = await getAuth();
    await auth.api.signInDni({ body: { dni: String(dni).slice(0, 32), password: String(password).slice(0, 256) }, headers: await headers() });
    return { ok: true };
  } catch (e) {
    if (e instanceof APIError && e.statusCode === 429) return { ok: false, error: "rate" };
    if (!(e instanceof APIError)) console.error("Member login error:", e instanceof Error ? e.message : e);
    return { ok: false, error: "generic" };
  }
}

export async function memberSignOut(): Promise<void> {
  if (!preview()) {
    try {
      const auth = await getAuth();
      await auth.api.signOut({ headers: await headers() });
    } catch {}
  }
  redirect("/qr/login");
}

export async function openActivation(token: string): Promise<ActivationCheck> {
  if (preview()) return { status: "ok", firstName: "Persona", memberNumber: "AD-0004", dniMasked: "**.***.004", origin: "admission" };
  try {
    return await checkActivation(await getDb(), getKeyrings(), String(token));
  } catch (e) {
    console.error("Activation check failed:", e instanceof Error ? e.message : e);
    return { status: "invalid" };
  }
}

export async function activate(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (preview()) return { ok: true };
  try {
    const r = await activateAccount(await getDb(), String(token), String(password));
    if (r.ok) return r;
    return { ok: false, error: r.error === "weak_password" ? "Usá entre 10 y 128 caracteres." : "Este link ya no es válido. Puede que la cuenta ya esté activa: probá ingresar." };
  } catch (e) {
    console.error("Activation failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos activar la cuenta. Probá de nuevo en unos minutos." };
  }
}

// Per instance until Upstash is connected: limits how often one connection can ask for links.
const resetLimiter = new MemoryRateLimiter();

/** Always answers the same, whether the DNI exists or not, so it cannot be used to find members. */
export async function requestReset(dni: string): Promise<{ ok: true } | { ok: false; error: "rate" }> {
  if (preview()) return { ok: true };
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const key = `reset:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
  if (!(await resetLimiter.limit(key, { max: 3, windowMs: 5 * 60 * 1000 })).ok) return { ok: false, error: "rate" };
  try {
    const db = await getDb();
    const found = await memberAccountByDni(db, getKeyrings(), String(dni));
    // The answer on screen is always the same; the log says what happened, without personal data.
    if (found?.status === "active") {
      const auth = await getAuth();
      await auth.api.requestPasswordReset({ body: { email: found.email } });
      console.info("Password reset request: reset link sent");
    } else if (found?.status === "pending_activation") {
      // Never activated, so there is no password to recover: send the activation link again.
      const r = await resendActivation(db, { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL }, null, found.memberId);
      console.info(`Password reset request: account pending activation, activation ${r.emailed ? "resent" : "email failed"}`);
    } else {
      console.info(`Password reset request: ${found ? `account ${found.status}` : "no member account for that DNI"}`);
    }
  } catch (e) {
    console.error("Password reset request failed:", e instanceof Error ? e.message : e);
  }
  return { ok: true };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (preview()) return { ok: true };
  try {
    const auth = await getAuth();
    await auth.api.resetPassword({ body: { newPassword: String(password), token: String(token) } });
    return { ok: true };
  } catch (e) {
    if (!(e instanceof APIError)) console.error("Password reset failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "El link venció o ya se usó. Pedí uno nuevo." };
  }
}
