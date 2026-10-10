import { hash, verify } from "@node-rs/argon2";

// OWASP Password Storage Cheat Sheet: Argon2id, m=19 MiB, t=2, p=1.
// `algorithm: 2` is Algorithm.Argon2id; the package exports a const enum, unusable with isolatedModules.
const PARAMS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword({ hash: stored, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;

/** A real Argon2id hash nobody knows the password of; verified against when no account exists, to keep timing flat. */
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(crypto.randomUUID() + crypto.randomUUID());
  return dummy;
}
