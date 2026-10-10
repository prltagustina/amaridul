import { describe, expect, it } from "vitest";
import { parseKeyring } from "@/server/crypto/keyring";
import { dniLookup, dniLookupCandidates, InvalidDniError, maskDni, normalizeDni } from "@/server/crypto/dni";
import { decryptField, encryptField, payloadKeyVersion, reencryptIfStale } from "@/server/crypto/field-encryption";
import { generateToken, hashToken } from "@/server/crypto/tokens";
import { b64key } from "./helpers/context";

describe("keyring", () => {
  it("rejects keys that are not 32 bytes, duplicates and a missing active version", () => {
    expect(() => parseKeyring(`v1:${Buffer.alloc(16).toString("base64")}`, "v1")).toThrow(/32 bytes/);
    const k = b64key();
    expect(() => parseKeyring(`v1:${k},v1:${k}`, "v1")).toThrow(/duplicada/);
    expect(() => parseKeyring(`v1:${b64key()}`, "v2")).toThrow(/activa/);
  });
});

describe("DNI", () => {
  it("normalizes dots, spaces and dashes and validates 7–8 digits", () => {
    expect(normalizeDni("99.000.001")).toBe("99000001");
    expect(normalizeDni(" 99-000 001 ")).toBe("99000001");
    expect(normalizeDni("9900001")).toBe("9900001");
    expect(() => normalizeDni("123456")).toThrow(InvalidDniError);
    expect(() => normalizeDni("123456789")).toThrow(InvalidDniError);
    expect(() => normalizeDni("abc")).toThrow(InvalidDniError);
  });

  it("lookup is deterministic per key, differs across keys and never contains the DNI", () => {
    const a = parseKeyring(`v1:${b64key()}`, "v1");
    const b = parseKeyring(`v1:${b64key()}`, "v1");
    expect(dniLookup(a, "99.000.001")).toEqual(dniLookup(a, "99000001"));
    expect(dniLookup(a, "99000001").value).not.toBe(dniLookup(b, "99000001").value);
    expect(dniLookup(a, "99000001").value).not.toContain("99000001");
  });

  it("candidates put the active key first, for rotation", () => {
    const ring = parseKeyring(`v1:${b64key()},v2:${b64key()}`, "v2");
    const c = dniLookupCandidates(ring, "99000001");
    expect(c.map((x) => x.version)).toEqual(["v2", "v1"]);
  });

  it("masks for listings", () => {
    expect(maskDni("99000123")).toBe("**.***.123");
  });
});

describe("field encryption (AES-256-GCM)", () => {
  const ring = parseKeyring(`v1:${b64key()}`, "v1");

  it("round-trips and uses a fresh nonce each time", () => {
    const p1 = encryptField(ring, "99000001", "aad");
    const p2 = encryptField(ring, "99000001", "aad");
    expect(p1).not.toBe(p2);
    expect(decryptField(ring, p1, "aad")).toBe("99000001");
    expect(payloadKeyVersion(p1)).toBe("v1");
  });

  it("fails with a different AAD (value copied to another row)", () => {
    const p = encryptField(ring, "99000001", "person_identities.dni:A");
    expect(() => decryptField(ring, p, "person_identities.dni:B")).toThrow();
  });

  it("fails when the ciphertext or tag is tampered with", () => {
    const [v, n, c, t] = encryptField(ring, "99000001", "aad").split(".");
    const flip = (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1);
    expect(() => decryptField(ring, [v, n, flip(c), t].join("."), "aad")).toThrow();
    expect(() => decryptField(ring, [v, n, c, flip(t)].join("."), "aad")).toThrow();
  });

  it("rotation re-encrypts stale payloads under the active key", () => {
    const k1 = b64key();
    const old = parseKeyring(`v1:${k1}`, "v1");
    const rotated = parseKeyring(`v1:${k1},v2:${b64key()}`, "v2");
    const p = encryptField(old, "99000001", "aad");
    const fresh = reencryptIfStale(rotated, p, "aad")!;
    expect(payloadKeyVersion(fresh)).toBe("v2");
    expect(decryptField(rotated, fresh, "aad")).toBe("99000001");
    expect(reencryptIfStale(rotated, fresh, "aad")).toBeNull();
  });
});

describe("tokens", () => {
  it("are 256-bit and only their SHA-256 is comparable", () => {
    const t = generateToken();
    expect(Buffer.from(t, "base64url")).toHaveLength(32);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });
});
