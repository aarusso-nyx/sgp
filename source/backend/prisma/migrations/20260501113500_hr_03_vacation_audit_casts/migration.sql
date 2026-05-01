-- Repair HR-03 audit trigger after XCUT-04 introduced overloaded append signatures.

CREATE OR REPLACE FUNCTION hr.sgp_hr03_vacation_record_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_row hr.vacation_record%ROWTYPE;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.vacation_record'::text,
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.vacation_record'::text,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;
