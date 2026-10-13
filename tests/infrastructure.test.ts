import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DisallowedContentTypeError, InvalidStorageKeyError, LocalObjectStorage } from "@/server/storage/object-storage";
import { MemoryRateLimiter } from "@/server/rate-limit/limiter";
import { MemoryEmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { parseEnv } from "@/server/env";

describe("local object storage", () => {
  it("stores and reads files under its root", async () => {
    const s = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-")));
    await s.put("certificados/lote-1.pdf", new TextEncoder().encode("%PDF-ficticio"), "application/pdf");
    expect(new TextDecoder().decode((await s.get("certificados/lote-1.pdf"))!)).toBe("%PDF-ficticio");
    await s.delete("certificados/lote-1.pdf");
    expect(await s.get("certificados/lote-1.pdf")).toBeNull();
  });

  it("rejects keys that escape the root", async () => {
    const s = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-")));
    for (const key of ["../x", "a/../../x", "/etc/passwd", "A/upper", ""]) {
      await expect(s.put(key, new Uint8Array(), "application/pdf")).rejects.toThrow(InvalidStorageKeyError);
    }
  });

  it("accepts only PDFs and images", async () => {
    const s = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-")));
    await expect(s.put("x.html", new Uint8Array(), "text/html")).rejects.toThrow(DisallowedContentTypeError);
  });
});

describe("memory rate limiter", () => {
  it("allows max requests per window and resets afterwards", async () => {
    let t = 0;
    const rl = new MemoryRateLimiter(() => t);
    for (let i = 0; i < 3; i++) expect((await rl.limit("k", { max: 3, windowMs: 1000 })).ok).toBe(true);
    expect((await rl.limit("k", { max: 3, windowMs: 1000 })).ok).toBe(false);
    t = 1001;
    expect((await rl.limit("k", { max: 3, windowMs: 1000 })).ok).toBe(true);
  });
});

describe("email", () => {
  it("templates keep institutional text visibly pending", async () => {
    const sender = new MemoryEmailSender();
    const { subject, text } = emailTemplates.admission_approved({ memberNumber: "AD-0001" });
    await sender.send({ to: "x@example.com", subject, text, template: "admission_approved" });
    expect(sender.sent[0].text).toContain("PENDIENTE DE APROBACIÓN");
  });

  it("the preadmission acknowledgement greets by name and carries the reference", () => {
    const { subject, text } = emailTemplates.pre_admission_received({ reference: "PRE-2026-0001", name: "Persona Ficticia" });
    expect(subject).toContain("PRE-2026-0001");
    expect(text).toContain("Hola, Persona Ficticia");
    expect(text).toContain("no implica la admisión");
  });
});

describe("env", () => {
  const base = {
    BETTER_AUTH_SECRET: "x".repeat(32),
    FIELD_KEYS: `v1:${Buffer.alloc(32, 1).toString("base64")}`,
    FIELD_KEY_ACTIVE: "v1",
    LOOKUP_KEYS: `v1:${Buffer.alloc(32, 2).toString("base64")}`,
    LOOKUP_KEY_ACTIVE: "v1",
  };
  it("accepts a local configuration without DATABASE_URL", () => {
    expect(parseEnv(base).APP_ENV).toBe("local");
  });
  it("requires DATABASE_URL in production and a long secret", () => {
    expect(() => parseEnv({ ...base, APP_ENV: "production" })).toThrow();
    expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow();
  });
});
