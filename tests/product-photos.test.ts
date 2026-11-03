// The catalog as members meet it: what the admin publishes appears, edits show at once, a
// deactivated product disappears (its sheet and photo too), and photos keep only the image,
// never camera or location data. Sessions are replaced by test doubles; the checks are the code's own.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, productPhotos } from "@/server/db/schema";
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

const { cleanJpeg, MAX_PHOTO_BYTES, readProductPhoto, removeProductPhoto, setProductPhoto, PhotoError } = await import("@/server/product-photos");
const { createProduct, deleteProduct, getCatalogItem, listCatalog, listProducts, listVarieties, productInput, updateProduct } = await import("@/server/products");
const memberPhoto = await import("@/app/qr/(socio)/productos/[id]/foto/route");
const adminPhoto = await import("@/app/admin/(panel)/productos/[id]/foto/route");

/** A structurally valid JPEG: optional metadata segments, a frame of `w`×`h` and some coded data. */
function jpeg({ w = 640, h = 480, exif = true, comment = true, late = false, tail = false } = {}) {
  const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
  const text = (t: string) => [...new TextEncoder().encode(t)];
  const bytes = [
    0xff, 0xd8,
    ...seg(0xe0, [...text("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...(exif ? seg(0xe1, [...text("Exif"), 0, 0, ...text("GPS -31.4201 -64.1888 CAMARA FICTICIA")]) : []),
    ...(comment ? seg(0xfe, text("COMENTARIO FICTICIO")) : []),
    ...seg(0xdb, [0, ...Array(64).fill(1)]),
    ...seg(0xc0, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 1, 1, 0x11, 0]),
    ...seg(0xc4, [0, ...Array(16).fill(0)]),
    ...seg(0xda, [1, 1, 0, 0, 63, 0]),
    0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78,
    // Progressive files have more scans; metadata hidden between them goes too.
    ...(late ? [...seg(0xe1, text("XMP GPS OCULTO")), ...seg(0xda, [1, 1, 0, 0, 63, 0]), 0x9a, 0xbc] : []),
    0xff, 0xd9,
    ...(tail ? text("DATOS PEGADOS AL FINAL") : []),
  ];
  return Uint8Array.from(bytes);
}
const has = (b: Uint8Array, t: string) => Buffer.from(b).includes(Buffer.from(t));

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let varietyId: string;
let n = 0;
const product = async (overrides: Partial<Record<string, string>> = {}) => {
  n += 1;
  const id = await createProduct(ctx.db, adminId, productInput.parse({ name: `Producto Ficticio ${n}`, type: "inflorescencia", varietyId, cultivation: "exterior", chemotype: "1", cultivatedOn: "2026-03-10", description: "", status: "activo", ...overrides }));
  return id;
};
const values = (id: string, overrides: Record<string, string>) =>
  listProducts(ctx.db).then((all) => {
    const p = all.find((x) => x.id === id)!;
    return productInput.parse({ name: p.name, type: p.type, varietyId: p.varietyId, cultivation: p.cultivation, chemotype: p.chemotype, cultivatedOn: p.cultivatedOn, description: p.description ?? "", status: p.status, ...overrides });
  });

beforeAll(async () => {
  ctx = await makeContext();
  state.db = ctx.db;
  adminId = (await ctx.createAdmin("admin.catalogo@example.com")).id;
  varietyId = (await listVarieties(ctx.db))[0].id;
});
beforeEach(() => {
  state.who = { memberId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002" };
  state.admin = { id: adminId };
});

describe("la foto queda sin datos de cámara ni de ubicación", () => {
  it("keeps the image, drops every APPn and comment segment wherever it is, and anything after the end", () => {
    const raw = jpeg({ late: true, tail: true });
    expect(has(raw, "GPS")).toBe(true);
    const clean = cleanJpeg(raw)!;
    expect(clean).toMatchObject({ width: 640, height: 480 });
    for (const t of ["GPS", "Exif", "JFIF", "COMENTARIO", "XMP", "DATOS PEGADOS"]) expect(has(clean.bytes, t), t).toBe(false);
    // Starts and ends as a JPEG, with its coded data intact (escaped bytes and restarts included).
    expect([...clean.bytes.slice(0, 2)]).toEqual([0xff, 0xd8]);
    expect([...clean.bytes.slice(-2)]).toEqual([0xff, 0xd9]);
    expect(Buffer.from(clean.bytes).includes(Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78]))).toBe(true);
  });

  it("refuses what is not a well-formed JPEG", () => {
    const ok = jpeg();
    for (const bad of [new Uint8Array(), new TextEncoder().encode("%PDF-1.7"), new TextEncoder().encode("<svg onload=alert(1)>"), ok.slice(0, ok.length - 2), ok.slice(0, 30), jpeg({ w: 0 })]) expect(cleanJpeg(bad)).toBeNull();
  });
});

describe("guardar, reemplazar y quitar la foto", () => {
  it("saves the clean photo with its size, records it without the image, and a new photo changes the version", async () => {
    const id = await product();
    const first = await setProductPhoto(ctx.db, adminId, id, jpeg());
    expect(first).toMatchObject({ width: 640, height: 480 });
    const [row] = await ctx.db.select().from(productPhotos).where(eq(productPhotos.productId, id));
    expect(has(row.bytes, "GPS")).toBe(false);
    // The same photo again changes nothing; a different one replaces it.
    expect(await setProductPhoto(ctx.db, adminId, id, jpeg())).toEqual(first);
    const second = await setProductPhoto(ctx.db, adminId, id, jpeg({ w: 800, h: 600 }));
    expect(second.version).not.toBe(first.version);
    const logged = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logged.filter((l) => l.action === "product.photo_set").map((l) => l.metadata)).toEqual([
      expect.objectContaining({ width: 640, height: 480, replaced: false }),
      expect.objectContaining({ width: 800, height: 600, replaced: true }),
    ]);
    expect(await removeProductPhoto(ctx.db, adminId, id)).toBe(true);
    expect(await removeProductPhoto(ctx.db, adminId, id)).toBe(false);
    expect((await getCatalogItem(ctx.db, id))?.photo).toBeNull();
  });

  it("refuses too large, too big or broken photos, and photos of products that do not exist", async () => {
    const id = await product();
    await expect(setProductPhoto(ctx.db, adminId, id, new Uint8Array(MAX_PHOTO_BYTES + 1))).rejects.toBeInstanceOf(PhotoError);
    await expect(setProductPhoto(ctx.db, adminId, id, jpeg({ w: 4000, h: 3000 }))).rejects.toThrow(/2400 píxeles/);
    await expect(setProductPhoto(ctx.db, adminId, id, new TextEncoder().encode("<html>"))).rejects.toThrow(/JPG válida/);
    await expect(setProductPhoto(ctx.db, adminId, "00000000-0000-4000-8000-00000000abcd", jpeg())).rejects.toThrow(/no existe/);
  });

  it("goes away with the product", async () => {
    const id = await product();
    await setProductPhoto(ctx.db, adminId, id, jpeg());
    await deleteProduct(ctx.db, adminId, id);
    expect(await ctx.db.select().from(productPhotos).where(eq(productPhotos.productId, id))).toHaveLength(0);
  });
});

