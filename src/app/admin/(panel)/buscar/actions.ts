"use server";

import type { Tone } from "@/components/ui/display";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { categoryLabel } from "@/server/member-profile";
import { productTypeLabel } from "@/server/products";
import { parseQuery, SEARCH_GROUPS, searchAdmissions, searchExistingRequests, searchMembers, searchPreAdmissions, searchProcedures, searchProducts, type SearchGroup, type SearchMatch, type SearchQuery } from "@/server/admin-search";
import { LINKAGE_TEXT, linkageState } from "@/lib/dispensing";
import { admissionStatus, existingRequestStatus, memberStatus, preStatus } from "../../status";

export type SearchHitView = { key: string; href: string; title: string; detail: string; match: string | null; badge: { label: string; tone: Tone } | null };
export type SearchGroupView = { group: SearchGroup; label: string; hits: SearchHitView[]; more: boolean };
export type SearchResponse = { ok: true; groups: SearchGroupView[]; tooShort?: true } | { ok: false; error: string };

const GROUP_LABEL: Record<SearchGroup, string> = {
  socios: "Socios",
  tramites: "Trámites REPROCANN",
  preadmisiones: "Preadmisiones",
  admisiones: "Admisiones",
  solicitudes: "Solicitudes de socios existentes",
  productos: "Productos",
};
const MATCH_LABEL: Record<Exclude<SearchMatch, null>, string> = {
  dni: "Coincide el DNI",
  numero: "Coincide el número",
  numero_anterior: "Coincide un número anterior",
  email: "Coincide el email",
  referencia: "Coincide la referencia",
  variedad: "Coincide la variedad",
};
const matchLabel = (m: SearchMatch) => (m ? MATCH_LABEL[m] : null);
const day = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

/** One group, as the page shows it: where each hit opens, what it is and why it matched. */
async function group(g: SearchGroup, q: SearchQuery, limit: number, offset: number): Promise<SearchGroupView> {
  const db = await getDb();
  const view = (hits: SearchHitView[], more: boolean): SearchGroupView => ({ group: g, label: GROUP_LABEL[g], hits, more });
  switch (g) {
    case "socios": {
      const r = await searchMembers(db, q, limit, offset);
      return view(
        r.rows.map((m) => ({ key: m.id, href: `/admin/socios/${m.id}`, title: m.name, detail: `N.º ${m.memberNumber ?? "a confirmar"} · ${m.category ? `categoría ${categoryLabel(m.category)}` : "categoría a confirmar"}`, match: matchLabel(m.match), badge: memberStatus[m.status] })),
        r.more,
      );
    }
    case "tramites": {
      const r = await searchProcedures(db, q, limit, offset);
      return view(
        r.rows.map((p) => ({
          key: p.memberId,
          href: p.reviewDocumentId ? `/admin/socios/${p.memberId}?revisar=${p.reviewDocumentId}#reprocann` : `/admin/socios/${p.memberId}#reprocann`,
          title: p.name,
          detail: `Credencial: ${p.credential.label.toLowerCase()} · Vinculación: ${LINKAGE_TEXT[linkageState({ verified: p.linkage === "verificada", codeReceived: p.codeReceived })].admin.status.toLowerCase()}`,
          match: null,
          badge: p.reviewDocumentId ? { label: "Credencial para revisar", tone: "warning" } : { label: p.credential.label, tone: p.credential.tone },
        })),
        r.more,
      );
    }
    case "preadmisiones": {
      const r = await searchPreAdmissions(db, q, limit, offset);
      return view(r.rows.map((p) => ({ key: p.id, href: `/admin/preadmisiones/${p.id}`, title: p.name, detail: `${p.reference} · recibida el ${day.format(p.createdAt)}`, match: matchLabel(p.match), badge: preStatus[p.status] })), r.more);
    }
    case "admisiones": {
      const r = await searchAdmissions(db, q, limit, offset);
      return view(r.rows.map((a) => ({ key: a.id, href: `/admin/admisiones/${a.id}`, title: a.name, detail: `${a.reference} · enviada el ${day.format(a.submittedAt)}`, match: matchLabel(a.match), badge: admissionStatus[a.status] })), r.more);
    }
    case "solicitudes": {
      const r = await searchExistingRequests(db, q, limit, offset);
      return view(r.rows.map((s) => ({ key: s.id, href: `/admin/socios-existentes/${s.id}`, title: s.name, detail: `${s.reference} · ${day.format(s.createdAt)}`, match: matchLabel(s.match), badge: existingRequestStatus[s.status] })), r.more);
    }
    case "productos": {
      const r = await searchProducts(db, q, limit, offset);
      return view(
        r.rows.map((p) => ({
          key: p.id,
          href: `/admin/productos?editar=${p.id}`,
          title: p.name,
          detail: [productTypeLabel(p.type), p.varietyCode ? (p.varietyName ? `${p.varietyCode} · ${p.varietyName}` : p.varietyCode) : null].filter(Boolean).join(" · "),
          match: matchLabel(p.match),
          badge: p.status === "activo" ? { label: "Activo", tone: "success" } : { label: "Inactivo", tone: "neutral" },
        })),
        r.more,
      );
    }
  }
}

/**
 * The admin's global search. Every group is a bounded query; `more` asks for the next page of one
 * group. Only admins; the query is never logged (it may be a DNI) and travels in the request body,
 * never in a URL.
 */
export async function searchAdminAction(raw: string, more?: { group: string; offset: number }): Promise<SearchResponse> {
  await requireAdmin();
  const q = parseQuery(String(raw ?? ""), getKeyrings());
  if (!q) return { ok: true, groups: [], tooShort: true };
  const only = more && (SEARCH_GROUPS as readonly string[]).includes(more.group) ? (more.group as SearchGroup) : null;
  if (more && !only) return { ok: false, error: "No pudimos buscar." };
  const offset = only ? Math.max(0, Math.min(10_000, Math.floor(Number(more!.offset) || 0))) : 0;
  try {
    const groups = await Promise.all((only ? [only] : SEARCH_GROUPS).map((g) => group(g, q, only ? 20 : 6, offset)));
    return { ok: true, groups: only ? groups : groups.filter((g) => g.hits.length) };
  } catch (e) {
    console.error("Admin search failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No pudimos buscar. Probá de nuevo en unos segundos." };
  }
}
