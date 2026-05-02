CREATE FUNCTION public.audit_payslip_batch_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after public.payslip_batch;
  row_before public.payslip_batch;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END)::text,
    'public.payslip_batch'::text,
    COALESCE(row_after.batch_id, row_before.batch_id)::text,
    NULL::uuid,
    NULL::text,
    NULL::text,
    'public.payslip_batch'::text,
    NULL::text,
    jsonb_build_object(
      'status', COALESCE(row_after.status, row_before.status)::text,
      'fileCount', COALESCE(row_after.file_count, row_before.file_count),
      'errorCount', COALESCE(row_after.error_count, row_before.error_count)
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION public.audit_report_file_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after public.generated_report_file;
  row_before public.generated_report_file;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END)::text,
    'public.generated_report_file'::text,
    COALESCE(row_after.id, row_before.id)::text,
    NULL::uuid,
    NULL::text,
    NULL::text,
    'public.generated_report_file'::text,
    NULL::text,
    jsonb_build_object(
      'reportKind', COALESCE(row_after.report_kind, row_before.report_kind)::text,
      'fileHash', COALESCE(row_after.file_hash, row_before.file_hash)
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION public.sgp_append_audit_event(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid, p_actor_sub text DEFAULT NULL::text, p_actor_login text DEFAULT NULL::text, p_table_name text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.audit_event (
    id,
    occurred_at,
    actor_user_id,
    actor_sub,
    actor_login,
    action,
    resource_type,
    resource_id,
    table_name,
    request_id,
    metadata
  ) VALUES (
    gen_random_uuid(),
    now(),
    p_actor_user_id,
    p_actor_sub,
    p_actor_login,
    p_action::public."AuditAction",
    p_resource_type,
    p_resource_id,
    p_table_name,
    p_request_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE FUNCTION public.sgp_append_audit_event(p_action text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_actor_user_id uuid DEFAULT NULL::uuid, p_actor_sub text DEFAULT NULL::text, p_actor_login text DEFAULT NULL::text, p_table_name text DEFAULT NULL::text, p_request_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_event_id uuid;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;

  INSERT INTO public.audit_event (
    id,
    tenant_id,
    occurred_at,
    actor_user_id,
    actor_sub,
    actor_login,
    action,
    resource_type,
    resource_id,
    table_name,
    request_id,
    ip_address,
    user_agent,
    reason,
    metadata
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    now(),
    p_actor_user_id,
    p_actor_sub,
    p_actor_login,
    p_action::public."AuditAction",
    p_resource_type,
    p_resource_id,
    p_table_name,
    p_request_id,
    NULLIF(p_ip_address, '')::inet,
    p_user_agent,
    NULLIF(p_reason, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE FUNCTION public.sgp_audit_event_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is immutable' USING ERRCODE = '0A000';
END;
$$;

CREATE FUNCTION public.sgp_bypass_rls() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(public.sgp_current_setting_text('app.bypass_rls'), 'false') = 'true';
$$;

CREATE FUNCTION public.sgp_current_employee_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $_$
  SELECT COALESCE(
    CASE
      WHEN public.sgp_current_setting_text('app.current_employee_id') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.sgp_current_setting_text('app.current_employee_id')::uuid
      ELSE NULL
    END,
    (
      SELECT employee.id
      FROM public.user_account account
      JOIN hr.employee employee
        ON employee.tenant_id = account.tenant_id
       AND employee.cpf = account.cpf
      WHERE account.tenant_id = public.sgp_current_tenant_uuid()
        AND account.cognito_sub = public.sgp_current_user_sub()
      LIMIT 1
    )
  );
$_$;

CREATE FUNCTION public.sgp_current_permissions() RETURNS text[]
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_split_to_array(
        COALESCE(public.sgp_current_setting_text('app.current_permissions'), ''),
        E'\\n+'
      ),
      ARRAY['']
    ),
    ARRAY[]::text[]
  );
$$;

CREATE FUNCTION public.sgp_current_setting_text(name text) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting(name, true), '');
$$;

CREATE FUNCTION public.sgp_current_tenant_id() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    public.sgp_current_setting_text('app.current_tenant_id'),
    public.sgp_current_setting_text('app.current_tenant')
  );
$$;

CREATE FUNCTION public.sgp_current_tenant_uuid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $_$
  SELECT CASE
    WHEN public.sgp_current_tenant_id() ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.sgp_current_tenant_id()::uuid
    ELSE NULL
  END;
$_$;

CREATE FUNCTION public.sgp_current_user_sub() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT public.sgp_current_setting_text('app.current_user_sub');
$$;

CREATE FUNCTION public.sgp_has_any_permission(required_permissions text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(required_permissions, ARRAY[]::text[]) <> ARRAY[]::text[]
    AND public.sgp_current_permissions() && required_permissions;
$$;

CREATE FUNCTION public.sgp_has_permission(required_permission text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(required_permission, '') <> ''
    AND required_permission = ANY(public.sgp_current_permissions());
$$;

CREATE FUNCTION public.sgp_has_tenant_context() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT public.sgp_current_tenant_uuid() IS NOT NULL;
$$;

CREATE FUNCTION public.sgp_is_authenticated() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(public.sgp_current_setting_text('app.authenticated'), 'false') = 'true';
$$;

CREATE FUNCTION public.sgp_tenant_matches(row_tenant_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT public.sgp_has_tenant_context()
    AND row_tenant_id IS NOT NULL
    AND row_tenant_id = public.sgp_current_tenant_uuid();
$$;
