CREATE TYPE "public"."composition_unit" AS ENUM('porcentaje', 'mg_ml', 'mg_g');--> statement-breakpoint
CREATE TABLE "product_certificates" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_certificates_size" CHECK (octet_length("product_certificates"."bytes") between 1 and 8388608 and "product_certificates"."size" = octet_length("product_certificates"."bytes"))
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "harvested_on" date;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lab_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "analyzed_on" date;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "composition_unit" "composition_unit";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thc" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cbd" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drops_per_ml" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cannabinoids" jsonb;--> statement-breakpoint
ALTER TABLE "product_certificates" ADD CONSTRAINT "product_certificates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certificates" ADD CONSTRAINT "product_certificates_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;