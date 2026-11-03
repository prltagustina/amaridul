import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/server/db";
import { getEmailSender } from "@/server/email";
import { getEnv } from "@/server/env";
import { runFeeReminders } from "@/server/fee-reminders";

/**
 * The fee reminder's scheduled run. Nothing schedules it yet: that takes a cron entry in
 * vercel.json and CRON_SECRET (Vercel sends it as a bearer token), on top of FEE_REMINDERS=on and
 * turning it on in the admin. Without the secret, it does not exist.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (secret.length < 16 || given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 404 });
  const result = await runFeeReminders(await getDb(), { email: getEmailSender(), baseURL: getEnv().BETTER_AUTH_URL });
  return Response.json(result);
}
