CREATE TYPE "public"."admission_category" AS ENUM('activo', 'adherente', 'paciente');--> statement-breakpoint
CREATE TYPE "public"."admission_status" AS ENUM('recibida', 'comision', 'aprobada', 'rechazada');--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"pre_admission_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"status" "admission_status" DEFAULT 'recibida' NOT NULL,
	"first_names" text NOT NULL,
	"last_names" text NOT NULL,
	"address" text NOT NULL,
	"postal_code" text NOT NULL,
	"notification_email" text,
	"category" "admission_category" NOT NULL,
	"health_encrypted" text NOT NULL,
	"statute_version" text NOT NULL,
	"obligations_accepted_at" timestamp with time zone NOT NULL,
	"statute_accepted_at" timestamp with time zone NOT NULL,
	"fee_acknowledged_at" timestamp with time zone NOT NULL,
	"truthfulness_declared_at" timestamp with time zone NOT NULL,
	"changes_commitment_at" timestamp with time zone NOT NULL,
	"privacy_accepted_at" timestamp with time zone NOT NULL,
	"news_opt_in" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"status_changed_at" timestamp with time zone,
	"status_changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_until" timestamp with time zone,
	"retention_hold" boolean DEFAULT false NOT NULL,
	"retention_hold_reason" text,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "admissions_reference_unique" UNIQUE("reference"),
	CONSTRAINT "admissions_pre_admission_id_unique" UNIQUE("pre_admission_id")
);
--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_pre_admission_id_pre_admissions_id_fk" FOREIGN KEY ("pre_admission_id") REFERENCES "public"."pre_admissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_status_changed_by_user_id_fk" FOREIGN KEY ("status_changed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admissions_status_idx" ON "admissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admissions_submitted_at_idx" ON "admissions" USING btree ("submitted_at");