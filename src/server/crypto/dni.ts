import { createHmac } from "node:crypto";
import { keyFor, type Keyring } from "./keyring";

export class InvalidDniError extends Error {
  constructor() {
    super("DNI inválido");
  }
}

/** Keeps digits only; Argentine DNIs have 7 or 8 digits. */
export function normalizeDni(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 7 || digits.length > 8) throw new InvalidDniError();
  return digits;
}

export type DniLookup = { version: string; value: string };

function hmac(ring: Keyring, version: string, dni: string): string {
  return createHmac("sha256", keyFor(ring, version)).update(`dni:${version}:${dni}`).digest("base64url");
}

/** Deterministic lookup value under the active key, used when storing. */
export function dniLookup(ring: Keyring, rawDni: string): DniLookup {
  return { version: ring.active, value: hmac(ring, ring.active, normalizeDni(rawDni)) };
}

/**
 * Candidate lookups under every key, active first. During a key rotation, login tries
 * these in order and the caller rewrites stale rows to the active version.
 */
export function dniLookupCandidates(ring: Keyring, rawDni: string): DniLookup[] {
  const dni = normalizeDni(rawDni);
  const versions = [ring.active, ...[...ring.keys.keys()].filter((v) => v !== ring.active)];
  return versions.map((version) => ({ version, value: hmac(ring, version, dni) }));
}

/** Masked form for listings, e.g. "**.***.123". */
export function maskDni(dni: string): string {
  return `**.***.${dni.slice(-3)}`;
}
