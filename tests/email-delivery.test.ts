import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailDeliveryError, ResendEmailSender } from "@/server/email/sender";

const SECRETS = {
  BETTER_AUTH_SECRET: "x".repeat(44),
  FIELD_KEYS: "v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  FIELD_KEY_ACTIVE: "v1",
  LOOKUP_KEYS: "v1:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
  LOOKUP_KEY_ACTIVE: "v1",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
};

async function senderFor(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ ...SECRETS, ...env })) vi.stubEnv(k, v);
  const { getEmailSender } = await import("@/server/email");
  return () => getEmailSender();
}

describe("email delivery in production", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to run without a provider", async () => {
    const get = await senderFor({ APP_ENV: "production", EMAIL_DELIVERY: undefined });
    expect(get).toThrow(/proveedor de email/);
  });

  it("accepts log-only delivery only with the explicit switch", async () => {
    const get = await senderFor({ APP_ENV: "production", EMAIL_DELIVERY: "log" });
    expect(get()).toBeDefined();
  });

  it("logs to the console locally", async () => {
    const get = await senderFor({ APP_ENV: "local", EMAIL_DELIVERY: undefined, DATABASE_URL: undefined });
    expect(get()).toBeDefined();
  });
});

describe("Resend", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("posts the message with the key in the Authorization header", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "x" }), { status: 200 });
    }) as unknown as typeof fetch;
    await new ResendEmailSender("re_ficticia", "Amarí Dul <notificaciones@amaridul.com>", fake).send({
      to: "persona@example.com",
      subject: "Recibimos tu solicitud PRE-2026-0001",
      text: "Hola",
      template: "pre_admission_received",
      replyTo: "contacto@example.com",
    });
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_ficticia");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      from: "Amarí Dul <notificaciones@amaridul.com>",
      to: ["persona@example.com"],
      subject: "Recibimos tu solicitud PRE-2026-0001",
      text: "Hola",
      replyTo: "contacto@example.com",
      tags: [{ name: "template", value: "pre_admission_received" }],
    });
  });

  it("throws on a rejected send without leaking the key", async () => {
    const fake = (async () => new Response('{"message":"The amaridul.com domain is not verified"}', { status: 403 })) as unknown as typeof fetch;
    const send = new ResendEmailSender("re_ficticia", "x@amaridul.com", fake).send({ to: "a@example.com", subject: "s", text: "t", template: "t" });
    await expect(send).rejects.toBeInstanceOf(EmailDeliveryError);
    await expect(send).rejects.toThrow(/403.*not verified/);
    await expect(send).rejects.not.toThrow(/re_ficticia/);
  });

  it("is used in production when the API key is configured", async () => {
    const get = await senderFor({ APP_ENV: "production", EMAIL_DELIVERY: undefined, RESEND_API_KEY: "re_ficticia" });
    expect(get()).toBeInstanceOf((await import("@/server/email/sender")).ResendEmailSender);
  });
});
