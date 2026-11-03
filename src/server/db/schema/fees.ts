// The membership fee reminder: one general email per period to the active members, with the
// association's payment data. Not payments, balances nor debts: the system does not record payments.
import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { members } from "./admissions";

const tz = { withTimezone: true } as const;

export const feeReminderFrequency = pgEnum("fee_reminder_frequency", ["mensual", "trimestral"]);
export const feeReminderStatus = pgEnum("fee_reminder_status", ["pendiente", "enviando", "enviado", "fallido", "omitido"]);

/** The reminder's only configuration row. Off until the association decides and the deployment allows it. */
export const feeReminderSettings = pgTable(
  "fee_reminder_settings",
  {
    id: text("id").primaryKey().default("default"),
    enabled: boolean("enabled").notNull().default(false),
    frequency: feeReminderFrequency("frequency").notNull().default("trimestral"),
    /** Day of the month (of the quarter's first month, when quarterly) from which it goes out. */
    dayOfMonth: integer("day_of_month").notNull().default(10),
    /** Hour, in Argentina's time, from which it goes out that day. */
    hour: integer("hour").notNull().default(10),
    updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [check("fee_reminder_settings_ranges", sql`${t.id} = 'default' and ${t.dayOfMonth} between 1 and 28 and ${t.hour} between 0 and 23`)],
);

/**
 * One row per member and period: who it went to, for which period and with what result. The row is
 * written before the email goes out, so a retry or two runs at once never send it twice.
 */
export const feeReminderSends = pgTable(
  "fee_reminder_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "2026-11" (monthly) or "2026-T4" (quarterly). */
    period: text("period").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    /** Where it went, masked (pe***@example.com): enough to answer whether it reached someone. */
    emailMasked: text("email_masked"),
    status: feeReminderStatus("status").notNull().default("pendiente"),
    /** Why it was skipped or failed, without personal data. */
    detail: text("detail"),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: timestamp("claimed_at", tz),
    sentAt: timestamp("sent_at", tz),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fee_reminder_sends_period_member").on(t.period, t.memberId), index("fee_reminder_sends_period_status_idx").on(t.period, t.status)],
);
