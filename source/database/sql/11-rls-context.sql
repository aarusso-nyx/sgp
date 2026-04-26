-- Runtime helper functions for PostgreSQL row-level security.
-- Values are injected per request by backend DatabaseService via set_config(...).

CREATE OR REPLACE FUNCTION public.sgp_current_setting_text(name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting(name, true), '');
$$;

CREATE OR REPLACE FUNCTION public.sgp_current_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
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

CREATE OR REPLACE FUNCTION public.sgp_has_any_permission(required_permissions text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(required_permissions, ARRAY[]::text[]) <> ARRAY[]::text[]
    AND public.sgp_current_permissions() && required_permissions;
$$;

CREATE OR REPLACE FUNCTION public.sgp_has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(required_permission, '') <> ''
    AND required_permission = ANY(public.sgp_current_permissions());
$$;

CREATE OR REPLACE FUNCTION public.sgp_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.sgp_current_setting_text('app.authenticated'), 'false') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.sgp_current_user_sub()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT public.sgp_current_setting_text('app.current_user_sub');
$$;

CREATE OR REPLACE FUNCTION public.sgp_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    public.sgp_current_setting_text('app.current_tenant_id'),
    public.sgp_current_setting_text('app.current_tenant')
  );
$$;

CREATE OR REPLACE FUNCTION public.sgp_current_tenant_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.sgp_current_tenant_id() ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.sgp_current_tenant_id()::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.sgp_has_tenant_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.sgp_current_tenant_uuid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.sgp_tenant_matches(row_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.sgp_has_tenant_context()
    AND row_tenant_id IS NOT NULL
    AND row_tenant_id = public.sgp_current_tenant_uuid();
$$;

CREATE OR REPLACE FUNCTION public.sgp_bypass_rls()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(public.sgp_current_setting_text('app.bypass_rls'), 'false') = 'true';
$$;
