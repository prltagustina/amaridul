CREATE TYPE "public"."member_origin" AS ENUM('admission', 'legacy');--> statement-breakpoint
CREATE TYPE "public"."existing_member_request_source" AS ENUM('sumate', 'preadmission');--> statement-breakpoint
CREATE TYPE "public"."existing_member_request_status" AS ENUM('awaiting_data', 'pending_verification', 'needs_review', 'matched', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reprocann_document_kind" AS ENUM('credencial', 'certificado', 'constancia_vinculacion', 'otro');--> statement-breakpoint
CREATE TYPE "public"."reprocann_info_source" AS ENUM('en_poder_de_la_asociacion', 'aportado_por_socio', 'informado_por_equipo_medico', 'verificacion_administrativa');--> statement-breakpoint
CREATE TYPE "public"."reprocann_linkage_status" AS ENUM('pendiente', 'verificada');--> statement-breakpoint
CREATE TYPE "public"."reprocann_management_source" AS ENUM('self_or_external', 'association');--> statement-breakpoint
CREATE TYPE "public"."reprocann_permit_status" AS ENUM('sin_permiso', 'iniciado_informado', 'pendiente_aprobacion', 'aprobado', 'vencido', 'renovacion');--> statement-breakpoint
CREATE TYPE "public"."reprocann_review_status" AS ENUM('pendiente', 'observada', 'verificada');--> statement-breakpoint
ALTER TYPE "public"."pre_admission_status" ADD VALUE 'derivada';--> statement-breakpoint
CREATE TABLE "existing_member_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"status" "existing_member_request_status" DEFAULT 'pending_verification' NOT NULL,
	"source" "existing_member_request_source" DEFAULT 'sumate' NOT NULL,
	"pre_admission_id" uuid,
	"full_name" text NOT NULL,
	"first_names" text,
	"last_names" text,
	"email" text NOT NULL,
	"dni_lookup" text,
	"dni_lookup_key_version" text,
	"dni_encrypted" text,
	"birth_date" date,
	"address" text,
	"locality" text,
	"province" text,
	"postal_code" text,
	"declared_member_number" text,
	"privacy_accepted_at" timestamp with time zone,
	"data_confirmed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"admin_notes" text,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"linked_member_id" uuid,
	"linked_person_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"retention_until" timestamp with time zone,
	"retention_hold" boolean DEFAULT false NOT NULL,
	"retention_hold_reason" text,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "existing_member_requests_reference_unique" UNIQUE("reference"),
	CONSTRAINT "existing_member_requests_pre_admission_id_unique" UNIQUE("pre_admission_id")
);
--> statement-breakpoint
CREATE TABLE "reprocann_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"permit_status" "reprocann_permit_status" DEFAULT 'sin_permiso' NOT NULL,
	"management_source" "reprocann_management_source" DEFAULT 'self_or_external' NOT NULL,
	"responsible_name" text,
	"linkage_status" "reprocann_linkage_status" DEFAULT 'pendiente' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reprocann_cases_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "reprocann_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"kind" "reprocann_document_kind" NOT NULL,
	"permit_identifier_encrypted" text,
	"issued_on" date,
	"expires_on" date,
	"source" "reprocann_info_source" NOT NULL,
	"review_status" "reprocann_review_status" DEFAULT 'pendiente' NOT NULL,
	"verified_on" date,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"notes_encrypted" text,
	"file_key" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "admission_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "since" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "origin" "member_origin" DEFAULT 'admission' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "minutes_reference" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "digital_onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "existing_member_requests" ADD CONSTRAINT "existing_member_requests_pre_admission_id_pre_admissions_id_fk" FOREIGN KEY ("pre_admission_id") REFERENCES "public"."pre_admissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existing_member_requests" ADD CONSTRAINT "existing_member_requests_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existing_member_requests" ADD CONSTRAINT "existing_member_requests_linked_member_id_members_id_fk" FOREIGN KEY ("linked_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existing_member_requests" ADD CONSTRAINT "existing_member_requests_linked_person_id_persons_id_fk" FOREIGN KEY ("linked_person_id") REFERENCES "public"."persons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD CONSTRAINT "reprocann_cases_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD CONSTRAINT "reprocann_cases_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_cases" ADD CONSTRAINT "reprocann_cases_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD CONSTRAINT "reprocann_documents_case_id_reprocann_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."reprocann_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD CONSTRAINT "reprocann_documents_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD CONSTRAINT "reprocann_documents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "existing_member_requests_status_idx" ON "existing_member_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "existing_member_requests_dni_idx" ON "existing_member_requests" USING btree ("dni_lookup");--> statement-breakpoint
CREATE INDEX "reprocann_documents_case_idx" ON "reprocann_documents" USING btree ("case_id");