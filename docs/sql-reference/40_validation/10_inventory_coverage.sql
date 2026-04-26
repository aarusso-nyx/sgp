-- Inventory-driven structural validation for the PostgreSQL target.
DO $$
DECLARE
  v_tables integer;
  v_columns integer;
  v_pk integer;
  v_uq integer;
  v_fk integer;
  v_indexes integer;
  v_identity integer;
  v_defaults integer;
  v_views integer;
  v_triggers integer;
BEGIN
  SELECT count(*)
  INTO v_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'dbo'
    AND c.relkind = 'r';

  IF v_tables <> 151 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 151 tables in schema dbo, found %', v_tables;
  END IF;

  SELECT count(*)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'dbo';

  IF v_columns <> 1746 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 1746 columns in schema dbo, found %', v_columns;
  END IF;

  SELECT count(*)
  INTO v_pk
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE n.nspname = 'dbo'
    AND con.contype = 'p';

  IF v_pk <> 143 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 143 primary keys, found %', v_pk;
  END IF;

  SELECT count(*)
  INTO v_uq
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE n.nspname = 'dbo'
    AND con.contype = 'u';

  IF v_uq <> 1 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 1 unique constraint, found %', v_uq;
  END IF;

  SELECT count(*)
  INTO v_fk
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE n.nspname = 'dbo'
    AND con.contype = 'f';

  IF v_fk <> 255 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 255 foreign keys, found %', v_fk;
  END IF;

  SELECT count(*)
  INTO v_indexes
  FROM pg_indexes
  WHERE schemaname = 'dbo';

  IF v_indexes <> 179 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 179 total indexes, found %', v_indexes;
  END IF;

  SELECT count(*)
  INTO v_identity
  FROM information_schema.columns
  WHERE table_schema = 'dbo'
    AND is_identity = 'YES';

  IF v_identity <> 126 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 126 identity columns, found %', v_identity;
  END IF;

  SELECT count(*)
  INTO v_defaults
  FROM information_schema.columns
  WHERE table_schema = 'dbo'
    AND is_identity = 'NO'
    AND column_default IS NOT NULL;

  IF v_defaults <> 7 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 7 non-identity defaults, found %', v_defaults;
  END IF;

  SELECT count(*)
  INTO v_views
  FROM pg_views
  WHERE schemaname = 'dbo';

  IF v_views <> 0 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 0 views in dbo, found %', v_views;
  END IF;

  SELECT count(*)
  INTO v_triggers
  FROM information_schema.triggers
  WHERE trigger_schema = 'dbo';

  IF v_triggers <> 0 THEN
    RAISE EXCEPTION 'Inventory coverage failure: expected 0 triggers in dbo, found %', v_triggers;
  END IF;
END
$$;
