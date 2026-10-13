import "server-only";
import { getEnv } from "@/server/env";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getEmailSender } from "@/server/email";
import { createAuth, type Auth } from "./create-auth";

const g = globalThis as unknown as { __amaridulAuth?: Promise<Auth> };

/** Lazy so the public static build never needs database access or secrets. */
export function getAuth(): Promise<Auth> {
  g.__amaridulAuth ??= (async () => {
    const env = getEnv();
    return createAuth({
      db: await getDb(),
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      lookupRing: getKeyrings().lookup,
      email: getEmailSender(),
      replyTo: env.EMAIL_REPLY_TO,
    });
  })().catch((e) => {
    // Do not keep a failed start-up for the life of the instance: retry on the next request.
    g.__amaridulAuth = undefined;
    throw e;
  });
  return g.__amaridulAuth;
}
