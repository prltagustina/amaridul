// Shared bootstrap for operational scripts. Run with `tsx --conditions=react-server --env-file=…`.
import { getEnv } from "@/server/env";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";

export async function scriptContext() {
  const env = getEnv();
  return { env, db: await getDb(), rings: getKeyrings() };
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export const flag = (name: string) => process.argv.includes(`--${name}`);
