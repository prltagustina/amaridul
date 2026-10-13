CREATE TYPE "public"."pre_admission_status" AS ENUM('recibida', 'en-revision', 'invitada', 'cerrada');--> statement-breakpoint
CREATE TABLE "pre_admission_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_admission_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_admissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"status" "pre_admission_status" DEFAULT 'recibida' NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"province" text NOT NULL,
	"locality" text NOT NULL,
	"wants_to_participate" boolean NOT NULL,
	"motivation_encrypted" text NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"closed_reason" text,
	"status_changed_at" timestamp with time zone,
	"status_changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_until" timestamp with time zone,
	"retention_hold" boolean DEFAULT false NOT NULL,
	"retention_hold_reason" text,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "pre_admissions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "pre_admission_notes" ADD CONSTRAINT "pre_admission_notes_pre_admission_id_pre_admissions_id_fk" FOREIGN KEY ("pre_admission_id") REFERENCES "public"."pre_admissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_admission_notes" ADD CONSTRAINT "pre_admission_notes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_admissions" ADD CONSTRAINT "pre_admissions_status_changed_by_user_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pre_admission_notes_pre_admission_idx" ON "pre_admission_notes" USING btree ("pre_admission_id");--> statement-breakpoint
CREATE INDEX "pre_admissions_status_idx" ON "pre_admissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pre_admissions_created_at_idx" ON "pre_admissions" USING btree ("created_at");