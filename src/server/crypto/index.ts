import "server-only";
import { getEnv } from "@/server/env";
import { parseKeyring, type Keyring } from "./keyring";

let rings: { field: Keyring; lookup: Keyring } | undefined;

export function getKeyrings() {
  if (!rings) {
    const env = getEnv();
    rings = {
      field: parseKeyring(env.FIELD_KEYS, env.FIELD_KEY_ACTIVE),
      lookup: parseKeyring(env.LOOKUP_KEYS, env.LOOKUP_KEY_ACTIVE),
    };
    for (const [version, key] of rings.field.keys) {
      if ([...rings.lookup.keys.values()].some((k) => k.equals(key))) {
        throw new Error(`FIELD_KEYS ${version} reutiliza una clave de LOOKUP_KEYS: deben ser distintas`);
      }
    }
  }
  return rings;
}
