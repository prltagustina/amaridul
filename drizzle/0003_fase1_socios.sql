CREATE TYPE "public"."admission_decision" AS ENUM('aprobada', 'rechazada', 'diferida');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('activo', 'suspendido', 'baja');--> statement-breakpoint
CREATE TABLE "admission_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admission_id" uuid NOT NULL,
	"decision" "admission_decision" NOT NULL,
	"meeting_date" date NOT NULL,
	"minutes" text NOT NULL,
	"approved_category" "admission_category",
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_number" text NOT NULL,
	"person_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"admission_id" uuid NOT NULL,
	"category" "admission_category" NOT NULL,
	"since" date NOT NULL,
	"status" "member_status" DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_until" timestamp with time zone,
	"retention_hold" boolean DEFAULT false NOT NULL,
	"retention_hold_reason" text,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "members_member_number_unique" UNIQUE("member_number"),
	CONSTRAINT "members_person_id_unique" UNIQUE("person_id"),
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "members_admission_id_unique" UNIQUE("admission_id")
);
--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_decisions" ADD CONSTRAINT "admission_decisions_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_decisions_admission_idx" ON "admission_decisions" USING btree ("admission_id");