\set ON_ERROR_STOP on

-- Non-destructive replay for R2-200/R2-201/R2-202.
-- This script does not move existing rows, drop tables, detach partitions, or
-- choose retention windows. It only verifies that the canonical hot tables are
-- already partitioned and then creates current/future partitions.

DO $$
DECLARE
  v_table regclass;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.audit_event'::regclass,
    'payroll.payroll_financial_record'::regclass,
    'ponto.time_record'::regclass
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class
      WHERE oid = v_table
        AND relkind = 'p'
    ) THEN
      RAISE EXCEPTION '% is not partitioned. Destructive or row-moving conversion is owner-decision gated and is intentionally not performed by this replay.', v_table;
    END IF;
  END LOOP;
END
$$;

SELECT public.sgp_create_audit_event_partitions();
SELECT payroll.sgp_create_payroll_financial_record_partitions();
SELECT ponto.sgp_create_time_record_partitions();

\ir ../checks/hot-table-partitions.sql
