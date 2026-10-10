import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { oneTimeTokens } from "@/server/db/schema";
import { generateToken, hashToken } from "@/server/crypto/tokens";

export type IssueOptions = {
  kind: string;
  ttlMs: number;
  userId?: string;
  subjectId?: string;
  createdBy?: string;
  /** Revoke earlier live tokens of the same kind and subject (e.g. on resend). */
  revokePrevious?: boolean;
};

/** Returns the plaintext token exactly once; only its SHA-256 is persisted. */
export async function issueToken(db: Database, opts: IssueOptions, now = new Date()) {
  if (opts.revokePrevious && opts.subjectId) await revokeTokens(db, opts.kind, opts.subjectId, now);
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + opts.ttlMs);
  const [row] = await db
    .insert(oneTimeTokens)
    .values({
      kind: opts.kind,
      tokenHash: hashToken(token),
      userId: opts.userId,
      subjectId: opts.subjectId,
      createdBy: opts.createdBy,
      expiresAt,
    })
    .returning({ id: oneTimeTokens.id });
  return { id: row.id, token, expiresAt };
}

/** Atomically marks a live token as used. Returns null if unknown, expired, revoked or already used. */
export async function consumeToken(db: Database, kind: string, token: string, now = new Date()) {
  const [row] = await db
    .update(oneTimeTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(oneTimeTokens.tokenHash, hashToken(token)),
        eq(oneTimeTokens.kind, kind),
        isNull(oneTimeTokens.usedAt),
        isNull(oneTimeTokens.revokedAt),
        gt(oneTimeTokens.expiresAt, now),
      ),
    )
    .returning({ id: oneTimeTokens.id, userId: oneTimeTokens.userId, subjectId: oneTimeTokens.subjectId });
  return row ?? null;
}

/** Validates without consuming (for multi-step flows that consume at the end). */
export async function findLiveToken(db: Database, kind: string, token: string, now = new Date()) {
  const [row] = await db
    .select({ id: oneTimeTokens.id, userId: oneTimeTokens.userId, subjectId: oneTimeTokens.subjectId, expiresAt: oneTimeTokens.expiresAt })
    .from(oneTimeTokens)
    .where(
      and(
        eq(oneTimeTokens.tokenHash, hashToken(token)),
        eq(oneTimeTokens.kind, kind),
        isNull(oneTimeTokens.usedAt),
        isNull(oneTimeTokens.revokedAt),
        gt(oneTimeTokens.expiresAt, now),
      ),
    );
  return row ?? null;
}

export async function revokeTokens(db: Database, kind: string, subjectId: string, now = new Date()) {
  await db
    .update(oneTimeTokens)
    .set({ revokedAt: now })
    .where(and(eq(oneTimeTokens.kind, kind), eq(oneTimeTokens.subjectId, subjectId), isNull(oneTimeTokens.usedAt), isNull(oneTimeTokens.revokedAt)));
}
