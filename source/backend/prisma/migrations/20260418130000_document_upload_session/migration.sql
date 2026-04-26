-- Document upload staging table for presigned S3 workflow.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentUploadStatus') THEN
    CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING', 'REGISTERED', 'EXPIRED', 'ABORTED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "document_upload_session" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "requested_by_sub" TEXT,
  "requested_by_login" TEXT,
  "request_id" TEXT,
  "owner_type" TEXT NOT NULL,
  "owner_id" TEXT,
  "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER,
  "storage_bucket" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "required_headers" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "DocumentUploadStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "registered_attachment_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_upload_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_upload_session_document_id_key"
  ON "document_upload_session"("document_id");
CREATE INDEX IF NOT EXISTS "document_upload_session_status_expires_at_idx"
  ON "document_upload_session"("status", "expires_at");
CREATE INDEX IF NOT EXISTS "document_upload_session_requested_by_sub_created_at_idx"
  ON "document_upload_session"("requested_by_sub", "created_at");
CREATE INDEX IF NOT EXISTS "document_upload_session_owner_type_owner_id_idx"
  ON "document_upload_session"("owner_type", "owner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_upload_session_registered_attachment_id_fkey'
  ) THEN
    ALTER TABLE "document_upload_session"
      ADD CONSTRAINT "document_upload_session_registered_attachment_id_fkey"
      FOREIGN KEY ("registered_attachment_id")
      REFERENCES "document_attachment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

