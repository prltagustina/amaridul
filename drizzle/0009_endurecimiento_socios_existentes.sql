CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "existing_member_requests" ADD COLUMN "privacy_notice_sha256" text;--> statement-breakpoint
CREATE UNIQUE INDEX "members_member_number_ci_uq" ON "members" USING btree (lower("member_number"));--> statement-breakpoint
CREATE UNIQUE INDEX "existing_member_requests_open_dni_uq" ON "existing_member_requests" USING btree ("dni_lookup") WHERE "existing_member_requests"."status" in ('pending_verification', 'needs_review');