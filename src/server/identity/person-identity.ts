import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { personIdentities } from "@/server/db/schema";
import { dniLookup, normalizeDni } from "@/server/crypto/dni";
import { decryptField, encryptField } from "@/server/crypto/field-encryption";
import type { Keyring } from "@/server/crypto/keyring";

export type Keyrings = { field: Keyring; lookup: Keyring };

const dniAad = (personId: string) => `person_identities.dni:${personId}`;

/** Stores the DNI as HMAC (lookup) + AES-256-GCM (display), bound to the person. */
export async function setPersonDni(db: Database, rings: Keyrings, personId: string, rawDni: string): Promise<void> {
  const dni = normalizeDni(rawDni);
  const lookup = dniLookup(rings.lookup, dni);
  const values = {
    dniLookup: lookup.value,
    dniLookupKeyVersion: lookup.version,
    dniEncrypted: encryptField(rings.field, dni, dniAad(personId)),
    updatedAt: new Date(),
  };
  await db
    .insert(personIdentities)
    .values({ personId, ...values })
    .onConflictDoUpdate({ target: personIdentities.personId, set: values });
}

/** Decrypts the DNI. Callers must be authorised and should audit the reveal. */
export async function readPersonDni(db: Database, rings: Keyrings, personId: string): Promise<string | null> {
  const [row] = await db.select({ enc: personIdentities.dniEncrypted }).from(personIdentities).where(eq(personIdentities.personId, personId));
  return row ? decryptField(rings.field, row.enc, dniAad(personId)) : null;
}
