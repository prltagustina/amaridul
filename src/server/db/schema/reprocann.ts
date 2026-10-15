// REPROCANN, kept apart from the member register. Six separate dimensions, never a single
// "has REPROCANN" flag; eligibility for dispensing is not stored: it will be derived once defined.
// Administrative and documentary only: no clinical data, no credentials of official systems.
import { date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { members } from "./admissions";

const tz = { withTimezone: true } as const;

export const reprocannPermitStatus = pgEnum("reprocann_permit_status", ["sin_permiso", "iniciado_informado", "pendiente_aprobacion", "aprobado", "vencido", "renovacion"]);
export const reprocannManagementSource = pgEnum("reprocann_management_source", ["self_or_external", "association"]);
export const reprocannLinkageStatus = pgEnum("reprocann_linkage_status", ["pendiente", "verificada"]);
export const reprocannDocumentKind = pgEnum("reprocann_document_kind", ["credencial", "certificado", "constancia_vinculacion", "otro"]);
export const reprocannReviewStatus = pgEnum("reprocann_review_status", ["pendiente", "observada", "verificada"]);
export const reprocannInfoSource = pgEnum("reprocann_info_source", ["en_poder_de_la_asociacion", "aportado_por_socio", "informado_por_equipo_medico", "verificacion_administrativa"]);

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
  createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
  updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/**
 * A document Amarí Dul holds or receives (credential, certificate, linkage proof). The permit
 * identifier and the notes are encrypted, bound to the row. `fileKey` stays null until private
 * file storage is enabled in production: today only the document's data is recorded.
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
    fileKey: text("file_key"),
    createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("reprocann_documents_case_idx").on(t.caseId)],
);
