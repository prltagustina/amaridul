import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { keyFor, type Keyring } from "./keyring";

// Payload: "<version>.<nonce>.<ciphertext>.<tag>", each part base64url. AES-256-GCM, 96-bit random nonce.
// The AAD binds a ciphertext to its column and row, so it cannot be copied elsewhere.

export function encryptField(ring: Keyring, plaintext: string, aad: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(ring, ring.active), nonce);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ring.active, nonce.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

export function decryptField(ring: Keyring, payload: string, aad: string): string {
  const [version, nonce, ciphertext, tag] = payload.split(".");
  if (!version || !nonce || ciphertext === undefined || !tag) throw new Error("Valor cifrado mal formado");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(ring, version), Buffer.from(nonce, "base64url"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function payloadKeyVersion(payload: string): string {
  return payload.slice(0, payload.indexOf("."));
}

/** Returns a payload re-encrypted under the active key, or null when already current. */
export function reencryptIfStale(ring: Keyring, payload: string, aad: string): string | null {
  if (payloadKeyVersion(payload) === ring.active) return null;
  return encryptField(ring, decryptField(ring, payload, aad), aad);
}
