-- R4-70 audit inventory closure.
--
-- This finalizer intentionally runs after 91-reference-data.sql. Some static
-- reference catalogs are loaded with INSERT ... VALUES and no column list; the
-- audit timestamp columns must be added after those reference rows are seeded.
--
-- Reference/static catalogs use the shared generic audit trigger below instead
-- of domain-specific business audit functions. That includes PostGIS spatial
-- references, public permission/menu/report catalogs, eSocial/fiscal code
-- catalogs, HR/payroll lookup catalogs, and TCE layout catalogs.
--
-- Immutable audit-event partitions keep occurred_at as the event-time authority.
-- The created_at/updated_at columns are added only to satisfy the common live
-- inventory contract across base tables; audit_event immutability remains
-- enforced by public.sgp_audit_event_immutable().

DO $$
DECLARE
  v_table record;
  v_added_updated_at boolean;
BEGIN
  FOR v_table IN
    SELECT
      class.oid AS table_oid,
      namespace.nspname AS schema_name,
      class.relname AS table_name
    FROM pg_class class
    JOIN pg_namespace namespace
      ON namespace.oid = class.relnamespace
    WHERE class.relkind IN ('r', 'p')
      AND namespace.nspname <> 'information_schema'
      AND namespace.nspname NOT LIKE 'pg_%'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_inherits inherits
        WHERE inherits.inhrelid = class.oid
      )
    ORDER BY namespace.nspname, class.relname
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute attribute
      WHERE attribute.attrelid = v_table.table_oid
        AND attribute.attname = 'created_at'
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now()',
        v_table.schema_name,
        v_table.table_name
      );
    END IF;

    v_added_updated_at := NOT EXISTS (
      SELECT 1
      FROM pg_attribute attribute
      WHERE attribute.attrelid = v_table.table_oid
        AND attribute.attname = 'updated_at'
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    );

    IF v_added_updated_at THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now()',
        v_table.schema_name,
        v_table.table_name
      );
    END IF;

    IF v_added_updated_at AND NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger
      WHERE trigger.tgrelid = v_table.table_oid
        AND trigger.tgname = 'sgp_r4_70_touch_updated_at'
        AND NOT trigger.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER sgp_r4_70_touch_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.sgp_r4_70_touch_updated_at()',
        v_table.schema_name,
        v_table.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger
      WHERE trigger.tgrelid = v_table.table_oid
        AND trigger.tgname ILIKE '%audit%'
        AND NOT trigger.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER sgp_r4_70_audit_event AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.sgp_r4_70_generic_audit_event()',
        v_table.schema_name,
        v_table.table_name
      );
    END IF;
  END LOOP;
END
$$;
