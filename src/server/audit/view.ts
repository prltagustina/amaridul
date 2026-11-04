// The audit log as the administration reads it. Only what the role needs: what happened, who did
// it and to which record (with a link). The stored metadata keeps before/after values for the
// record; this view never shows them (emails, phones, names, notes, REPROCANN data): it says
// which fields changed, not to what.
import { desc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { admissions, auditLogs, existingMemberRequests, members, persons, preAdmissions, products, reprocannCases, user, varieties } from "@/server/db/schema";

export type AuditArea = "Solicitudes" | "Padrón" | "Accesos" | "REPROCANN" | "Catálogo" | "Sistema";

const ACTIONS: Record<string, { label: string; area: AuditArea }> = {
  "pre_admission.received": { label: "Preadmisión recibida", area: "Solicitudes" },
  "pre_admission.status_changed": { label: "Preadmisión: cambio de estado", area: "Solicitudes" },
  "pre_admission.note_added": { label: "Nota interna en una preadmisión", area: "Solicitudes" },
  "pre_admission.marked_existing_member": { label: "Preadmisión derivada a socio existente", area: "Solicitudes" },
  "admission.received": { label: "Solicitud formal recibida", area: "Solicitudes" },
  "admission.elevated": { label: "Solicitud elevada a la Comisión", area: "Solicitudes" },
  "admission.approved": { label: "Admisión aprobada", area: "Solicitudes" },
  "admission.rejected": { label: "Admisión rechazada", area: "Solicitudes" },
  "admission.deferred": { label: "Admisión diferida", area: "Solicitudes" },
  "existing_member.request_received": { label: "Solicitud de socio existente recibida", area: "Solicitudes" },
  "existing_member.request_created": { label: "Solicitud de socio existente abierta desde una preadmisión", area: "Solicitudes" },
  "existing_member.repeat_submission": { label: "Solicitud de socio existente repetida", area: "Solicitudes" },
  "existing_member.duplicate_closed": { label: "Solicitud duplicada cerrada", area: "Solicitudes" },
  "existing_member.update_link_resent": { label: "Link de actualización de legajo reenviado", area: "Solicitudes" },
  "existing_member.needs_review": { label: "Solicitud marcada para revisar", area: "Solicitudes" },
  "existing_member.rejected": { label: "Solicitud marcada «No corresponde»", area: "Solicitudes" },
  "existing_member.registered": { label: "Socio existente registrado en el padrón", area: "Padrón" },
  "existing_member.linked": { label: "Solicitud vinculada con un socio del padrón", area: "Padrón" },
  "existing_member.completed": { label: "Actualización de legajo completada", area: "Padrón" },
  "member.imported": { label: "Socio cargado desde la importación del padrón", area: "Padrón" },
  "member.import_updated": { label: "Socio completado desde la importación del padrón", area: "Padrón" },
  "member.personal_updated": { label: "Datos personales editados", area: "Padrón" },
  "member.contact_updated": { label: "Contacto editado", area: "Padrón" },
  "member.institutional_data_updated": { label: "Membresía editada", area: "Padrón" },
  "member.number_changed": { label: "Número de socio cambiado", area: "Padrón" },
  "member.identity_updated": { label: "DNI actualizado", area: "Padrón" },
  "member.fee_updated": { label: "Datos de cuota editados", area: "Padrón" },
  "member.note_added": { label: "Observación interna agregada", area: "Padrón" },
  "member.account_created": { label: "Cuenta digital creada", area: "Accesos" },
  "member.account_linked": { label: "Cuenta digital vinculada", area: "Accesos" },
  "member.activation_sent": { label: "Invitación de activación enviada", area: "Accesos" },
  "member.activation_resent": { label: "Activación reenviada", area: "Accesos" },
  "member.activated": { label: "Cuenta activada por el socio", area: "Accesos" },
  "auth.admin_signed_in": { label: "Ingreso a la administración", area: "Accesos" },
  "auth.admin_signed_out": { label: "Salida de la administración", area: "Accesos" },
  "admin.created": { label: "Usuario de administración creado", area: "Accesos" },
  "admin.second_factor_enabled": { label: "Código del celular activado", area: "Accesos" },
  "admin.backup_codes_regenerated": { label: "Códigos de respaldo regenerados", area: "Accesos" },
  "admin.break_glass_second_factor_reset": { label: "Segundo factor restablecido de emergencia", area: "Accesos" },
  "reprocann.case_opened": { label: "Trámite REPROCANN abierto", area: "REPROCANN" },
  "reprocann.case_updated": { label: "Situación REPROCANN actualizada", area: "REPROCANN" },
  "reprocann.document_added": { label: "Documento REPROCANN registrado", area: "REPROCANN" },
  "reprocann.document_reviewed": { label: "Documento REPROCANN revisado", area: "REPROCANN" },
  "reprocann.document_uploaded": { label: "Documento REPROCANN enviado por el socio", area: "REPROCANN" },
  "reprocann.document_viewed": { label: "Archivo REPROCANN abierto", area: "REPROCANN" },
  "reprocann.document_files_added": { label: "Documentación REPROCANN cargada por la asociación", area: "REPROCANN" },
  "reprocann.link_code_sent": { label: "Código de vinculación recibido", area: "REPROCANN" },
  "reprocann.link_code_removed": { label: "Código de vinculación quitado", area: "REPROCANN" },
  "product.sheet_updated": { label: "Ficha técnica de producto editada", area: "Catálogo" },
  "product.certificate_set": { label: "Certificado de análisis cargado", area: "Catálogo" },
  "product.certificate_removed": { label: "Certificado de análisis quitado", area: "Catálogo" },
  "member.fee_plan_set": { label: "Forma de pago de la cuota elegida", area: "Padrón" },
  "product.created": { label: "Producto creado", area: "Catálogo" },
  "product.updated": { label: "Producto editado", area: "Catálogo" },
  "product.deleted": { label: "Producto eliminado", area: "Catálogo" },
  "variety.renamed": { label: "Variedad renombrada", area: "Catálogo" },
  "product.photo_set": { label: "Foto de producto cargada", area: "Catálogo" },
  "product.photo_removed": { label: "Foto de producto quitada", area: "Catálogo" },
  "fee_reminder.settings_updated": { label: "Recordatorio de cuota configurado", area: "Padrón" },
  "fee_reminder.run": { label: "Recordatorio de cuota enviado", area: "Padrón" },
  "test_request.deleted": { label: "Solicitud de prueba eliminada", area: "Sistema" },
};

/** Field names as the admin knows them. Values are never shown. */
const FIELDS: Record<string, string> = {
  firstNames: "nombre",
  lastNames: "apellido",
  birthDate: "fecha de nacimiento",
  email: "email",
  phone: "celular",
  address: "domicilio",
  locality: "localidad",
  province: "provincia",
  cp: "código postal",
  category: "categoría",
  since: "fecha de ingreso",
  status: "estado",
  minutesReference: "acta",
  room: "sala",
  memberNumber: "número de socio",
  feeEnrollmentDate: "alta en la cuota",
  paymentMethod: "medio de pago",
  permitStatus: "permiso",
  managementSource: "quién gestiona",
  linkageStatus: "vinculación",
  responsibleName: "responsable",
  reviewStatus: "revisión",
  verifiedOn: "fecha de verificación",
  memberMessage: "motivo para el socio",
  expiresOn: "vencimiento",
  notes: "nota interna",
  name: "nombre",
  type: "tipo",
  varietyId: "variedad",
  cultivation: "cultivo",
  chemotype: "quimiotipo",
  cultivatedOn: "fecha de cultivo",
  description: "descripción",
};

/** Submissions that arrive from the public forms, before anyone signs in. */
const PUBLIC = new Set(["pre_admission.received", "admission.received", "existing_member.request_received", "existing_member.repeat_submission", "existing_member.duplicate_closed"]);

export type AuditRow = {
  id: string;
  at: Date;
  action: string;
  area: AuditArea;
  actor: string;
  subject: { label: string; href: string | null } | null;
  detail: string | null;
};

function changedFields(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  const fields = new Set<string>();
  for (const key of Object.keys(metadata)) {
    const m = key.match(/^(.+)_(before|after|changed)$/);
    if (m) fields.add(FIELDS[m[1]] ?? "otro dato");
  }
  return [...fields];
}

function detailOf(action: string, metadata: Record<string, unknown> | null): string | null {
  const fields = changedFields(metadata);
  if (fields.length) return `Cambió: ${fields.join(", ")}`;
  if ((action === "member.activation_sent" || action === "member.activation_resent") && metadata?.emailed === false) return "El email no se pudo enviar";
  return null;
}

/** The latest entries, newest first, ready to show. */
export async function listAuditRows(db: Database, limit = 100): Promise<AuditRow[]> {
  const rows = await db
    .select({ id: auditLogs.id, at: auditLogs.at, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, metadata: auditLogs.metadata, actorName: user.name, actorRole: user.role })
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.at))
    .limit(limit);

  const ids = (type: string) => [...new Set(rows.filter((r) => r.entityType === type && r.entityId).map((r) => r.entityId!))];
  const uuidOnly = (list: string[]) => list.filter((v) => /^[0-9a-f-]{36}$/i.test(v));

  // Records are looked up by type, in one query each, to name them and link to them.
  const memberIds = new Set(uuidOnly(ids("member")));
  const caseRows = uuidOnly(ids("reprocann_case")).length
    ? await db.select({ id: reprocannCases.id, memberId: reprocannCases.memberId }).from(reprocannCases).where(inArray(reprocannCases.id, uuidOnly(ids("reprocann_case"))))
    : [];
  caseRows.forEach((c) => memberIds.add(c.memberId));
  const userRows = uuidOnly(ids("user")).length
    ? await db.select({ id: user.id, name: user.name, role: user.role }).from(user).where(inArray(user.id, uuidOnly(ids("user"))))
    : [];
  const userMembers = userRows.length
    ? await db.select({ id: members.id, userId: members.userId }).from(members).where(inArray(members.userId, userRows.map((u) => u.id)))
    : [];
  userMembers.forEach((m) => memberIds.add(m.id));
  const memberRows = memberIds.size
    ? await db.select({ id: members.id, number: members.memberNumber, name: persons.fullName }).from(members).innerJoin(persons, eq(persons.id, members.personId)).where(inArray(members.id, [...memberIds]))
    : [];
  const refs = async <T extends { id: string; reference: string }>(list: string[], load: (l: string[]) => Promise<T[]>) => (uuidOnly(list).length ? load(uuidOnly(list)) : Promise.resolve([] as T[]));
  const [preRows, admRows, reqRows] = await Promise.all([
    refs(ids("pre_admission"), (l) => db.select({ id: preAdmissions.id, reference: preAdmissions.reference }).from(preAdmissions).where(inArray(preAdmissions.id, l))),
    refs(ids("admission"), (l) => db.select({ id: admissions.id, reference: admissions.reference }).from(admissions).where(inArray(admissions.id, l))),
    refs(ids("existing_member_request"), (l) => db.select({ id: existingMemberRequests.id, reference: existingMemberRequests.reference }).from(existingMemberRequests).where(inArray(existingMemberRequests.id, l))),
  ]);
  const productRows = uuidOnly(ids("product")).length ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, uuidOnly(ids("product")))) : [];
  const varietyRows = uuidOnly(ids("variety")).length ? await db.select({ id: varieties.id, code: varieties.code }).from(varieties).where(inArray(varieties.id, uuidOnly(ids("variety")))) : [];

  const member = (id: string | undefined) => {
    const m = memberRows.find((x) => x.id === id);
    return m ? { label: m.number ? `${m.name} · ${m.number}` : m.name, href: `/admin/socios/${m.id}` } : null;
  };
  const gone = (what: string) => ({ label: `${what} (ya no existe)`, href: null });

  function subjectOf(r: (typeof rows)[number]): AuditRow["subject"] {
    const id = r.entityId ?? undefined;
    switch (r.entityType) {
      case "member":
        return member(id) ?? gone("Socio");
      case "reprocann_case":
        return member(caseRows.find((c) => c.id === id)?.memberId) ?? gone("Trámite REPROCANN");
      case "user": {
        const u = userRows.find((x) => x.id === id);
        // An admin's own sign-in or settings: «Quién» already names them.
        if (u?.role === "ADMIN") return null;
        return member(userMembers.find((m) => m.userId === id)?.id) ?? (u ? { label: "Cuenta de socio", href: null } : gone("Cuenta"));
      }
      case "pre_admission": {
        const p = preRows.find((x) => x.id === id);
        if (p) return { label: `Preadmisión ${p.reference}`, href: `/admin/preadmisiones/${p.id}` };
        return typeof r.metadata?.reference === "string" ? { label: `Preadmisión ${r.metadata.reference}`, href: null } : gone("Preadmisión");
      }
      case "admission": {
        const a = admRows.find((x) => x.id === id);
        return a ? { label: `Admisión ${a.reference}`, href: `/admin/admisiones/${a.id}` } : gone("Admisión");
      }
      case "existing_member_request": {
        const q = reqRows.find((x) => x.id === id);
        return q ? { label: `Solicitud ${q.reference}`, href: `/admin/socios-existentes/${q.id}` } : gone("Solicitud");
      }
      case "product": {
        const p = productRows.find((x) => x.id === id);
        return p ? { label: `Producto · ${p.name}`, href: "/admin/productos" } : { label: "Producto (eliminado)", href: null };
      }
      case "variety": {
        const v = varietyRows.find((x) => x.id === id);
        return v ? { label: `Variedad ${v.code}`, href: "/admin/productos" } : gone("Variedad");
      }
      default:
        return null;
    }
  }

  function actorOf(r: (typeof rows)[number]) {
    if (r.actorRole === "ADMIN") return r.actorName ?? "Administración";
    if (r.actorRole === "MEMBER") return "El socio, desde su cuenta";
    return PUBLIC.has(r.action) ? "Formulario público" : "Sistema";
  }

  return rows.map((r) => {
    const known = ACTIONS[r.action];
    return {
      id: r.id,
      at: r.at,
      action: known?.label ?? "Otra acción del sistema",
      area: known?.area ?? "Sistema",
      actor: actorOf(r),
      subject: subjectOf(r),
      detail: detailOf(r.action, r.metadata),
    };
  });
}
