import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openPglite, type Database } from "@/server/db/client";
import { auditLogs, user } from "@/server/db/schema";
import { createProduct, DuplicateProductError, getProduct, listProducts, productInput, ProductNotFoundError, updateProduct } from "@/server/products";

let db: Database;
let adminId: string;
beforeAll(async () => {
  db = await openPglite();
  const [u] = await db.insert(user).values({ name: "Admin Ficticio", email: "admin.productos@example.com", role: "ADMIN", status: "active" }).returning({ id: user.id });
  adminId = u.id;
});

const input = (patch: Record<string, unknown> = {}) => productInput.parse({ name: "Aceite Ficticio", type: "aceite", description: "", status: "activo", ...patch });

describe("product input", () => {
  it("trims and turns an empty description into null", () => {
    expect(input({ name: "  Flor Ficticia  " })).toMatchObject({ name: "Flor Ficticia", description: null });
  });

  it.each([
    ["a one-letter name", { name: "A" }],
    ["an unknown type", { type: "tintura" }],
    ["an unknown status", { status: "borrado" }],
    ["a too long description", { description: "x".repeat(501) }],
  ])("rejects %s", (_, patch) => {
    expect(productInput.safeParse({ name: "Aceite", type: "aceite", description: "", status: "activo", ...patch }).success).toBe(false);
  });
});

describe("products", () => {
  it("creates a product and audits who did it", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Uno" }));
    const p = await getProduct(db, id);
    expect(p).toMatchObject({ name: "Aceite Uno", type: "aceite", status: "activo", createdBy: adminId });
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => [l.action, l.actorUserId])).toEqual([["product.created", adminId]]);
  });

  it("refuses a second product with the same name, whatever the capitalisation", async () => {
    await createProduct(db, adminId, input({ name: "Crema Dos", type: "crema-topica" }));
    await expect(createProduct(db, adminId, input({ name: "crema dos" }))).rejects.toBeInstanceOf(DuplicateProductError);
  });

  it("edits a product and records the previous and new values", async () => {
    const id = await createProduct(db, adminId, input({ name: "Flor Tres", type: "flor-seca" }));
    await updateProduct(db, adminId, id, input({ name: "Flor Tres", type: "flor-seca", description: "Cosecha de otoño", status: "inactivo" }));
    expect(await getProduct(db, id)).toMatchObject({ description: "Cosecha de otoño", status: "inactivo", updatedBy: adminId });
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.action, "product.updated"));
    expect(log.metadata).toEqual({ description_before: null, description_after: "Cosecha de otoño", status_before: "activo", status_after: "inactivo" });
  });

  it("does not audit an edit that changes nothing", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Cuatro" }));
    await updateProduct(db, adminId, id, input({ name: "Aceite Cuatro" }));
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => l.action)).toEqual(["product.created"]);
  });

  it("cannot rename onto another product's name, nor edit one that does not exist", async () => {
    const id = await createProduct(db, adminId, input({ name: "Aceite Cinco" }));
    await expect(updateProduct(db, adminId, id, input({ name: "ACEITE UNO" }))).rejects.toBeInstanceOf(DuplicateProductError);
    await expect(updateProduct(db, adminId, "00000000-0000-4000-8000-000000000000", input())).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(await getProduct(db, "no-es-un-id")).toBeNull();
  });

  it("lists active products first, then by name", async () => {
    const names = (await listProducts(db)).map((p) => `${p.status}:${p.name}`);
    expect(names.indexOf("inactivo:Flor Tres")).toBeGreaterThan(names.indexOf("activo:Aceite Uno"));
  });
});
