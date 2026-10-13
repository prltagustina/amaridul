import { afterEach, describe, expect, it, vi } from "vitest";
import { isSecondFactorRequired } from "@/server/auth/session";

describe("second factor policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is optional on the local machine", () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("ADMIN_SECOND_FACTOR", "");
    expect(isSecondFactorRequired()).toBe(false);
  });

  it("is optional on a deployment only with the explicit demo switch", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_SECOND_FACTOR", "optional");
    expect(isSecondFactorRequired()).toBe(false);
  });

  it.each([
    ["production", "", ""],
    ["production", "1", ""],
    ["production", "1", "required"],
    ["production", "1", "OPTIONAL"],
    ["preview", "", ""],
    ["test", "", ""],
    ["local", "1", ""],
    ["", "", ""],
  ])("is required for APP_ENV=%s VERCEL=%s ADMIN_SECOND_FACTOR=%s", (appEnv, vercel, switchValue) => {
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("VERCEL", vercel);
    vi.stubEnv("ADMIN_SECOND_FACTOR", switchValue);
    expect(isSecondFactorRequired()).toBe(true);
  });
});
