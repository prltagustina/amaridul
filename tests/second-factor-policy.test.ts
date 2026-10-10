import { afterEach, describe, expect, it, vi } from "vitest";
import { isSecondFactorRequired } from "@/server/auth/session";

describe("second factor policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is optional only on the local machine", () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("VERCEL", "");
    expect(isSecondFactorRequired()).toBe(false);
  });

  it.each([
    ["production", ""],
    ["preview", ""],
    ["test", ""],
    ["local", "1"],
    ["", ""],
  ])("is required for APP_ENV=%s VERCEL=%s", (appEnv, vercel) => {
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("VERCEL", vercel);
    expect(isSecondFactorRequired()).toBe(true);
  });
});
