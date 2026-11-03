// A product's technical sheet: what the admin loads (origin, composition, the lab's profile and
// its PDF certificate) is what members see with the product; only for active products.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, productCertificates } from "@/server/db/schema";
import { makeContext } from "./helpers/context";

const state = vi.hoisted(() => ({ who: null as { memberId: string; userId: string } | null, admin: null as { id: string } | null, db: null as unknown }));
vi.mock("@/server/member-request", () => ({
  activeMemberOfRequest: async () => state.who,
  sameOrigin: (request: Request) => {
    const origin = request.headers.get("origin");
    return !origin || origin === new URL(request.url).origin;
  },
}));
vi.mock("@/server/db", () => ({ getDb: async () => state.db }));
vi.mock("@/server/auth/session", async () => {
  const { notFound } = await import("next/navigation");
  return { requireAdmin: async () => (state.admin ? { user: state.admin } : notFound()), getCurrentSession: async () => null };
});

const { sheetInput, updateProductSheet, setProductCertificate, removeProductCertificate, CertificateError, ProductSheetError } = await import("@/server/product-sheet");
const { createProduct, getCatalogItem, listVarieties, productInput } = await import("@/server/products");
const memberCert = await import("@/app/qr/(socio)/productos/[id]/certificado/route");
const adminCert = await import("@/app/admin/(panel)/productos/[id]/certificado/route");

const PDF = new TextEncoder().encode("%PDF-1.7\n% certificado ficticio\n%%EOF\n");
let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let varietyId: string;
let n = 0;
const product = async (type: "aceite" | "inflorescencia" = "aceite", status: "activo" | "inactivo" = "activo") => {
  n += 1;
  return createProduct(ctx.db, adminId, productInput.parse({ name: `Ficha Ficticia ${n}`, type, varietyId, cultivation: "controladas", chemotype: "2", cultivatedOn: "2026-02-01", description: "", status }));
};
const params = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

beforeAll(async () => {
  ctx = await makeContext();
  state.db = ctx.db;
  adminId = (await ctx.createAdmin("admin.ficha@example.com")).id;
  varietyId = (await listVarieties(ctx.db))[0].id;
});
beforeEach(() => {
  state.who = { memberId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002" };
  state.admin = { id: adminId };
});

describe("la ficha técnica", () => {
  it("reads amounts with a comma, drops empty profile rows and refuses what does not make sense", () => {
    const ok = sheetInput.parse({ harvestedOn: "2026-03-01", labName: " Laboratorio Ficticio ", analyzedOn: "", compositionUnit: "mg_ml", thc: "10,5", cbd: "20", dropsPerMl: "30", cannabinoids: [{ compound: "THC", value: "10,5 mg/ml" }, { compound: "", value: "" }] });
    expect(ok).toEqual({ harvestedOn: "2026-03-01", labName: "Laboratorio Ficticio", analyzedOn: null, compositionUnit: "mg_ml", thc: "10.50", cbd: "20.00", dropsPerMl: 30, cannabinoids: [{ compound: "THC", value: "10,5 mg/ml" }] });
    expect(sheetInput.safeParse({ thc: "mucho" }).success).toBe(false);
    expect(sheetInput.safeParse({ thc: "-1" }).success).toBe(false);
    expect(sheetInput.safeParse({ dropsPerMl: "0" }).success).toBe(false);
    expect(sheetInput.safeParse({ harvestedOn: "2099-01-01" }).success).toBe(false);
  });

  it("what the admin loads is what members see, as numbers, and every change is recorded", async () => {
    const id = await product();
    await expect(updateProductSheet(ctx.db, adminId, id, sheetInput.parse({ thc: "5" }))).rejects.toBeInstanceOf(ProductSheetError);
    await updateProductSheet(ctx.db, adminId, id, sheetInput.parse({ harvestedOn: "2026-03-01", labName: "Laboratorio Ficticio", analyzedOn: "2026-04-02", compositionUnit: "mg_ml", thc: "10,5", cbd: "21", dropsPerMl: "30", cannabinoids: [{ compound: "CBD", value: "21 mg/ml" }] }));
    expect((await getCatalogItem(ctx.db, id))!.sheet).toEqual({ harvestedOn: "2026-03-01", labName: "Laboratorio Ficticio", analyzedOn: "2026-04-02", unit: "mg_ml", thc: 10.5, cbd: 21, dropsPerMl: 30, cannabinoids: [{ compound: "CBD", value: "21 mg/ml" }], hasCertificate: false });
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "product.sheet_updated"));
    expect(log.metadata).toMatchObject({ fields: "harvestedOn, labName, analyzedOn, compositionUnit, thc, cbd, dropsPerMl, cannabinoids" });
  });
});

describe("el certificado de análisis", () => {
  it("only a PDF of up to 8 MB; members open it while the product is active, the admin always", async () => {
    const id = await product("inflorescencia");
    await expect(setProductCertificate(ctx.db, adminId, id, new TextEncoder().encode("<html>"))).rejects.toBeInstanceOf(CertificateError);
    await setProductCertificate(ctx.db, adminId, id, PDF);
    expect((await getCatalogItem(ctx.db, id))!.sheet.hasCertificate).toBe(true);

    const res = await memberCert.GET(new Request("http://localhost:3000/x"), params(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(PDF))).toBe(true);

    const inactive = await product("inflorescencia", "inactivo");
    await setProductCertificate(ctx.db, adminId, inactive, PDF);
    expect((await memberCert.GET(new Request("http://localhost:3000/x"), params(inactive))).status).toBe(404);
    expect((await adminCert.GET(new Request("http://localhost:3000/x"), params(inactive))).status).toBe(200);

    vi.stubEnv("APP_ENV", "production");
    state.who = null;
    expect((await memberCert.GET(new Request("http://localhost:3000/x"), params(id))).status).toBe(404);
    vi.unstubAllEnvs();

    expect(await removeProductCertificate(ctx.db, adminId, id)).toBe(true);
    expect(await ctx.db.select().from(productCertificates).where(eq(productCertificates.productId, id))).toHaveLength(0);
  });

  it("is uploaded only by an admin, from this site, as a PDF", async () => {
    const id = await product();
    const put = (body: BodyInit, headers: Record<string, string> = { "content-type": "application/pdf" }) => adminCert.PUT(new Request("http://localhost:3000/x", { method: "PUT", headers, body }), params(id));
    expect((await put(PDF)).status).toBe(200);
    expect((await put(PDF, { "content-type": "image/png" })).status).toBe(415);
    expect((await put(new TextEncoder().encode("<html>"))).status).toBe(400);
    expect((await put(PDF, { "content-type": "application/pdf", origin: "https://otro-sitio.example" })).status).toBe(404);
    state.admin = null;
    await expect(put(PDF)).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});
