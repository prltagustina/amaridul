ALTER TABLE "reprocann_cases" ADD COLUMN "link_code_encrypted" text;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD COLUMN "link_code_sent_by" uuid;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD COLUMN "link_code_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD CONSTRAINT "reprocann_cases_link_code_sent_by_user_id_fk" FOREIGN KEY ("link_code_sent_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;