describe("de la administración al catálogo", () => {
  it("published appears, an edit shows at once, deactivated disappears with its sheet and its photo", async () => {
    const id = await product({ name: "Flor Ficticia Publicada", description: "Primera descripción ficticia." });
    await setProductPhoto(ctx.db, adminId, id, jpeg());
    expect((await listCatalog(ctx.db)).find((p) => p.id === id)).toMatchObject({ name: "Flor Ficticia Publicada", description: "Primera descripción ficticia.", photo: { width: 640, height: 480 } });

    await updateProduct(ctx.db, adminId, id, await values(id, { name: "Flor Ficticia Editada", description: "Descripción corregida." }));
    expect(await getCatalogItem(ctx.db, id)).toMatchObject({ name: "Flor Ficticia Editada", description: "Descripción corregida." });

    await updateProduct(ctx.db, adminId, id, await values(id, { status: "inactivo" }));
    expect((await listCatalog(ctx.db)).map((p) => p.id)).not.toContain(id);
    expect(await getCatalogItem(ctx.db, id)).toBeNull();
    expect(await readProductPhoto(ctx.db, id, { activeOnly: true })).toBeNull();
    // The admin still has it, and gets it back by reactivating it.
    expect(await readProductPhoto(ctx.db, id, { activeOnly: false })).not.toBeNull();
    await updateProduct(ctx.db, adminId, id, await values(id, { status: "activo" }));
    expect(await getCatalogItem(ctx.db, id)).not.toBeNull();
  });

  it("never carries prices, stock, lots or internal data", async () => {
    const [item] = await listCatalog(ctx.db);
    expect(Object.keys(item).sort()).toEqual(["chemotype", "cultivatedOn", "cultivation", "description", "id", "kind", "name", "photo", "sheet", "type", "variety"]);
    expect(Object.keys(item.sheet).sort()).toEqual(["analyzedOn", "cannabinoids", "cbd", "dropsPerMl", "harvestedOn", "hasCertificate", "labName", "thc", "unit"]);
  });
});

