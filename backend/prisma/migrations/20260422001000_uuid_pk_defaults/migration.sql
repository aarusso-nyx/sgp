-- Ensure UUID PK `id` columns have DB defaults for raw SQL inserts.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN information_schema.table_constraints tc
      ON tc.table_schema = c.table_schema
     AND tc.table_name = c.table_name
     AND tc.constraint_type = 'PRIMARY KEY'
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_schema = tc.constraint_schema
     AND kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
     AND kcu.table_name = tc.table_name
     AND kcu.column_name = c.column_name
    WHERE c.table_schema IN ('public', 'hr', 'payroll')
      AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND c.column_default IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT gen_random_uuid()',
      rec.table_schema,
      rec.table_name,
      rec.column_name
    );
  END LOOP;
END
$$;

