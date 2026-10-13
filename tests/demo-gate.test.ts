import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoEnabled } from "@/lib/demo";

describe("demo gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["local", "", ""],
    ["test", "", ""],
    ["", "1", "preview"],
    ["production", "1", "preview"],
  ])("is on for APP_ENV=%s VERCEL=%s VERCEL_ENV=%s", (appEnv, vercel, vercelEnv) => {
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("VERCEL", vercel);
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    expect(isDemoEnabled()).toBe(true);
  });

  it.each([
    ["local", "1", "production"],
    ["test", "1", "production"],
    ["local", "1", ""],
    ["local", "1", "development"],
    ["production", "", ""],
    ["preview", "", ""],
    ["", "", ""],
  ])("is off for APP_ENV=%s VERCEL=%s VERCEL_ENV=%s", (appEnv, vercel, vercelEnv) => {
    vi.stubEnv("APP_ENV", appEnv);
    vi.stubEnv("VERCEL", vercel);
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    expect(isDemoEnabled()).toBe(false);
  });
});