describe("rutas de la foto", () => {
  const get = (route: typeof memberPhoto, id: string, v = "") => route.GET(new Request(`http://localhost:3000/foto${v ? `?v=${v}` : ""}`), { params: Promise.resolve({ id }) } as never);

  it("members see an active product's photo; an inactive one, or nobody signed in off the demo, gets nothing", async () => {
    const id = await product();
    const meta = await setProductPhoto(ctx.db, adminId, id, jpeg());
    const res = await get(memberPhoto, id, meta.version);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toContain("immutable");
    // Without the current version the browser must not keep it.
    expect((await get(memberPhoto, id, "otra-version")).headers.get("cache-control")).toContain("no-store");

    await updateProduct(ctx.db, adminId, id, await values(id, { status: "inactivo" }));
    expect((await get(memberPhoto, id, meta.version)).status).toBe(404);
    expect((await get(adminPhoto as never, id)).status).toBe(200);

    vi.stubEnv("APP_ENV", "production");
    state.who = null;
    await updateProduct(ctx.db, adminId, id, await values(id, { status: "activo" }));
    expect((await get(memberPhoto, id, meta.version)).status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("only an admin, from this site, uploads or removes; the server checks the photo again", async () => {
    const id = await product();
    const put = (body: BodyInit, headers: Record<string, string> = { "content-type": "image/jpeg" }) =>
      adminPhoto.PUT(new Request("http://localhost:3000/admin/productos/x/foto", { method: "PUT", headers, body }), { params: Promise.resolve({ id }) } as never);
    expect((await put(jpeg())).status).toBe(200);
    expect(await put(jpeg(), { "content-type": "image/png" }).then((r) => r.status)).toBe(415);
    expect(await put(new TextEncoder().encode("<html>")).then(async (r) => [r.status, (await r.json()).error])).toEqual([400, "El archivo no es una foto JPG válida."]);
    expect(await put(jpeg(), { "content-type": "image/jpeg", origin: "https://otro-sitio.example" }).then((r) => r.status)).toBe(404);
    state.admin = null;
    await expect(put(jpeg({ w: 900, h: 700 }))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    state.admin = { id: adminId };
    const del = await adminPhoto.DELETE(new Request("http://localhost:3000/admin/productos/x/foto", { method: "DELETE" }), { params: Promise.resolve({ id }) } as never);
    expect(del.status).toBe(200);
    expect(await readProductPhoto(ctx.db, id, { activeOnly: false })).toBeNull();
  });
});
