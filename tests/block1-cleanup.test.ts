// Stage 1 cleanup: the audit view shows what happened without exposing values, the member portal
// reads the member's own REPROCANN record without internal data, and the example traceability
// screens stay off, routes included.
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, members, persons } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import { listAuditRows } from "@/server/audit/view";
import { setPersonDni } from "@/server/identity/person-identity";
import { addMemberNote, contactInput, updateContact } from "@/server/member-profile";
import { memberReprocann } from "@/server/member-portal";
import { addDocument, caseInput, documentInput, saveCase } from "@/server/reprocann";
import { localDemo, traceabilityPrototype } from "@/lib/features";
import { officialWhatsAppLink, UPDATE_DATA_MESSAGE } from "@/lib/whatsapp";
import { createProduct, listCatalog, listVarieties, productInput } from "@/server/products";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.limpieza@example.com")).id;
});

async function member(n: number) {
  const [p] = await ctx.db.insert(persons).values({ fullName: `Persona Limpieza ${n}`, isFixture: true }).returning({ id: persons.id });
  await setPersonDni(ctx.db, ctx.rings, p.id, `9901000${n}`);
  const [m] = await ctx.db.insert(members).values({ personId: p.id, origin: "legacy", memberNumber: `L-00${n}` }).returning({ id: members.id });
  return m.id;
}

describe("auditoría", () => {
  it("names the action and the record, says which fields changed and never shows their values", async () => {
    const id = await member(1);
    await updateContact(ctx.db, adminId, id, contactInput.parse({ email: "secreto.limpieza@example.com", phone: "+54 9 342 555 0199", address: "Calle Reservada 123", locality: "", province: "", postalCode: "" }));
    await addMemberNote(ctx.db, adminId, id, "Nota interna que no debe verse");
    await saveCase(ctx.db, adminId, id, caseInput.parse({ permitStatus: "aprobado", managementSource: "association", responsibleName: "Responsable Reservado", linkageStatus: "pendiente" }));

    const rows = await listAuditRows(ctx.db, 50);
    const contact = rows.find((r) => r.action === "Contacto editado")!;
    expect(contact).toMatchObject({ area: "Padrón", actor: "Admin Local", subject: { label: "Persona Limpieza 1 · L-001", href: `/admin/socios/${id}` } });
    expect(contact.detail).toBe("Cambió: email, celular, domicilio");
    expect(rows.find((r) => r.action === "Observación interna agregada")?.subject?.href).toBe(`/admin/socios/${id}`);
    expect(rows.some((r) => r.area === "REPROCANN" && r.subject?.href === `/admin/socios/${id}`)).toBe(true);

    const shown = JSON.stringify(rows);
    for (const secret of ["secreto.limpieza", "555 0199", "Calle Reservada", "Nota interna", "Responsable Reservado", "99010001"]) expect(shown).not.toContain(secret);
  });

  it("an admin's own sign-in names them once, as who did it", async () => {
    await audit(ctx.db, { actorUserId: adminId, action: "auth.admin_signed_in", entityType: "user", entityId: adminId });
    const [row] = await listAuditRows(ctx.db, 1);
    expect(row).toMatchObject({ action: "Ingreso a la administración", actor: "Admin Local", subject: null, area: "Accesos" });
  });

  it("public submissions, unknown actions and deleted records are shown without guessing", async () => {
    await audit(ctx.db, { action: "pre_admission.received", entityType: "pre_admission", entityId: "00000000-0000-4000-8000-000000000001", metadata: { reference: "PRE-2026-0999" } });
    await audit(ctx.db, { action: "algo.nuevo", entityType: "member", entityId: "00000000-0000-4000-8000-000000000002" });
    const rows = await listAuditRows(ctx.db, 5);
    expect(rows.find((r) => r.action === "Preadmisión recibida")).toMatchObject({ actor: "Formulario público", subject: { label: "Preadmisión PRE-2026-0999", href: null } });
    expect(rows.find((r) => r.action === "Otra acción del sistema")).toMatchObject({ actor: "Sistema", subject: { label: "Socio (ya no existe)", href: null } });
  });
});

describe("portal del socio · REPROCANN", () => {
  it("is empty when nothing is recorded, and never carries internal notes or the permit identifier", async () => {
    const id = await member(2);
    expect(await memberReprocann(ctx.db, ctx.rings.field, id)).toBeNull();
    await saveCase(ctx.db, adminId, id, caseInput.parse({ permitStatus: "aprobado", managementSource: "self_or_external", responsibleName: "", linkageStatus: "verificada" }));
    await addDocument(ctx.db, ctx.rings.field, adminId, id, documentInput.parse({ kind: "credencial", permitIdentifier: "ID-RESERVADO-77", issuedOn: "", expiresOn: "2027-01-05", source: "aportado_por_socio", notes: "Nota interna del documento" }));
    const r = await memberReprocann(ctx.db, ctx.rings.field, id, "2026-11-03");
    expect(r).toMatchObject({
      permit: "Permiso aprobado",
      management: "La persona, con su profesional",
      managedByAssociation: false,
      credential: { review: "pendiente", reviewLabel: "Pendiente de revisión", expiresOn: "2027-01-05", files: [], memberMessage: null },
      // A date nobody verified yet is not shown as valid.
      status: { key: "pending", label: "En revisión", expiry: { date: "2027-01-05", verified: false } },
    });
    expect(r?.documents).toEqual([expect.objectContaining({ kindLabel: "Credencial REPROCANN", review: "pendiente", fromMember: false, files: [], replaced: false, memberMessage: null })]);
    expect(JSON.stringify(r)).not.toMatch(/ID-RESERVADO|Nota interna/);
  });
});

