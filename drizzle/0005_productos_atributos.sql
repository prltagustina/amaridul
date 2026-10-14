CREATE TYPE "public"."chemotype" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."cultivation_mode" AS ENUM('exterior', 'controladas');--> statement-breakpoint
CREATE TABLE "varieties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "varieties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
-- Products created with the first set of types keep their meaning.
UPDATE "products" SET "type" = 'inflorescencia' WHERE "type" = 'flor-seca';--> statement-breakpoint
UPDATE "products" SET "type" = 'crema' WHERE "type" = 'crema-topica';--> statement-breakpoint
DROP TYPE "public"."product_type";--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('aceite', 'crema', 'inflorescencia');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "type" SET DATA TYPE "public"."product_type" USING "type"::"public"."product_type";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variety_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cultivation" "cultivation_mode";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "chemotype" "chemotype";--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_variety_id_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."varieties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- The four varieties; their definitive names are set later from the admin.
INSERT INTO "varieties" ("code") VALUES ('G1'), ('G2'), ('G3'), ('G4') ON CONFLICT ("code") DO NOTHING;
