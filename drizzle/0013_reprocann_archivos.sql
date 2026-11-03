CREATE TABLE "reprocann_document_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"file_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reprocann_document_files_file_key_unique" UNIQUE("file_key"),
	CONSTRAINT "reprocann_document_files_check" CHECK ("reprocann_document_files"."page" >= 1 and "reprocann_document_files"."content_type" in ('application/pdf', 'image/jpeg', 'image/png') and "reprocann_document_files"."size" between 1 and 10485760 and "reprocann_document_files"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD COLUMN "member_message_encrypted" text;--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD COLUMN "replaced_by" uuid;--> statement-breakpoint
ALTER TABLE "reprocann_document_files" ADD CONSTRAINT "reprocann_document_files_document_id_reprocann_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."reprocann_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reprocann_document_files" ADD CONSTRAINT "reprocann_document_files_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reprocann_document_files_page_idx" ON "reprocann_document_files" USING btree ("document_id","page");--> statement-breakpoint
CREATE INDEX "reprocann_document_files_sha256_idx" ON "reprocann_document_files" USING btree ("sha256");--> statement-breakpoint
ALTER TABLE "reprocann_documents" ADD CONSTRAINT "reprocann_documents_replaced_by_reprocann_documents_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."reprocann_documents"("id") ON DELETE restrict ON UPDATE no action;