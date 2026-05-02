CREATE FUNCTION public_data.publish_transparency_snapshot(p_tenant_id uuid, p_payroll_run_id uuid, p_published_by uuid DEFAULT NULL::uuid) RETURNS TABLE(competence date, snapshot_hash text, row_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public_data', 'payroll', 'hr', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_run payroll.payroll_run%ROWTYPE;
  v_competence date;
  v_hash text;
  v_count integer;
BEGIN
  SELECT *
  INTO v_run
  FROM payroll.payroll_run run
  JOIN public.tenant tenant ON tenant.id = run.tenant_id
  WHERE run.id = p_payroll_run_id
    AND run.tenant_id = p_tenant_id
    AND run.status = 'APPROVED'::public."PayrollRunStatus"
    AND tenant.transparency_enabled = true;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Approved payroll run with transparency enabled was not found'
      USING ERRCODE = 'P0002';
  END IF;

  v_competence := make_date(v_run.competence_year, v_run.competence_month, 1);

  DELETE FROM public_data.transparency_payroll_snapshot
  WHERE tenant_id = p_tenant_id
    AND competence = v_competence;

  WITH employee_totals AS (
    SELECT
      employee.id AS employee_id,
      employee.registration,
      COALESCE(employee.social_name, employee.name) AS full_name,
      COALESCE(position.name, '') AS position_name,
      COALESCE(location.name, '') AS organizational_unit,
      round(COALESCE(financial.total_earnings, SUM(CASE WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount ELSE 0 END)), 2)::numeric(14, 2) AS gross_total,
      round(COALESCE(financial.total_deductions, SUM(CASE WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN item.amount ELSE 0 END)), 2)::numeric(14, 2) AS deductions_total,
      round(COALESCE(financial.net_amount, SUM(CASE WHEN earning.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount ELSE 0 END)), 2)::numeric(14, 2) AS net_total
    FROM payroll.employee_payroll_item item
    JOIN hr.employee employee ON employee.id = item.employee_id AND employee.tenant_id = item.tenant_id
    JOIN payroll.payroll_earning_deduction earning ON earning.id = item.earning_deduction_id AND earning.tenant_id = item.tenant_id
    LEFT JOIN payroll.payroll_financial_record financial ON financial.tenant_id = item.tenant_id AND financial.payroll_run_id = item.payroll_run_id AND financial.employee_id = item.employee_id
    LEFT JOIN hr.job_position position ON position.id = employee.job_position_id AND position.tenant_id = employee.tenant_id
    LEFT JOIN hr.work_location location ON location.id = COALESCE(financial.work_location_id, employee.work_location_id) AND location.tenant_id = employee.tenant_id
    WHERE item.tenant_id = p_tenant_id
      AND item.payroll_run_id = p_payroll_run_id
      AND item.deleted_at IS NULL
    GROUP BY employee.id, employee.registration, employee.social_name, employee.name, position.name, location.name, financial.total_earnings, financial.total_deductions, financial.net_amount
  )
  INSERT INTO public_data.transparency_payroll_snapshot (
    tenant_id, competence, employee_public_id, full_name, registration_number,
    position_name, organizational_unit, gross_total, deductions_total, net_total, snapshot_taken_at
  )
  SELECT
    p_tenant_id,
    v_competence,
    encode(digest(p_tenant_id::text || ':' || employee_id::text, 'sha256'), 'hex'),
    full_name,
    registration,
    position_name,
    organizational_unit,
    gross_total,
    deductions_total,
    net_total,
    now()
  FROM employee_totals;

  SELECT count(*)::integer
  INTO v_count
  FROM public_data.transparency_payroll_snapshot
  WHERE tenant_id = p_tenant_id
    AND competence = v_competence;

  SELECT encode(digest(COALESCE(string_agg(
    employee_public_id || '|' || full_name || '|' || registration_number || '|' ||
    position_name || '|' || organizational_unit || '|' || gross_total::text || '|' ||
    deductions_total::text || '|' || net_total::text,
    E'\n' ORDER BY employee_public_id
  ), ''), 'sha256'), 'hex')
  INTO v_hash
  FROM public_data.transparency_payroll_snapshot
  WHERE tenant_id = p_tenant_id
    AND competence = v_competence;

  INSERT INTO public_data.transparency_publish_event (
    tenant_id, competence, payroll_run_id, published_by, snapshot_hash
  )
  VALUES (p_tenant_id, v_competence, p_payroll_run_id, p_published_by, v_hash);

  PERFORM public.sgp_append_audit_event(
    'transparency.publish',
    'public_data.transparency_payroll_snapshot',
    p_payroll_run_id::text,
    p_published_by,
    current_setting('app.current_user_sub', true),
    current_setting('app.current_login', true),
    'public_data.transparency_payroll_snapshot',
    current_setting('app.request_id', true),
    jsonb_build_object('tenantId', p_tenant_id, 'competence', v_competence, 'snapshotHash', v_hash, 'rowCount', v_count)
  );

  competence := v_competence;
  snapshot_hash := v_hash;
  row_count := v_count;
  RETURN NEXT;
END;
$$;
