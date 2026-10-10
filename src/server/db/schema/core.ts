// People and identity. Structure only in Fase 0: no admission flow, no documents.
import { boolean, date, pgEnum, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

const tz = { withTimezone: true } as const;

/** Columns every record holding personal data carries, so retention can be reviewed (see docs/fase-0.md). */
export const retentionColumns = {
  closedAt: timestamp("closed_at", tz),
  retentionUntil: timestamp("retention_until", tz),
  retentionHold: boolean("retention_hold").notNull().default(false),
  retentionHoldReason: text("retention_hold_reason"),
  anonymizedAt: timestamp("anonymized_at", tz),
};

export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  province: text("province"),
  locality: text("locality"),
  isFixture: boolean("is_fixture").notNull().default(false),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  ...retentionColumns,
});

/** DNI kept apart: HMAC for lookup, AES-256-GCM for display. Filled only at formal admission (Fase 1). */
export const personIdentities = pgTable("person_identities", {
  personId: uuid("person_id")
    .primaryKey()
    .references(() => persons.id, { onDelete: "cascade" }),
  dniLookup: text("dni_lookup").notNull().unique(),
  dniLookupKeyVersion: text("dni_lookup_key_version").notNull(),
  dniEncrypted: text("dni_encrypted").notNull(),
  birthDate: date("birth_date"),
  nationality: text("nationality"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

export const identityVerificationMethod = pgEnum("identity_verification_method", [
  "in_person",
  "video_call",
  "document_upload",
  "external_provider",
  "other",
]);
export const identityVerificationStatus = pgEnum("identity_verification_status", ["pending", "verified", "failed"]);

/** Structural placeholder: the method is still to be decided (requires institutional/legal validation). */
export const identityVerifications = pgTable(
  "identity_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    method: identityVerificationMethod("method").notNull(),
    status: identityVerificationStatus("status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at", tz),
    verifiedBy: uuid("verified_by").references(() => user.id, { onDelete: "restrict" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("identity_verifications_person_id_idx").on(t.personId)],
);
