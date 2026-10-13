// Fase 1: preadmissions sent from the public Sumate form.
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { retentionColumns } from "./core";

const tz = { withTimezone: true } as const;

export const preAdmissionStatus = pgEnum("pre_admission_status", ["recibida", "en-revision", "invitada", "cerrada"]);

/**
 * Contact data is stored like `persons` (plain, needed to reply). What a person tells us about their
 * motivation and REPROCANN status is health-related, so it lives encrypted in `motivationEncrypted`
 * (AES-256-GCM, AAD bound to the row): see `src/server/pre-admissions.ts`.
 */
export const preAdmissions = pgTable(
  "pre_admissions",
  {
    id: uuid("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    status: preAdmissionStatus("status").notNull().default("recibida"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    province: text("province").notNull(),
    locality: text("locality").notNull(),
    wantsToParticipate: boolean("wants_to_participate").notNull(),
    motivationEncrypted: text("motivation_encrypted").notNull(),
    privacyAcceptedAt: timestamp("privacy_accepted_at", tz).notNull(),
    closedReason: text("closed_reason"),
    statusChangedAt: timestamp("status_changed_at", tz),
    statusChangedBy: uuid("status_changed_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    ...retentionColumns,
  },
  (t) => [index("pre_admissions_status_idx").on(t.status), index("pre_admissions_created_at_idx").on(t.createdAt)],
);

/** Internal notes written by the administration. Never health data (the UI says so). */
export const preAdmissionNotes = pgTable(
  "pre_admission_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    preAdmissionId: uuid("pre_admission_id")
      .notNull()
      .references(() => preAdmissions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("pre_admission_notes_pre_admission_idx").on(t.preAdmissionId)],
);
