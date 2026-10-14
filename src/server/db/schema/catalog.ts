// Catalogue of products the association makes. Lots (traceability) will hang from here in Etapa 2.
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

const tz = { withTimezone: true } as const;

export const productType = pgEnum("product_type", ["aceite", "flor-seca", "crema-topica", "otro"]);
export const productStatus = pgEnum("product_status", ["activo", "inactivo"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: productType("type").notNull(),
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
