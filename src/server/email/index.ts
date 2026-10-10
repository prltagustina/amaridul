import "server-only";
import { getEnv } from "@/server/env";
import { ConsoleEmailSender, type EmailSender } from "./sender";

let sender: EmailSender | undefined;

/** Console in every environment until a provider is approved; production must fail rather than drop emails silently. */
export function getEmailSender(): EmailSender {
  if (!sender) {
    const env = getEnv();
    if (env.APP_ENV === "production") throw new Error("No hay proveedor de email configurado para producción");
    sender = new ConsoleEmailSender(env.EMAIL_FROM);
  }
  return sender;
}
