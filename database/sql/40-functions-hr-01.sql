CREATE FUNCTION hr.audit_reintegration_order_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.reintegration_order',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', to_jsonb(OLD), 'after', to_jsonb(NEW)),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION hr.audit_tsv_contract_change_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.tsv_contract_change',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', v_before, 'after', v_after),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION hr.audit_tsv_contract_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' WHEN TG_OP = 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.tsv_contract',
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', v_before, 'after', v_after),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION hr.f_calculate_vacation_balance(p_employee_id uuid, p_ref_date date DEFAULT CURRENT_DATE) RETURNS TABLE(employee_id uuid, accrual_period_start date, accrual_period_end date, accrued_days integer, used_days integer, pecuniary_bonus_days integer, available_days integer)
    LANGUAGE sql STABLE
    AS $$
WITH active_contract AS (
  SELECT
    contract.tenant_id,
    contract.employee_id,
    COALESCE(contract.exercise_on, contract.starts_on) AS exercise_on
  FROM hr.employment_contract contract
  WHERE contract.employee_id = p_employee_id
    AND contract.status = 'ACTIVE'::"RecordStatus"
  ORDER BY contract.starts_on DESC
  LIMIT 1
),
periods AS (
  SELECT
    contract.tenant_id,
    contract.employee_id,
    (contract.exercise_on + (series.n || ' years')::interval)::date AS accrual_period_start,
    (contract.exercise_on + ((series.n + 1) || ' years')::interval - interval '1 day')::date AS accrual_period_end
  FROM active_contract contract
  CROSS JOIN LATERAL generate_series(
    0,
    GREATEST(0, EXTRACT(year FROM age(p_ref_date, contract.exercise_on))::integer)
  ) AS series(n)
  WHERE contract.exercise_on IS NOT NULL
)
SELECT
  periods.employee_id,
  periods.accrual_period_start,
  periods.accrual_period_end,
  CASE WHEN p_ref_date > periods.accrual_period_end THEN 30 ELSE 0 END::integer AS accrued_days,
  COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS used_days,
  COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS pecuniary_bonus_days,
  GREATEST(
    CASE WHEN p_ref_date > periods.accrual_period_end THEN 30 ELSE 0 END
      - COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)
      - COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0),
    0
  )::integer AS available_days
FROM periods
LEFT JOIN hr.vacation_record record
  ON record.tenant_id = periods.tenant_id
 AND record.employee_id = periods.employee_id
 AND record.accrual_period_start = periods.accrual_period_start
 AND record.accrual_period_end = periods.accrual_period_end
 AND record.status <> 'cancelado'
GROUP BY periods.employee_id, periods.accrual_period_start, periods.accrual_period_end
ORDER BY periods.accrual_period_start DESC;
$$;

CREATE FUNCTION hr.f_consolidated_medical_days(p_employee_id uuid, p_year integer) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(SUM(granted_days), 0)::integer
  FROM hr.medical_leave leave_row
  WHERE leave_row.employee_id = p_employee_id
    AND leave_row.status = 'ACTIVE'::"RecordStatus"
    AND leave_row.starts_on >= make_date(p_year, 1, 1)
    AND leave_row.starts_on < make_date(p_year + 1, 1, 1);
$$;

