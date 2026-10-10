import type { Database } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";

export type AuditMetadata = Record<string, string | number | boolean | null>;

export type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: AuditMetadata;
};

// Keys that must never reach the audit log, matched case-insensitively as substrings.
const FORBIDDEN_KEYS = ["password", "token", "secret", "dni", "code", "otp", "hash", "diagnos", "clinic"];

export class ForbiddenAuditFieldError extends Error {}

export function assertSafeMetadata(metadata: AuditMetadata | undefined): void {
  for (const key of Object.keys(metadata ?? {})) {
    const k = key.toLowerCase();
    if (FORBIDDEN_KEYS.some((f) => k.includes(f))) {
      throw new ForbiddenAuditFieldError(`Campo no permitido en auditoría: ${key}`);
    }
  }
}

export async function audit(db: Database, entry: AuditEntry): Promise<void> {
  assertSafeMetadata(entry.metadata);
  await db.insert(auditLogs).values({
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });
}
