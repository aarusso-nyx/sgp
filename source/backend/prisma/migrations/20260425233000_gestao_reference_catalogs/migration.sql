-- Gestão foundational reference catalogs canonical runtime table.
-- tenant coverage markers: ('hr', 'reference_catalog_entry')

CREATE TABLE "hr"."reference_catalog_entry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "catalog_key" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reference_catalog_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_reference_catalog_entry_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE UNIQUE INDEX "reference_catalog_entry_tenant_catalog_code_key"
  ON "hr"."reference_catalog_entry"("tenant_id", "catalog_key", "code");
CREATE INDEX "reference_catalog_entry_tenant_catalog_status_idx"
  ON "hr"."reference_catalog_entry"("tenant_id", "catalog_key", "status");
