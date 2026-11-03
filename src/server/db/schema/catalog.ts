// Catalogue of products the association makes. Lots (traceability) will hang from here in Etapa 2.
import { check, customType, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

const tz = { withTimezone: true } as const;

export const productType = pgEnum("product_type", ["aceite", "crema", "inflorescencia"]);
export const productStatus = pgEnum("product_status", ["activo", "inactivo"]);
export const cultivationMode = pgEnum("cultivation_mode", ["exterior", "controladas"]);
export const chemotype = pgEnum("chemotype", ["1", "2", "3"]);

/**
 * The association works with four varieties, G1 to G4 (seeded by the migration). Their definitive
 * names are not settled yet: the admin fills `name` later, the code stays.
 */
export const varieties = pgTable("varieties", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name"),
  updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: productType("type").notNull(),
    // Required by the form; nullable so products created before these fields existed stay valid.
    varietyId: uuid("variety_id").references(() => varieties.id, { onDelete: "restrict" }),
    cultivation: cultivationMode("cultivation"),
    chemotype: chemotype("chemotype"),
    cultivatedOn: date("cultivated_on"),
    description: text("description"),
    status: productStatus("status").notNull().default("activo"),
    createdBy: uuid("created_by").references(() => user.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  // Two products cannot share a name, whatever its capitalisation.
  (t) => [uniqueIndex("products_name_unique").on(sql`lower(${t.name})`), index("products_status_idx").on(t.status)],
);

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => new Uint8Array(v),
});

/**
 * The photo members see in the catalog, one per product. It lives in the database, apart from the
 * private document storage: a JPEG the admin's browser re-encodes to at most 1600 px, checked again
 * and stripped of camera and location data here. Removed with the product.
 */
export const productPhotos = pgTable(
  "product_photos",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    bytes: bytea("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sha256: text("sha256").notNull(),
    updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [check("product_photos_size", sql`octet_length(${t.bytes}) <= 2097152 and ${t.width} > 0 and ${t.height} > 0`)],
);
