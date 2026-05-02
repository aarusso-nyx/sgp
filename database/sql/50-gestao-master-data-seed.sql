-- Idempotent baseline data for the first persistent Gestao master-data slice.
-- Run after Prisma has created the `bank` and `job_position` tables.

INSERT INTO hr.bank (id, tenant_id, code, name, agency_digit, blocked, status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000100'::uuid, '001', 'Banco do Brasil', '9', false, 'ACTIVE'::"RecordStatus"),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000100'::uuid, '104', 'Caixa Economica Federal', '0', false, 'ACTIVE'::"RecordStatus")
ON CONFLICT (tenant_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  agency_digit = EXCLUDED.agency_digit,
  blocked = EXCLUDED.blocked,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO hr.job_position (id, tenant_id, code, name, description, status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000100'::uuid, 'ANL', 'Analista', 'Cargo administrativo observado.', 'ACTIVE'::"RecordStatus"),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000100'::uuid, 'TEC', 'Tecnico', 'Cargo operacional observado.', 'ACTIVE'::"RecordStatus")
ON CONFLICT (tenant_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();
