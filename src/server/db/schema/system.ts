import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user, session } from "./auth";

const tz = { withTimezone: true } as const;

/** Append-only. Never stores passwords, tokens, secrets, DNI or medical data. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    at: timestamp("at", tz).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId), index("audit_logs_at_idx").on(t.at)],
);

/** Per-kind, per-year sequences for visible references such as PRE-2026-0001. */
export const referenceCounters = pgTable(
  "reference_counters",
  {
    kind: text("kind").notNull(),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.year] })],
);

/** Versioned legal and institutional texts; acceptances point to an exact version. */
export const legalTexts = pgTable(
  "legal_texts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    bodySha256: text("body_sha256").notNull(),
    effectiveFrom: timestamp("effective_from", tz),
    approvedAt: timestamp("approved_at", tz),
    approvedBy: uuid("approved_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [unique("legal_texts_kind_version_uq").on(t.kind, t.version)],
);

/** Per-account lockout for the member DNI login (Better Auth only rate-limits by IP). */
export const authLockouts = pgTable("auth_lockouts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", tz),
  lastFailedAt: timestamp("last_failed_at", tz),
});

/** Last activity per session, to enforce the admin idle timeout. */
export const sessionActivity = pgTable("session_activity", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => session.id, { onDelete: "cascade" }),
  lastSeenAt: timestamp("last_seen_at", tz).notNull().defaultNow(),
});

/** Single-use tokens owned by the app (e.g. member activation in Fase 2). Only the SHA-256 is stored. */
export const oneTimeTokens = pgTable(
  "one_time_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    subjectId: text("subject_id"),
    expiresAt: timestamp("expires_at", tz).notNull(),
    usedAt: timestamp("used_at", tz),
    revokedAt: timestamp("revoked_at", tz),
    createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("one_time_tokens_subject_idx").on(t.kind, t.subjectId)],
);
