import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openPglite, type Database } from "@/server/db/client";
import { auditLogs, user } from "@/server/db/schema";
import {
  createProduct,
  deleteProduct,
  DuplicateProductError,
  getProduct,
  listProducts,
  listVarieties,
  productInput,
  ProductNotFoundError,
  renameVariety,
  UnknownVarietyError,
  updateProduct,
  varietyLabel,
} from "@/server/products";

let db: Database;
let adminId: string;
let g1: string;
let g2: string;
beforeAll(async () => {
  db = await openPglite();
  const [u] = await db.insert(user).values({ name: "Admin Ficticio", email: "admin.productos@example.com", role: "ADMIN", status: "active" }).returning({ id: user.id });
  adminId = u.id;
  const vs = await listVarieties(db);
  g1 = vs.find((v) => v.code === "G1")!.id;
  g2 = vs.find((v) => v.code === "G2")!.id;
});

const base = () => ({ name: "Aceite Ficticio", type: "aceite", varietyId: g1, cultivation: "exterior", chemotype: "2", cultivatedOn: "2026-04-15", description: "", status: "activo" });
const input = (patch: Record<string, unknown> = {}) => productInput.parse({ ...base(), ...patch });

describe("varieties", () => {
  it("come seeded as G1 to G4, without a definitive name", async () => {
    expect((await listVarieties(db)).map((v) => [v.code, v.name])).toEqual([
      ["G1", null],
      ["G2", null],
      ["G3", null],
      ["G4", null],
    ]);
  });

  it("get their definitive name later, audited; the code stays", async () => {
    await renameVariety(db, adminId, g2, "Variedad Ficticia");
    const v = (await listVarieties(db)).find((x) => x.id === g2)!;
    expect(varietyLabel(v)).toBe("G2 · Variedad Ficticia");
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.action, "variety.renamed"));
    expect(log.metadata).toEqual({ variety: "G2", name_before: null, name_after: "Variedad Ficticia" });
    await expect(renameVariety(db, adminId, "00000000-0000-4000-8000-000000000000", "X")).rejects.toBeInstanceOf(UnknownVarietyError);
  });
});

describe("product input", () => {
  it("trims and turns an empty description into null", () => {
    expect(input({ name: "  Flor Ficticia  " })).toMatchObject({ name: "Flor Ficticia", description: null });
  });

  it.each([
    ["a one-letter name", { name: "A" }],
    ["a type outside aceite, crema and inflorescencia", { type: "flor-seca" }],
    ["no variety", { varietyId: "" }],
    ["an unknown cultivation mode", { cultivation: "interior" }],
    ["a chemotype other than 1, 2 or 3", { chemotype: "4" }],
    ["no cultivation date", { cultivatedOn: "" }],
    ["an impossible cultivation date", { cultivatedOn: "2026-02-30" }],
    ["a cultivation date in the future", { cultivatedOn: "2999-01-01" }],
    ["an unknown status", { status: "borrado" }],
    ["a too long description", { description: "x".repeat(501) }],
  ])("rejects %s", (_, patch) => {
    expect(productInput.safeParse({ ...base(), ...patch }).success).toBe(false);
  });
});

describe("products", () => {
  it("creates a product with its variety, cultivation and chemotype, and audits who did it", async () => {
    const id = await createProduct(db, adminId, input({ name: "Inflorescencia Uno", type: "inflorescencia", cultivation: "controladas", chemotype: "3" }));
    expect(await getProduct(db, id)).toMatchObject({ type: "inflorescencia", varietyId: g1, cultivation: "controladas", chemotype: "3", cultivatedOn: "2026-04-15", createdBy: adminId });
    const listed = (await listProducts(db)).find((p) => p.id === id)!;
    expect(listed.variety).toEqual({ code: "G1", name: null });
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => [l.action, l.actorUserId])).toEqual([["product.created", adminId]]);
  });

  it("refuses a variety that does not exist", async () => {
    await expect(createProduct(db, adminId, input({ name: "Sin Variedad", varietyId: "00000000-0000-4000-8000-000000000000" }))).rejects.toBeInstanceOf(UnknownVarietyError);
  });

  it("refuses a second product with the same name, whatever the capitalisation", async () => {
    await createProduct(db, adminId, input({ name: "Crema Dos", type: "crema" }));
    await expect(createProduct(db, adminId, input({ name: "crema dos" }))).rejects.toBeInstanceOf(DuplicateProductError);
  });

  it("edits a product and records the previous and new values", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Tres" }));
    await updateProduct(db, adminId, id, input({ name: "Aceite Tres", varietyId: g2, chemotype: "1", cultivatedOn: "2026-05-02", status: "inactivo" }));
    expect(await getProduct(db, id)).toMatchObject({ varietyId: g2, chemotype: "1", cultivatedOn: "2026-05-02", status: "inactivo", updatedBy: adminId });
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    const updated = logs.find((l) => l.action === "product.updated")!;
    expect(updated.metadata).toEqual({
      varietyId_before: g1,
      varietyId_after: g2,
      chemotype_before: "2",
      chemotype_after: "1",
      cultivatedOn_before: "2026-04-15",
      cultivatedOn_after: "2026-05-02",
      status_before: "activo",
      status_after: "inactivo",
    });
  });

  it("does not audit an edit that changes nothing", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Cuatro" }));
    await updateProduct(db, adminId, id, input({ name: "Aceite Cuatro" }));
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => l.action)).toEqual(["product.created"]);
  });

  it("cannot rename onto another product's name, nor edit one that does not exist", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Cinco" }));
    await expect(updateProduct(db, adminId, id, input({ name: "INFLORESCENCIA UNO" }))).rejects.toBeInstanceOf(DuplicateProductError);
    await expect(updateProduct(db, adminId, "00000000-0000-4000-8000-000000000000", input())).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(await getProduct(db, "no-es-un-id")).toBeNull();
  });

  it("deletes a product and keeps what it was in the audit log", async () => {
    const id = await createProduct(db, adminId, input({ name: "Para Borrar", type: "crema" }));
    await deleteProduct(db, adminId, id);
    expect(await getProduct(db, id)).toBeNull();
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.action, "product.deleted"));
    expect(log).toMatchObject({ actorUserId: adminId, entityId: id });
    expect(log.metadata).toMatchObject({ name: "Para Borrar", type: "crema", cultivatedOn: "2026-04-15" });
    await expect(deleteProduct(db, adminId, id)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("lists active products first, then by name", async () => {
    const names = (await listProducts(db)).map((p) => `${p.status}:${p.name}`);
    expect(names.indexOf("inactivo:Aceite Tres")).toBeGreaterThan(names.indexOf("activo:Inflorescencia Uno"));
  });
});
