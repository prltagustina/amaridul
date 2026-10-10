"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import QRCode from "qrcode";
import { getAuth } from "@/server/auth";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { audit } from "@/server/audit/log";

const GENERIC = "Los datos ingresados no son correctos.";
const TOO_MANY = "Demasiados intentos. Esperá unos minutos y volvé a probar.";

function errorMessage(e: unknown): string {
  if (e instanceof APIError && e.statusCode === 429) return TOO_MANY;
  return GENERIC;
}

export type LoginState = { step: "password" | "second-factor"; error?: string; email?: string };

export async function loginWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { step: "password", error: GENERIC, email };
  let result: { twoFactorRedirect?: boolean } | null;
  try {
    const auth = await getAuth();
    result = (await auth.api.signInEmail({ body: { email, password }, headers: await headers() })) as { twoFactorRedirect?: boolean };
  } catch (e) {
    return { step: "password", error: errorMessage(e), email };
  }
  if (result?.twoFactorRedirect) return { step: "second-factor" };
  redirect("/admin");
}

export async function verifySecondFactor(_: LoginState, form: FormData): Promise<LoginState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const method = form.get("method") === "backup" ? "backup" : "totp";
  try {
    const auth = await getAuth();
    if (method === "backup") await auth.api.verifyBackupCode({ body: { code }, headers: await headers() });
    else await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (e) {
    return { step: "second-factor", error: errorMessage(e) };
  }
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const current = await requireAdmin({ allowWithoutSecondFactor: true });
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
  await audit(await getDb(), { actorUserId: current.user.id, action: "auth.admin_signed_out", entityType: "user", entityId: current.user.id });
  redirect("/admin/login");
}

export type EnrollState = {
  error?: string;
  qrDataUrl?: string;
  manualKey?: string;
  backupCodes?: string[];
};

export async function startEnrollment(_: EnrollState, form: FormData): Promise<EnrollState> {
  await requireAdmin({ allowWithoutSecondFactor: true });
  const password = String(form.get("password") ?? "");
  try {
    const auth = await getAuth();
    const result = await auth.api.enableTwoFactor({ body: { password }, headers: await headers() });
    if (result.method !== "totp") return { error: GENERIC };
    // Shown only on this screen; the secret is never emailed or logged.
    return {
      qrDataUrl: await QRCode.toDataURL(result.totpURI, { margin: 1, width: 220 }),
      manualKey: new URL(result.totpURI).searchParams.get("secret") ?? undefined,
      backupCodes: result.backupCodes,
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function confirmEnrollment(prev: EnrollState, form: FormData): Promise<EnrollState> {
  const current = await requireAdmin({ allowWithoutSecondFactor: true });
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  try {
    const auth = await getAuth();
    await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (e) {
    return { ...prev, error: errorMessage(e) };
  }
  await audit(await getDb(), { actorUserId: current.user.id, action: "admin.second_factor_enabled", entityType: "user", entityId: current.user.id });
  redirect("/admin");
}

export type BackupCodesState = { error?: string; backupCodes?: string[] };

export async function regenerateBackupCodes(_: BackupCodesState, form: FormData): Promise<BackupCodesState> {
  const current = await requireAdmin();
  const password = String(form.get("password") ?? "");
  try {
    const auth = await getAuth();
    const { backupCodes } = await auth.api.generateBackupCodes({ body: { password }, headers: await headers() });
    await audit(await getDb(), { actorUserId: current.user.id, action: "admin.backup_codes_regenerated", entityType: "user", entityId: current.user.id });
    return { backupCodes };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
