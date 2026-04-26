-- Relational integrity smoke checks for the translated PostgreSQL schema.
DO $$
DECLARE
  v_unvalidated_fk integer;
  v_sysdiagram_routines integer;
  v_sysdiagram_table integer;
BEGIN
  SELECT count(*)
  INTO v_unvalidated_fk
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE n.nspname = 'dbo'
    AND con.contype = 'f'
    AND con.convalidated = false;

  IF v_unvalidated_fk <> 0 THEN
    RAISE EXCEPTION 'Relational smoke failure: found % unvalidated foreign keys in dbo', v_unvalidated_fk;
  END IF;

  SELECT count(*)
  INTO v_sysdiagram_routines
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'dbo'
    AND p.proname IN (
      'fn_diagramobjects',
      'sp_alterdiagram',
      'sp_creatediagram',
      'sp_dropdiagram',
      'sp_helpdiagramdefinition',
      'sp_helpdiagrams',
      'sp_renamediagram',
      'sp_upgraddiagrams'
    );

  IF v_sysdiagram_routines <> 0 THEN
    RAISE EXCEPTION 'Relational smoke failure: expected sysdiagrams support routines to remain absent and documented as a gap, found %', v_sysdiagram_routines;
  END IF;

  SELECT count(*)
  INTO v_sysdiagram_table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'dbo'
    AND c.relname = 'sysdiagrams'
    AND c.relkind = 'r';

  IF v_sysdiagram_table <> 1 THEN
    RAISE EXCEPTION 'Relational smoke failure: expected dbo.sysdiagrams backing table to exist for data fidelity, found % copies', v_sysdiagram_table;
  END IF;
END
$$;
