// Members who joined Amarí Dul before this system: they update their legajo and get digital access,
// without a new admission or a new Comisión decision.
import { date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { persons, retentionColumns } from "./core";
import { members, preAdmissions } from "./admissions";

const tz = { withTimezone: true } as const;

export const existingMemberRequestStatus = pgEnum("existing_member_request_status", [
  "awaiting_data", // created from a preadmission; the person still has to complete the legajo
  "pending_verification",
  "needs_review",
  "matched", // linked or registered by the admin; account activation pending
  "completed", // account active: digital onboarding done
  "rejected",
]);
export const existingMemberRequestSource = pgEnum("existing_member_request_source", ["sumate", "preadmission"]);

/**
 * A request to digitalise an existing member's legajo. Submitting it grants nothing: only an admin
 * can confirm the person is a member, and only then a person, member or account is created or linked.
 * The DNI stays here as HMAC (lookup) + AES-256-GCM (bound to the row) until that confirmation.
 */
export const existingMemberRequests = pgTable(
  "existing_member_requests",
  {
    id: uuid("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    status: existingMemberRequestStatus("status").notNull().default("pending_verification"),
    source: existingMemberRequestSource("source").notNull().default("sumate"),
    preAdmissionId: uuid("pre_admission_id")
      .unique()
      .references(() => preAdmissions.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    firstNames: text("first_names"),
    lastNames: text("last_names"),
    email: text("email").notNull(),
    dniLookup: text("dni_lookup"),
    dniLookupKeyVersion: text("dni_lookup_key_version"),
    dniEncrypted: text("dni_encrypted"),
    birthDate: date("birth_date"),
    address: text("address"),
    locality: text("locality"),
    province: text("province"),
    postalCode: text("postal_code"),
    declaredMemberNumber: text("declared_member_number"),
    privacyAcceptedAt: timestamp("privacy_accepted_at", tz),
    dataConfirmedAt: timestamp("data_confirmed_at", tz),
    submittedAt: timestamp("submitted_at", tz),
    adminNotes: text("admin_notes"),
    verifiedAt: timestamp("verified_at", tz),
    verifiedBy: uuid("verified_by").references(() => user.id, { onDelete: "restrict" }),
    linkedMemberId: uuid("linked_member_id").references(() => members.id, { onDelete: "restrict" }),
    linkedPersonId: uuid("linked_person_id").references(() => persons.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    ...retentionColumns,
  },
  (t) => [index("existing_member_requests_status_idx").on(t.status), index("existing_member_requests_dni_idx").on(t.dniLookup)],
);