CREATE FUNCTION hr.f_leave_reason_max_days(p_reason_code text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE p_reason_code
    WHEN 'maternidade' THEN 180
    WHEN 'empresa_cidada_extension' THEN 60
    WHEN 'paternidade' THEN 5
    WHEN 'paternidade_empresa_cidada' THEN 20
    WHEN 'adotante' THEN 120
    WHEN 'premio' THEN 90
    WHEN 'capacitacao' THEN 90
    WHEN 'falecimento' THEN 8
    WHEN 'doacao_sangue' THEN 1
    WHEN 'pessoa_familia' THEN 30
    ELSE NULL
  END
$$;

CREATE FUNCTION hr.f_validate_leave_eligibility(p_employee_id uuid, p_reason_code text, p_start_date date, p_days integer, p_supporting_document_ref text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_service_days integer;
  v_max_days integer;
BEGIN
  IF p_employee_id IS NULL OR p_reason_code IS NULL OR p_start_date IS NULL OR p_days IS NULL THEN
    RAISE EXCEPTION 'employee_id, reason, start_date, and days are required' USING ERRCODE = '23514';
  END IF;
  IF p_days < 1 THEN
    RAISE EXCEPTION 'leave days must be positive' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_employee
  FROM hr.employee
  WHERE id = p_employee_id
    AND tenant_id = public.sgp_current_tenant_uuid()
    AND lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found or inactive for current tenant' USING ERRCODE = '23503';
  END IF;

  v_max_days := hr.f_leave_reason_max_days(p_reason_code);
  IF v_max_days IS NOT NULL AND p_days > v_max_days THEN
    RAISE EXCEPTION 'Leave reason % allows at most % days, received %', p_reason_code, v_max_days, p_days
      USING ERRCODE = '23514';
  END IF;

  IF p_reason_code IN ('capacitacao', 'premio') THEN
    SELECT COALESCE(SUM(COALESCE(days_count, (COALESCE(ends_on, p_start_date) - starts_on + 1))), 0)::integer
    INTO v_service_days
    FROM hr.service_time_record
    WHERE employee_id = p_employee_id
      AND tenant_id = v_employee.tenant_id
      AND starts_on <= p_start_date;

    IF v_service_days < 1825 THEN
      RAISE EXCEPTION 'Leave reason % requires at least five years of service', p_reason_code
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_reason_code IN ('conjuge', 'adotante', 'paternidade_empresa_cidada')
     AND NULLIF(trim(COALESCE(p_supporting_document_ref, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Leave reason % requires supporting document', p_reason_code
      USING ERRCODE = '23514';
  END IF;

  RETURN true;
END;
$$;

CREATE FUNCTION hr.sgp_audit_hr06_org_structure() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_action text;
  v_previous_tenant_id text;
  v_previous_tenant text;
  v_using_row_tenant boolean := false;
BEGIN
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END;
  v_previous_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '');
  v_previous_tenant := NULLIF(current_setting('app.current_tenant', true), '');

  IF v_previous_tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', NEW.tenant_id::text, true);
    END IF;
    v_using_row_tenant := true;
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    'gestao.master_data'::text,
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('code', NEW.code, 'operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF v_using_row_tenant THEN
    PERFORM set_config('app.current_tenant_id', COALESCE(v_previous_tenant_id, ''), true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_effect_employee_transfer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NEW.status = 'efetivada'::hr.employee_transfer_status
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT jsonb_build_object(
      'work_location_id', e.work_location_id,
      'job_position_id', e.job_position_id
    )
    INTO v_before
    FROM hr.employee e
    WHERE e.id = NEW.employee_id;

    UPDATE hr.employee
    SET
      work_location_id = NEW.destino_work_location_id,
      job_position_id = COALESCE(NEW.destino_job_position_id, job_position_id),
      updated_at = now()
    WHERE id = NEW.employee_id
      AND tenant_id = NEW.tenant_id;

    SELECT jsonb_build_object(
      'work_location_id', e.work_location_id,
      'job_position_id', e.job_position_id
    )
    INTO v_after
    FROM hr.employee e
    WHERE e.id = NEW.employee_id;

    PERFORM public.sgp_append_audit_event(
      'UPDATE',
      'rh.employee_transfer',
      NEW.id::text,
      NULLIF(current_setting('app.current_user_id', true), '')::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'hr.employee_transfer',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'rh.movimentacao.efetivada',
        'employee_id', NEW.employee_id,
        'diff', jsonb_build_object('before', v_before, 'after', v_after)
      ),
      'employee_transfer_effected',
      NULL,
      NULL
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_employee_alimony_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
  v_action text;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_action := CASE
    WHEN TG_OP = 'DELETE' THEN 'DELETE'
    WHEN TG_OP = 'INSERT' THEN 'CREATE'
    ELSE 'UPDATE'
  END;

  PERFORM set_config('app.current_tenant_id', COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), v_tenant_id::text), true);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    INSERT INTO hr.employee_alimony_history (
      tenant_id,
      alimony_id,
      employee_id,
      operation,
      versioned_by,
      previous_record
    )
    VALUES (
      OLD.tenant_id,
      OLD.id,
      OLD.employee_id,
      TG_OP,
      public.sgp_current_user_sub(),
      to_jsonb(OLD)
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.employee_alimony',
    v_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    'hr.employee_alimony',
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP, 'court_order_number', COALESCE(NEW.court_order_number, OLD.court_order_number)),
    'hr.alimony.order.mutated',
    NULL,
    NULL
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_employee_bank_account_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_account_id uuid;
BEGIN
  v_account_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO hr.employee_bank_account_history (
      tenant_id,
      account_id,
      changed_by,
      before_json,
      after_json
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.validated_by,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW)
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    CASE WHEN TG_OP = 'DELETE' THEN 'DELETE' ELSE CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END END,
    'hr.employee_bank_account',
    v_account_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    'hr.employee_bank_account',
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr01_employee_timeline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_previous_tenant_id text;
  v_previous_tenant text;
  v_using_row_tenant boolean := false;
  v_action text;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.functional_status_id IS NOT DISTINCT FROM OLD.functional_status_id
    AND NEW.terminated_on IS NOT DISTINCT FROM OLD.terminated_on
    AND NEW.lifecycle_status IS NOT DISTINCT FROM OLD.lifecycle_status
  THEN
    RETURN NEW;
  END IF;

  v_previous_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '');
  v_previous_tenant := NULLIF(current_setting('app.current_tenant', true), '');
  IF v_previous_tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', NEW.tenant_id::text, true);
    END IF;
    v_using_row_tenant := true;
  END IF;

  IF NEW.functional_status_id IS NOT NULL THEN
    INSERT INTO hr.employee_status_history (
      tenant_id,
      employee_id,
      functional_status_id,
      reason_id,
      starts_on,
      ends_on,
      notes
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.functional_status_id,
      NEW.termination_reason_id,
      COALESCE(NEW.terminated_on, NEW.hired_on, CURRENT_DATE),
      NULL,
      CASE WHEN NEW.lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus"
        THEN 'Desligamento registrado pelo fluxo HR-01'
        ELSE 'Admissao registrada pelo fluxo HR-01'
      END
    );
  END IF;

  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'PROCESS' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'rh.employee'::text,
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.employee',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'registration', NEW.registration,
      'lifecycleStatus', NEW.lifecycle_status::text
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF v_using_row_tenant THEN
    PERFORM set_config('app.current_tenant_id', COALESCE(v_previous_tenant_id, ''), true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr01_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr01_status_history_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'employee_status_history is immutable' USING ERRCODE = '0A000';
END;
$$;

CREATE FUNCTION hr.sgp_hr02_employment_link_timeline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.contract_type IS NOT DISTINCT FROM OLD.contract_type
    AND NEW.functional_status_id IS NOT DISTINCT FROM OLD.functional_status_id
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO hr.employee_status_history (
    tenant_id,
    employee_id,
    functional_status_id,
    starts_on,
    ends_on,
    notes
  )
  SELECT
    e.tenant_id,
    e.id,
    COALESCE(NEW.functional_status_id, e.functional_status_id),
    CURRENT_DATE,
    NEW.end_date,
    concat('Alteracao de regime juridico: ', NEW.contract_type)
  FROM hr.employee e
  WHERE e.tenant_id = NEW.tenant_id
    AND e.employment_link_id = NEW.id
    AND COALESCE(NEW.functional_status_id, e.functional_status_id) IS NOT NULL;

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr03_vacation_record_audit() RETURNS trigger
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

CREATE FUNCTION hr.sgp_hr04_medical_record_conclude() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_leave_id uuid;
  v_leave_record_id uuid;
BEGIN
  IF NEW.decision <> 'granted' THEN
    RETURN NEW;
  END IF;

  IF NEW.granted_days IS NULL OR NEW.leave_starts_on IS NULL OR NEW.leave_ends_on IS NULL THEN
    RAISE EXCEPTION 'Granted medical opinion requires granted_days, leave_starts_on, and leave_ends_on'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO hr.medical_leave (
    tenant_id,
    medical_record_id,
    employee_id,
    evaluation_type,
    social_security_benefit,
    absence_reason_id,
    icd_ref,
    cid_code,
    cid_secondary,
    expert_opinion_id,
    granted_days,
    starts_on,
    ends_on,
    status
  )
  VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.employee_id,
    NEW.evaluation_type,
    NULL,
    NULL,
    NEW.cid_code,
    NEW.cid_code,
    NEW.cid_secondary,
    NEW.id,
    NEW.granted_days,
    NEW.leave_starts_on,
    NEW.leave_ends_on,
    'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_leave_id;

  IF v_leave_id IS NULL THEN
    SELECT id INTO v_leave_id
    FROM hr.medical_leave
    WHERE medical_record_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO hr.leave_record (
    tenant_id,
    employee_id,
    absence_reason_id,
    starts_on,
    ends_on,
    days,
    status,
    notes
  )
  SELECT
    NEW.tenant_id,
    NEW.employee_id,
    NULL,
    NEW.leave_starts_on,
    NEW.leave_ends_on,
    NEW.granted_days,
    'ACTIVE'::"RecordStatus",
    'Medical leave generated from official pericia opinion ' || NEW.id::text
  WHERE NOT EXISTS (
    SELECT 1
    FROM hr.leave_record leave_row
    WHERE leave_row.tenant_id = NEW.tenant_id
      AND leave_row.employee_id = NEW.employee_id
      AND leave_row.starts_on = NEW.leave_starts_on
      AND leave_row.ends_on IS NOT DISTINCT FROM NEW.leave_ends_on
      AND leave_row.notes = 'Medical leave generated from official pericia opinion ' || NEW.id::text
  )
  RETURNING id INTO v_leave_record_id;

  UPDATE hr.employee
  SET lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
      updated_at = now()
  WHERE id = NEW.employee_id
    AND tenant_id = NEW.tenant_id;

  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'hr.medical_leave',
    v_leave_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.medical_leave',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'medicalRecordId', NEW.id,
      'leaveRecordId', v_leave_record_id,
      'decision', NEW.decision,
      'grantedDays', NEW.granted_days,
      'cidCode', NEW.cid_code,
      'cidSecondary', NEW.cid_secondary
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN NEW;
END;
$$;

CREATE FUNCTION hr.sgp_hr04_row_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_action text;
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
