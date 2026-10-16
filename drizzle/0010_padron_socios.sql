CREATE TABLE "import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" text NOT NULL,
	"rows" integer NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_fee_settings" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"fee_enrollment_date" date,
	"payment_method" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"author_id" uuid,
	"source" text DEFAULT 'admin' NOT NULL,
	"import_run_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"number" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaced_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "member_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "first_names" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "last_names" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "room" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "import_run_id" uuid;--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD CONSTRAINT "member_fee_settings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD CONSTRAINT "member_fee_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_numbers" ADD CONSTRAINT "member_numbers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_notes_member_idx" ON "member_notes" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_numbers_number_ci_uq" ON "member_numbers" USING btree (lower("number"));--> statement-breakpoint
CREATE INDEX "member_numbers_member_idx" ON "member_numbers" USING btree ("member_id");--> statement-breakpoint
-- Backfill 1: every number in use enters the history, so it can never be given to someone else.
INSERT INTO "member_numbers" ("member_id", "number", "assigned_at")
SELECT "id", "member_number", "created_at" FROM "members" WHERE "member_number" IS NOT NULL;--> statement-breakpoint
-- Backfill 2: names and address move to their owner, the person (copied from the admission; nothing is deleted).
UPDATE "persons" p SET "first_names" = a."first_names", "last_names" = a."last_names", "address" = a."address", "postal_code" = a."postal_code"
FROM "members" m JOIN "admissions" a ON a."id" = m."admission_id"
WHERE m."person_id" = p."id" AND p."first_names" IS NULL;--> statement-breakpoint
-- Same for existing members, from their linked legajo update.
UPDATE "persons" p SET "first_names" = COALESCE(p."first_names", r."first_names"), "last_names" = COALESCE(p."last_names", r."last_names"),
  "address" = COALESCE(p."address", r."address"), "postal_code" = COALESCE(p."postal_code", r."postal_code")
FROM "existing_member_requests" r
WHERE r."linked_person_id" = p."id" AND r."status" IN ('matched', 'completed');--> statement-breakpoint
-- Backfill 3: persons.email is the canonical contact email. It is only completed, never replaced:
-- empty → takes the notification email declared in the admission; equal → nothing; different →
-- persons.email is kept and the case is left for manual review. admissions.notification_email is
-- not touched (the historical value stays where it was).
UPDATE "persons" p SET "email" = lower(trim(a."notification_email"))
FROM "members" m JOIN "admissions" a ON a."id" = m."admission_id"
WHERE m."person_id" = p."id" AND (p."email" IS NULL OR trim(p."email") = '')
  AND a."notification_email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
