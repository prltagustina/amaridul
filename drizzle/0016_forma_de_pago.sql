CREATE TYPE "public"."fee_plan" AS ENUM('mensual', 'trimestral', 'semestral');--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD COLUMN "plan" "fee_plan";--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD COLUMN "plan_chosen_by" uuid;--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD COLUMN "plan_chosen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "member_fee_settings" ADD CONSTRAINT "member_fee_settings_plan_chosen_by_user_id_fk" FOREIGN KEY ("plan_chosen_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;