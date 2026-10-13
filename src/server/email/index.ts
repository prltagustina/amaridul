import "server-only";
import { getEnv } from "@/server/env";
import { ConsoleEmailSender, ResendEmailSender, type EmailSender } from "./sender";

let sender: EmailSender | undefined;

/**
 * Resend when its API key is configured. Without it: console locally, and production must fail
 * rather than drop emails silently, unless EMAIL_DELIVERY=log explicitly accepts log-only delivery.
 */
export function getEmailSender(): EmailSender {
  if (!sender) {
    const env = getEnv();
    if (env.RESEND_API_KEY) sender = new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM, env.EMAIL_REPLY_TO);
    else if (env.APP_ENV === "production" && env.EMAIL_DELIVERY !== "log") throw new Error("No hay proveedor de email configurado para producción");
    else sender = new ConsoleEmailSender(env.EMAIL_FROM);
  }
  return sender;
}
