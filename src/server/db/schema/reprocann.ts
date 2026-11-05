// REPROCANN, kept apart from the member register. Six separate dimensions, never a single
// "has REPROCANN" flag; eligibility for dispensing is not stored: it will be derived once defined.
// Administrative and documentary only: no clinical data, no credentials of official systems.
import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { members } from "./admissions";

const tz = { withTimezone: true } as const;

// "no_informado": the status is not known yet (e.g. a credential imported from the historical register).
export const reprocannPermitStatus = pgEnum("reprocann_permit_status", ["sin_permiso", "iniciado_informado", "pendiente_aprobacion", "aprobado", "vencido", "renovacion", "no_informado"]);
export const reprocannManagementSource = pgEnum("reprocann_management_source", ["self_or_external", "association"]);
export const reprocannLinkageStatus = pgEnum("reprocann_linkage_status", ["pendiente", "verificada"]);
export const reprocannDocumentKind = pgEnum("reprocann_document_kind", ["credencial", "certificado", "constancia_vinculacion", "otro"]);
export const reprocannReviewStatus = pgEnum("reprocann_review_status", ["pendiente", "observada", "verificada"]);
export const reprocannInfoSource = pgEnum("reprocann_info_source", ["en_poder_de_la_asociacion", "aportado_por_socio", "informado_por_equipo_medico", "verificacion_administrativa"]);
// Why a document left the active documentation without being replaced by the member.
export const reprocannWithdrawalReason = pgEnum("reprocann_withdrawal_reason", ["duplicado"]);

/** One REPROCANN process per member. */
export const reprocannCases = pgTable("reprocann_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "restrict" }),
  permitStatus: reprocannPermitStatus("permit_status").notNull().default("sin_permiso"),
  managementSource: reprocannManagementSource("management_source").notNull().default("self_or_external"),
  /** Free text, e.g. the medical team the association works with. Not a logical identity. */
  responsibleName: text("responsible_name"),
  linkageStatus: reprocannLinkageStatus("linkage_status").notNull().default("pendiente"),
  /**
   * The member's REPROCANN «código de vinculación», which the association uses to link them in
   * REPROCANN. Encrypted (field key); who sent it last (the member or an admin) and when.
   */
  linkCodeEncrypted: text("link_code_encrypted"),
  linkCodeSentBy: uuid("link_code_sent_by").references(() => user.id, { onDelete: "set null" }),
  linkCodeSentAt: timestamp("link_code_sent_at", tz),
  createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
  updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/**
 * A document Amarí Dul holds or receives (credential, certificate, linkage proof). The permit
 * identifier, the internal notes and the message for the member are encrypted, bound to the row.
 * Its files (one per page) live in `reprocann_document_files`; `fileKey` is a legacy column that
 * was never used and stays null. A member replacing a document keeps the previous one, marked
 * with the one that replaced it (retention is not defined yet). An admin can withdraw a duplicate:
 * it stays here and keeps its files, marked with who withdrew it, when, why and which document
 * was kept instead. Active documentation = neither replaced nor withdrawn.
 */
export const reprocannDocuments = pgTable(
  "reprocann_documents",
  {
    id: uuid("id").primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => reprocannCases.id, { onDelete: "restrict" }),
    kind: reprocannDocumentKind("kind").notNull(),
    permitIdentifierEncrypted: text("permit_identifier_encrypted"),
    issuedOn: date("issued_on"),
    expiresOn: date("expires_on"),
    source: reprocannInfoSource("source").notNull(),
    reviewStatus: reprocannReviewStatus("review_status").notNull().default("pendiente"),
    verifiedOn: date("verified_on"),
    reviewedBy: uuid("reviewed_by").references(() => user.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", tz),
    notesEncrypted: text("notes_encrypted"),
    /** What the member reads when the document is observed. Separate from the internal notes. */
    memberMessageEncrypted: text("member_message_encrypted"),
    fileKey: text("file_key"),
    replacedBy: uuid("replaced_by").references((): AnyPgColumn => reprocannDocuments.id, { onDelete: "restrict" }),
    withdrawnAt: timestamp("withdrawn_at", tz),
    withdrawnBy: uuid("withdrawn_by").references(() => user.id, { onDelete: "restrict" }),
    withdrawalReason: reprocannWithdrawalReason("withdrawal_reason"),
    /** The document the admin kept instead of this one. */
    keptDocumentId: uuid("kept_document_id").references((): AnyPgColumn => reprocannDocuments.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [
    index("reprocann_documents_case_idx").on(t.caseId),
    // A withdrawal is recorded whole, or not at all.
    check(
      "reprocann_documents_withdrawal_check",
      sql`(${t.withdrawnAt} is null and ${t.withdrawnBy} is null and ${t.withdrawalReason} is null and ${t.keptDocumentId} is null) or (${t.withdrawnAt} is not null and ${t.withdrawnBy} is not null and ${t.withdrawalReason} is not null and ${t.keptDocumentId} is not null and ${t.keptDocumentId} <> ${t.id})`,
    ),
  ],
);

/**
 * The files of a document, one per page (a credential photographed front and back is one document
 * with two pages). Type and size are the ones checked on the server; `sha256` finds the same file
 * sent twice. Who uploaded each page and when is kept; uploading is never a verification.
 */
export const reprocannDocumentFiles = pgTable(
  "reprocann_document_files",
  {
    id: uuid("id").primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => reprocannDocuments.id, { onDelete: "restrict" }),
    page: integer("page").notNull(),
    fileKey: text("file_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => user.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", tz).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reprocann_document_files_page_idx").on(t.documentId, t.page),
    index("reprocann_document_files_sha256_idx").on(t.sha256),
    check(
      "reprocann_document_files_check",
      sql`${t.page} >= 1 and ${t.contentType} in ('application/pdf', 'image/jpeg', 'image/png') and ${t.size} between 1 and 10485760 and ${t.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);
