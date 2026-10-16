// The member register around `members`: number history, internal notes, fee metadata and the
// historical-register import runs. Each table owns its own data; nothing is copied from persons.
import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { members } from "./admissions";

const tz = { withTimezone: true } as const;

/**
 * Every member number ever assigned. A number that was used is never given to another person:
 * the unique index covers current and replaced numbers alike.
 */
export const memberNumbers = pgTable(
  "member_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    number: text("number").notNull(),
    assignedAt: timestamp("assigned_at", tz).notNull().defaultNow(),
    replacedAt: timestamp("replaced_at", tz),
  },
  (t) => [uniqueIndex("member_numbers_number_ci_uq").on(sql`lower(${t.number})`), index("member_numbers_member_idx").on(t.memberId)],
);

/** Internal notes about a member, append-only. Admin only; never shown to the member. */
export const memberNotes = pgTable(
  "member_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    // Null for notes brought in by an import.
    authorId: uuid("author_id").references(() => user.id, { onDelete: "restrict" }),
    source: text("source").notNull().default("admin"), // "admin" | "import"
    importRunId: uuid("import_run_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("member_notes_member_idx").on(t.memberId)],
);

/**
 * Administrative fee metadata from the historical register (when the member joined the fee and
 * the usual payment method). Not payments, balances nor debts: those belong to the finance stage.
 */
export const memberFeeSettings = pgTable("member_fee_settings", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "restrict" }),
  feeEnrollmentDate: date("fee_enrollment_date"),
  paymentMethod: text("payment_method"),
  updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/** One run of the historical-register importer: what file, when, and what it did. Never the file itself. */
export const importRuns = pgTable("import_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(), // "legacy_members"
  fileName: text("file_name").notNull(),
  fileSha256: text("file_sha256").notNull(),
  rows: integer("rows").notNull(),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  summary: jsonb("summary").$type<Record<string, number>>(),
  startedAt: timestamp("started_at", tz).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", tz),
});