describe("trazabilidad", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("demonstrations with example data only run on the development machine, never on a deployment (not even a preview)", () => {
    vi.stubEnv("FEATURE_TRACEABILITY", "on");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(traceabilityPrototype()).toBe(false);
    expect(localDemo()).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(traceabilityPrototype()).toBe(false);
    expect(localDemo()).toBe(false);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("APP_ENV", "local");
    expect(localDemo()).toBe(true);
    expect(traceabilityPrototype()).toBe(true);
    vi.stubEnv("FEATURE_TRACEABILITY", "");
    expect(traceabilityPrototype()).toBe(false);
  });

  it("is hidden from members (not even as «próximamente») and stays in the admin; the demo stays apart", async () => {
    for (const page of ["src/app/admin/(panel)/lotes/page.tsx", "src/app/admin/(panel)/lotes/[id]/page.tsx", "src/app/admin/(panel)/codigos/page.tsx"]) {
      const source = readFileSync(page, "utf8");
      expect(source).toMatch(/traceabilityPrototype\(\)/);
      expect(source.indexOf("traceabilityPrototype()")).toBeGreaterThan(source.search(/await requireAdmin\(/));
    }
    // The member route answers «not found», with or without a session.
    const { default: memberPage } = await import("@/app/qr/(socio)/trazabilidad/page");
    expect(() => memberPage()).toThrow(expect.objectContaining({ digest: expect.stringMatching(/NEXT_HTTP_ERROR_FALLBACK;404/) }));
    // Nothing in the portal leads there: no menu entry, no card, no lot or delivery wording.
    for (const file of ["src/components/brand/member-header.tsx", "src/app/qr/(socio)/mi-espacio/page.tsx", "src/app/qr/(socio)/productos/(lista)/page.tsx", "src/components/products/product-card.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\/qr\/trazabilidad|Trazabilidad|Conocé tu producto|Tus entregas|lote/i);
    }
    // The demo lives apart and refuses to render off the development machine.
    const demo = readFileSync("src/app/qr/(socio)/trazabilidad/demo/page.tsx", "utf8");
    expect(demo.indexOf("if (!localDemo()) notFound();")).toBeGreaterThan(-1);
    expect(demo.indexOf("if (!localDemo()) notFound();")).toBeLessThan(demo.indexOf("<LotLookup"));
  });
});

describe("WhatsApp para actualizar datos", () => {
  it("carries only the request, and without a valid official number there is no link", () => {
    expect(officialWhatsAppLink(UPDATE_DATA_MESSAGE, "")).toBeNull();
    expect(officialWhatsAppLink(UPDATE_DATA_MESSAGE, "12345")).toBeNull();
    const link = officialWhatsAppLink(UPDATE_DATA_MESSAGE, "+54 9 342 000-0000")!;
    const url = new URL(link);
    expect(url.origin + url.pathname).toBe("https://wa.me/5493420000000");
    expect(url.searchParams.get("text")).toBe("Hola, soy socio/a de Amarí Dul y necesito actualizar mis datos. ¿Me ayudan?");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
  });
});

describe("catálogo para socios", () => {
  it("shows active products only, with what describes them and nothing else", async () => {
    const [g1] = await listVarieties(ctx.db);
    await createProduct(ctx.db, adminId, productInput.parse({ name: "Aceite Ficticio Activo", type: "aceite", varietyId: g1.id, cultivation: "exterior", chemotype: "1", cultivatedOn: "2026-02-01", description: "Descripción ficticia", status: "activo" }));
    await createProduct(ctx.db, adminId, productInput.parse({ name: "Crema Ficticia Oculta", type: "crema", varietyId: g1.id, cultivation: "controladas", chemotype: "2", cultivatedOn: "2026-02-01", description: "", status: "inactivo" }));
    const catalog = await listCatalog(ctx.db);
    expect(catalog.map((p) => p.name)).toContain("Aceite Ficticio Activo");
    expect(catalog.map((p) => p.name)).not.toContain("Crema Ficticia Oculta");
    expect(Object.keys(catalog[0]).sort()).toEqual(["chemotype", "cultivatedOn", "cultivation", "description", "id", "name", "photo", "type", "variety"]);
    expect(catalog.find((p) => p.name === "Aceite Ficticio Activo")).toMatchObject({ type: "Aceite", cultivation: "Exterior", chemotype: "1", photo: null, variety: g1.name ? `${g1.code} · ${g1.name}` : g1.code });
  });
});

describe("registro de auditoría intacto", () => {
  it("reading the audit view writes nothing", async () => {
    const before = (await ctx.db.select().from(auditLogs)).length;
    await listAuditRows(ctx.db, 100);
    expect((await ctx.db.select().from(auditLogs)).length).toBe(before);
    expect(await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "algo.nuevo"))).toHaveLength(1);
  });
});
