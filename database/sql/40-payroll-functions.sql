CREATE FUNCTION payroll.block_generated_payroll_item_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_payroll_run_id uuid;
  v_status public."PayrollRunStatus";
BEGIN
  IF public.sgp_bypass_rls() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payroll_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
  IF v_payroll_run_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO v_status
  FROM payroll.payroll_run
  WHERE id = v_payroll_run_id;

  IF v_status = 'GENERATED'::public."PayrollRunStatus" THEN
    RAISE EXCEPTION 'payroll run % is GENERATED and cannot have payroll items changed', v_payroll_run_id
      USING ERRCODE = '55000';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION payroll.process_due_vacation_payroll() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_record record;
  v_count integer := 0;
  v_payroll_type_id uuid;
  v_processing_type_id uuid;
  v_run_id uuid;
  v_run_status public."PayrollRunStatus";
  v_year integer;
  v_month integer;
  v_totals record;
BEGIN
  FOR v_record IN
    SELECT vacation.id, vacation.tenant_id, vacation.employee_id, employee.branch_id, employee.functional_status_id, vacation.starts_on
    FROM hr.vacation_record vacation
    JOIN hr.employee employee ON employee.id = vacation.employee_id
    WHERE payroll_run_id IS NULL
      AND status IN ('programado', 'aprovado')
      AND starts_on - INTERVAL '30 days' <= CURRENT_DATE
    ORDER BY starts_on, id
  LOOP
    SELECT id INTO v_payroll_type_id
    FROM payroll.payroll_type
    WHERE tenant_id = v_record.tenant_id
      AND code = 'FERIAS'
    LIMIT 1;

    SELECT id INTO v_processing_type_id
    FROM payroll.processing_type
    WHERE tenant_id = v_record.tenant_id
      AND code = 'FERIAS'
    LIMIT 1;

    v_year := EXTRACT(YEAR FROM v_record.starts_on)::integer;
    v_month := EXTRACT(MONTH FROM v_record.starts_on)::integer;

    SELECT id, status INTO v_run_id, v_run_status
    FROM payroll.payroll_run
    WHERE tenant_id = v_record.tenant_id
      AND competence_year = v_year
      AND competence_month = v_month
      AND branch_id IS NULL
      AND payroll_type_id = v_payroll_type_id
      AND processing_type_id = v_processing_type_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_run_id IS NULL THEN
      INSERT INTO payroll.payroll_run (
        tenant_id, competence_year, competence_month, payroll_type_id,
        processing_type_id, branch_id, status
      )
      VALUES (
        v_record.tenant_id, v_year, v_month, v_payroll_type_id,
        v_processing_type_id, NULL, 'PROCESSING'::public."PayrollRunStatus"
      )
      RETURNING id INTO v_run_id;
    ELSE
      IF v_run_status IN ('APPROVED'::public."PayrollRunStatus", 'PAID'::public."PayrollRunStatus", 'CLOSED'::public."PayrollRunStatus") THEN
        RAISE EXCEPTION 'Vacation payroll run % in status % cannot be reprocessed', v_run_id, v_run_status
          USING ERRCODE = '55000';
      END IF;

      UPDATE payroll.payroll_run
      SET status = 'PROCESSING'::public."PayrollRunStatus",
          updated_at = now()
      WHERE id = v_run_id;
    END IF;

    UPDATE payroll.employee_payroll_item
    SET deleted_at = now(),
        deleted_reason = 'calc09.vacation_job.reprocessed',
        updated_at = now()
    WHERE payroll_run_id = v_run_id
      AND employee_id = v_record.employee_id
      AND source = 'CALCULATED'::public."PayrollEntrySource"
      AND deleted_at IS NULL;

    INSERT INTO payroll.employee_payroll_item (
      tenant_id, employee_id, payroll_run_id, earning_deduction_id, source,
      competence_year, competence_month, quantity, reference_value, amount, notes
    )
    SELECT
      v_record.tenant_id,
      v_record.employee_id,
      v_run_id,
      ped.id,
      'CALCULATED'::public."PayrollEntrySource",
      v_year,
      v_month,
      calc.quantity,
      calc.reference_value,
      calc.amount,
      'vacation_record_id=' || v_record.id::text
    FROM payroll_calc.compute_ferias(v_record.tenant_id, v_record.id) calc
    JOIN payroll.payroll_earning_deduction ped
      ON ped.tenant_id = v_record.tenant_id
     AND ped.code = calc.item_code;

    SELECT
      count(DISTINCT item.employee_id)::integer AS employee_count,
      coalesce(sum(CASE WHEN ed.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_earnings,
      coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::numeric(16, 2) AS total_deductions,
      coalesce(sum(CASE
        WHEN ed.kind = 'EARNING'::public."PayrollEntryKind" THEN item.amount
        WHEN ed.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
        ELSE 0
      END), 0)::numeric(16, 2) AS total_net
    INTO v_totals
    FROM payroll.v_payroll_run_line_active item
    JOIN payroll.payroll_earning_deduction ed ON ed.id = item.earning_deduction_id
    WHERE item.payroll_run_id = v_run_id;

    UPDATE payroll.payroll_run
    SET employee_count = v_totals.employee_count,
        total_earnings = v_totals.total_earnings,
        total_deductions = v_totals.total_deductions,
        total_net = v_totals.total_net,
        status = 'GENERATED'::public."PayrollRunStatus",
        updated_at = now()
    WHERE id = v_run_id;

    UPDATE hr.vacation_record
    SET payroll_run_id = v_run_id,
        status = 'paid',
        updated_at = now()
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE FUNCTION payroll.sgp_payment_remittance_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  PERFORM set_config('app.current_tenant_id', COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), v_tenant_id::text), true);
  PERFORM public.sgp_append_audit_event(
    CASE
      WHEN TG_OP = 'DELETE' THEN 'DELETE'
      WHEN TG_OP = 'INSERT' THEN 'CREATE'
      ELSE 'UPDATE'
    END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION payroll.sgp_payment_return_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'payment_return_file' THEN
    IF TG_OP = 'DELETE' THEN
      v_id := OLD.return_file_id;
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_id := NEW.return_file_id;
      v_tenant_id := NEW.tenant_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_id := OLD.return_detail_id;
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_id := NEW.return_detail_id;
      v_tenant_id := NEW.tenant_id;
    END IF;
  END IF;

  PERFORM set_config('app.current_tenant_id', COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), v_tenant_id::text), true);
  PERFORM public.sgp_append_audit_event(
    CASE
      WHEN TG_OP = 'DELETE' THEN 'DELETE'
      WHEN TG_OP = 'INSERT' THEN 'CREATE'
      ELSE 'UPDATE'
    END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
