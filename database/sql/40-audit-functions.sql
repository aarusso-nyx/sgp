CREATE FUNCTION public.sgp_r4_70_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.sgp_r4_70_generic_audit_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_action text;
  v_request_id text;
  v_resource_id text;
  v_row jsonb;
  v_table_name text := format('%I.%I', TG_TABLE_SCHEMA, TG_TABLE_NAME);
  v_tenant_id uuid;
  v_previous_tenant_id text;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  v_row := CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_resource_id := COALESCE(v_row ->> 'id', v_row ->> 'code');
  v_tenant_id := COALESCE(
    NULLIF(v_row ->> 'tenant_id', '')::uuid,
    public.sgp_current_tenant_uuid()
  );
  v_request_id := NULLIF(current_setting('app.request_id', true), '');

  -- R4-70 inventory closure also attaches this trigger to documented global
  -- reference catalogs. Those rows are intentionally non-tenant-scoped, while
  -- public.audit_event remains tenant-scoped and NOT NULL.
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_previous_tenant_id := current_setting('app.current_tenant_id', true);
  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

  PERFORM public.sgp_append_audit_event(
    v_action,
    v_table_name,
    v_resource_id,
    NULL::uuid,
    NULL::text,
    NULL::text,
    v_table_name,
    v_request_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', 'R4-70 generic audit closure',
        'operation', TG_OP,
        'schemaName', TG_TABLE_SCHEMA,
        'tableName', TG_TABLE_NAME,
        'tenantId', v_tenant_id::text
      )
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  PERFORM set_config(
    'app.current_tenant_id',
    COALESCE(v_previous_tenant_id, ''),
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
