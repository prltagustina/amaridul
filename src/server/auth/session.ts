import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { getAuth } from "./index";
import { checkAdminSession } from "./admin-session";

/** Secure check against the database (never only the cookie). Memoised per request. */
export const getCurrentSession = cache(async () => {
  // Read the request first: it marks the route dynamic before any database access.
  const requestHeaders = await headers();
  const auth = await getAuth();
  return auth.api.getSession({ headers: requestHeaders });
});

/**
 * Gate for every admin page and action. Non-admins get a 404 so the panel's existence
 * is not confirmed; unenrolled admins can only reach the security page.
 */
export async function requireAdmin({ allowWithoutSecondFactor = false } = {}) {
  const current = await getCurrentSession();
  if (!current) redirect("/admin/login");
  if (current.user.role !== "ADMIN") notFound();

  const state = await checkAdminSession(await getDb(), current.session);
  if (state !== "ok") redirect("/admin/login");

  if (!current.user.twoFactorEnabled && !allowWithoutSecondFactor) redirect("/admin/seguridad");
  return current;
}
