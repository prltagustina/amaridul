import "server-only";
import { notFound } from "next/navigation";

/**
 * Visual demo (fase UI): fixture-driven screens, dev state switcher, /dev pages.
 * Enabled locally with an explicit local/test APP_ENV, and on Vercel only for preview deployments
 * (private review URLs). VERCEL_ENV is set by Vercel itself and is "production" on the live site,
 * so the demo can never reach production; if it is missing, the demo stays off.
 */
export function isDemoEnabled(): boolean {
  if (process.env.VERCEL) return process.env.VERCEL_ENV === "preview";
  return process.env.APP_ENV === "local" || process.env.APP_ENV === "test";
}

export function assertDemo(): void {
  if (!isDemoEnabled()) notFound();
}

/** Spread onto a layout wrapper: reveals `.dev-only` markers in the demo environment. */
export function demoAttr(): { "data-demo"?: "" } {
  return isDemoEnabled() ? { "data-demo": "" } : {};
}

export type DemoState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "expired"
  | "unauthorized"
  | "disabled";

export async function readState<T extends string = DemoState>(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  allowed: readonly T[],
  key = "estado",
): Promise<T> {
  const value = (await searchParams)[key];
  const v = Array.isArray(value) ? value[0] : value;
  return (allowed.includes(v as T) ? v : allowed[0]) as T;
}
