// What a member sees about themselves in the portal. Membership, REPROCANN documentation and the
// fee are separate pieces of information; none of them is shown as an enablement for dispensing,
// whose condition the association has not defined yet.
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { reprocannCases, reprocannDocumentFiles, reprocannDocuments, user } from "@/server/db/schema";
import type { Keyring } from "@/server/crypto/keyring";
import { decryptMemberMessage, labelIn, MANAGEMENT_SOURCE, PERMIT_STATUS, REVIEW_STATUS } from "@/server/reprocann";
import { documentKindLabel } from "@/server/reprocann-files";
import { credentialStatus, currentCredential, todayInArgentina, type CredentialStatus } from "@/lib/credential-validity";

type Review = "pendiente" | "observada" | "verificada";

export type PortalDocument = {
  id: string;
  kind: string;
  kindLabel: string;
  review: Review;
  reviewLabel: string;
  expiresOn: string | null;
  sentOn: string;
  /** Sent by the member from their account; otherwise the association loaded or recorded it. */
  fromMember: boolean;
  /** One per page, in order. */
  files: { id: string; page: number }[];
  replaced: boolean;
  /** Why it was observed, written for the member. Only while it is observed. */
  memberMessage: string | null;
};

export type PortalReprocann = {
  permit: string;
  management: string;
  /** The association handles the process: sending the credential is optional for the member. */
  managedByAssociation: boolean;
  /** The current credential and its single status; null when there is none. */
  credential: (PortalDocument & { status: CredentialStatus }) | null;
  status: CredentialStatus;
  documents: PortalDocument[];
};

/**
 * The member's own REPROCANN record as the association keeps it: the situation of the permit, the
 * current credential with its status, and the documents on file. Internal notes and the permit
 * identifier are never read here; the reason for an observation is, because it is written for the
 * member. Null when the association has nothing recorded.
 */
export async function memberReprocann(db: Database, field: Keyring, memberId: string, today = todayInArgentina()): Promise<PortalReprocann | null> {
  const [c] = await db
    .select({ id: reprocannCases.id, permitStatus: reprocannCases.permitStatus, managementSource: reprocannCases.managementSource })
    .from(reprocannCases)
    .where(eq(reprocannCases.memberId, memberId));
  if (!c) return null;
  const rows = await db
    .select({
      id: reprocannDocuments.id,
      kind: reprocannDocuments.kind,
      expiresOn: reprocannDocuments.expiresOn,
      reviewStatus: reprocannDocuments.reviewStatus,
      createdAt: reprocannDocuments.createdAt,
      replacedBy: reprocannDocuments.replacedBy,
      message: reprocannDocuments.memberMessageEncrypted,
      uploaderRole: user.role,
    })
    .from(reprocannDocuments)
    .leftJoin(user, eq(user.id, reprocannDocuments.createdBy))
    .where(eq(reprocannDocuments.caseId, c.id))
    .orderBy(desc(reprocannDocuments.createdAt));
  const files = rows.length
    ? await db
        .select({ id: reprocannDocumentFiles.id, documentId: reprocannDocumentFiles.documentId, page: reprocannDocumentFiles.page })
        .from(reprocannDocumentFiles)
        .where(inArray(reprocannDocumentFiles.documentId, rows.map((r) => r.id)))
        .orderBy(asc(reprocannDocumentFiles.page))
    : [];

  const documents: PortalDocument[] = rows.map((d) => ({
    id: d.id,
    kind: d.kind,
    kindLabel: documentKindLabel(d.kind),
    review: d.reviewStatus,
    reviewLabel: labelIn(REVIEW_STATUS, d.reviewStatus),
    expiresOn: d.expiresOn,
    sentOn: todayInArgentina(d.createdAt),
    fromMember: d.uploaderRole === "MEMBER",
    files: files.filter((f) => f.documentId === d.id).map((f) => ({ id: f.id, page: f.page })),
    replaced: !!d.replacedBy,
    memberMessage: d.reviewStatus === "observada" ? decryptMemberMessage(field, d.id, d.message) : null,
  }));
  const current = currentCredential(rows.filter((r) => !r.replacedBy));
  const shown = current ? documents.find((d) => d.id === current.id)! : null;
  const status = credentialStatus(current, today);
  return {
    permit: labelIn(PERMIT_STATUS, c.permitStatus),
    management: labelIn(MANAGEMENT_SOURCE, c.managementSource),
    managedByAssociation: c.managementSource === "association",
    credential: shown ? { ...shown, status } : null,
    status,
    documents,
  };
}
