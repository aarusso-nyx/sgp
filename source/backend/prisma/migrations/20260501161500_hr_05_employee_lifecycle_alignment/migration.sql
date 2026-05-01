-- Align HR-05 eligibility with the current HR-01 employee lifecycle model.

CREATE OR REPLACE FUNCTION hr.f_validate_leave_eligibility(
  p_employee_id uuid,
  p_reason_code text,
  p_start_date date,
  p_days integer,
  p_supporting_document_ref text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
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
