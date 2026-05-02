-- Fails when a tenant-scoped base table does not have forced RLS enabled.

WITH tenant_scoped_tables AS (
  SELECT
    table_schema,
    table_name
  FROM information_schema.columns
  WHERE column_name = 'tenant_id'
    AND table_schema IN ('public', 'hr', 'payroll', 'payroll_calc', 'payment', 'esocial', 'saude', 'ponto')
  GROUP BY table_schema, table_name
),
missing_rls AS (
  SELECT
    table_schema,
    table_name
  FROM tenant_scoped_tables scoped
  JOIN pg_class class_row
    ON class_row.oid = format('%I.%I', scoped.table_schema, scoped.table_name)::regclass
  WHERE class_row.relkind = 'r'
    AND NOT (class_row.relrowsecurity AND class_row.relforcerowsecurity)
)
SELECT *
FROM missing_rls
ORDER BY table_schema, table_name;

DO $$
DECLARE
  missing_count integer;
BEGIN
  WITH tenant_scoped_tables AS (
    SELECT
      table_schema,
      table_name
    FROM information_schema.columns
    WHERE column_name = 'tenant_id'
      AND table_schema IN ('public', 'hr', 'payroll', 'payroll_calc', 'payment', 'esocial', 'saude', 'ponto')
    GROUP BY table_schema, table_name
  ),
  missing_rls AS (
    SELECT
      table_schema,
      table_name
    FROM tenant_scoped_tables scoped
    JOIN pg_class class_row
      ON class_row.oid = format('%I.%I', scoped.table_schema, scoped.table_name)::regclass
    WHERE class_row.relkind = 'r'
      AND NOT (class_row.relrowsecurity AND class_row.relforcerowsecurity)
  )
  SELECT count(*) INTO missing_count FROM missing_rls;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Tenant-scoped tables without forced RLS: %', missing_count;
  END IF;
END
$$;
