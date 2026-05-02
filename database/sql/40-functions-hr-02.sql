CREATE FUNCTION hr.sgp_hr05_leave_record_approval_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_status_id uuid;
BEGIN
  IF NEW.approved_at IS NULL OR OLD.approved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_status_id
  FROM hr.functional_status
  WHERE tenant_id = NEW.tenant_id
    AND code IN ('ON_LEAVE', 'AFASTADO', 'LICENCA')
    AND status = 'ACTIVE'::"RecordStatus"
  ORDER BY CASE code WHEN 'ON_LEAVE' THEN 1 WHEN 'AFASTADO' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_status_id IS NOT NULL THEN
    INSERT INTO hr.employee_status_history (
      tenant_id,
      employee_id,
      functional_status_id,
      starts_on,
      ends_on,
      notes
    )
    VALUES (
      NEW.tenant_id,
      NEW.employee_id,
      v_status_id,
      NEW.starts_on,
      NEW.ends_on,
      'Licenca aprovada: ' || NEW.id::text
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    'UPDATE',
    'hr.leave_record',
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.leave_record',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('approvedAt', NEW.approved_at, 'employeeId', NEW.employee_id),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr05_leave_record_validate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_reason_code text;
BEGIN
  SELECT code INTO v_reason_code
  FROM hr.absence_reason
  WHERE id = NEW.absence_reason_id
    AND tenant_id = NEW.tenant_id;

  IF NEW.absence_reason_id IS NULL
     AND NEW.notes LIKE 'Medical leave generated from official pericia opinion %' THEN
    RETURN NEW;
  END IF;

  IF v_reason_code IS NULL THEN
    RAISE EXCEPTION 'leave_record requires a tenant-scoped absence reason' USING ERRCODE = '23514';
  END IF;

  PERFORM hr.f_validate_leave_eligibility(
    NEW.employee_id,
    v_reason_code,
    NEW.starts_on,
    COALESCE(NEW.days, NEW.ends_on - NEW.starts_on + 1),
    NEW.supporting_document_ref
  );

  IF v_reason_code = 'interesse_particular' THEN
    NEW.paid := false;
  END IF;
  IF NEW.ends_on IS NULL THEN
    NEW.ends_on := NEW.starts_on + (COALESCE(NEW.days, 1) - 1);
  END IF;
  IF NEW.days IS NULL THEN
    NEW.days := NEW.ends_on - NEW.starts_on + 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr07_cadastral_change_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_action text;
  v_id text;
BEGIN
  v_action := TG_OP;
  v_id := COALESCE(NEW.id, OLD.id)::text;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.cadastral_change_request',
    v_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION hr.sgp_hr08_probation_statutory_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM hr.employee employee
    LEFT JOIN hr.employment_link link ON link.id = employee.employment_link_id
    WHERE employee.id = NEW.employee_id
      AND employee.tenant_id = NEW.tenant_id
      AND COALESCE(link.contract_type, 'statutory') = 'statutory'
  ) THEN
    RAISE EXCEPTION 'probation_evaluation requires a statutory employee' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr08_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr08_status_history_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'employee_status_history is append-only' USING ERRCODE = '0A000';
END;
$$;
