CREATE TYPE "public"."fee_reminder_frequency" AS ENUM('mensual', 'trimestral');--> statement-breakpoint
CREATE TYPE "public"."fee_reminder_status" AS ENUM('pendiente', 'enviando', 'enviado', 'fallido', 'omitido');--> statement-breakpoint
CREATE TABLE "fee_reminder_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"member_id" uuid NOT NULL,
	"email_masked" text,
	"status" "fee_reminder_status" DEFAULT 'pendiente' NOT NULL,
	"detail" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_reminder_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"frequency" "fee_reminder_frequency" DEFAULT 'trimestral' NOT NULL,
	"day_of_month" integer DEFAULT 10 NOT NULL,
	"hour" integer DEFAULT 10 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_reminder_settings_ranges" CHECK ("fee_reminder_settings"."id" = 'default' and "fee_reminder_settings"."day_of_month" between 1 and 28 and "fee_reminder_settings"."hour" between 0 and 23)
);
--> statement-breakpoint
ALTER TABLE "fee_reminder_sends" ADD CONSTRAINT "fee_reminder_sends_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_reminder_settings" ADD CONSTRAINT "fee_reminder_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fee_reminder_sends_period_member" ON "fee_reminder_sends" USING btree ("period","member_id");--> statement-breakpoint
CREATE INDEX "fee_reminder_sends_period_status_idx" ON "fee_reminder_sends" USING btree ("period","status");