import { afterEach, describe, expect, it, vi } from "vitest";

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
