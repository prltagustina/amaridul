// Catalogue of products the association makes. Lots (traceability) will hang from here in Etapa 2.
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
