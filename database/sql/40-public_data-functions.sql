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

CREATE FUNCTION public_data.sgp_lai_request_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
  v_protocol text;
  v_status text;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_protocol := COALESCE(NEW.protocol, OLD.protocol);
  v_status := COALESCE(NEW.status, OLD.status);

  PERFORM public.sgp_append_audit_event(
    (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END)::text,
    'public_data.lai_request'::text,
    v_id::text,
    NULL::uuid,
    current_setting('app.current_user_sub', true),
    current_setting('app.current_login', true),
    'public_data.lai_request'::text,
    current_setting('app.request_id', true),
    jsonb_build_object(
      'tenantId', v_tenant_id,
      'protocol', v_protocol,
      'status', v_status
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public_data.create_lai_request(p_tenant_id uuid, p_requester_name text, p_requester_email text, p_request_text text, p_requester_document text DEFAULT NULL::text) RETURNS TABLE(protocol text, access_key text, status text, submitted_at timestamp with time zone, due_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public_data', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_id uuid;
  v_protocol text;
  v_access_key text;
  v_submitted_at timestamp with time zone;
  v_due_at timestamp with time zone;
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);

  SELECT now() INTO v_submitted_at;
  v_due_at := v_submitted_at + interval '20 days';
  v_access_key := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_protocol := 'LAI-' || to_char(v_submitted_at AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public_data.lai_request (
    tenant_id,
    protocol,
    requester_name,
    requester_email,
    requester_document_hash,
    request_text,
    access_key_hash,
    status,
    submitted_at,
    due_at
  )
  VALUES (
    p_tenant_id,
    v_protocol,
    btrim(p_requester_name),
    lower(btrim(p_requester_email)),
    CASE
      WHEN NULLIF(btrim(COALESCE(p_requester_document, '')), '') IS NULL THEN NULL
      ELSE encode(digest(btrim(p_requester_document), 'sha256'), 'hex')
    END,
    btrim(p_request_text),
    encode(digest(v_access_key, 'sha256'), 'hex'),
    'RECEIVED',
    v_submitted_at,
    v_due_at
  )
  RETURNING id INTO v_id;

  INSERT INTO public_data.lai_request_event (
    tenant_id,
    request_id,
    from_status,
    to_status,
    metadata
  )
  VALUES (
    p_tenant_id,
    v_id,
    NULL,
    'RECEIVED',
    jsonb_build_object('protocol', v_protocol, 'source', 'public-api')
  );

  protocol := v_protocol;
  access_key := v_access_key;
  status := 'RECEIVED';
  submitted_at := v_submitted_at;
  due_at := v_due_at;
  RETURN NEXT;
END;
$$;

CREATE FUNCTION public_data.get_lai_request_status(p_tenant_id uuid, p_protocol text, p_access_key text) RETURNS TABLE(protocol text, status text, submitted_at timestamp with time zone, due_at timestamp with time zone, extended_due_at timestamp with time zone, answered_at timestamp with time zone, closed_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public_data', 'public', 'pg_catalog'
    AS $$
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);

  RETURN QUERY
  SELECT
    request.protocol,
    request.status,
    request.submitted_at,
    request.due_at,
    request.extended_due_at,
    request.answered_at,
    request.closed_at
  FROM public_data.lai_request request
  WHERE request.tenant_id = p_tenant_id
    AND request.protocol = p_protocol
    AND request.access_key_hash = encode(digest(p_access_key, 'sha256'), 'hex');
END;
$$;

CREATE FUNCTION public_data.transition_lai_request(p_tenant_id uuid, p_protocol text, p_status text, p_reason text DEFAULT NULL::text) RETURNS TABLE(id uuid, protocol text, status text, submitted_at timestamp with time zone, due_at timestamp with time zone, extended_due_at timestamp with time zone, answered_at timestamp with time zone, closed_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public_data', 'public', 'pg_catalog'
    AS $$
DECLARE
  v_current public_data.lai_request%ROWTYPE;
  v_now timestamp with time zone;
  v_from_status text;
BEGIN
  PERFORM set_config('app.bypass_rls', 'true', true);
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  SELECT now() INTO v_now;

  SELECT *
  INTO v_current
  FROM public_data.lai_request request
  WHERE request.tenant_id = p_tenant_id
    AND request.protocol = p_protocol
  FOR UPDATE;

  IF v_current.id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (
    (v_current.status = 'RECEIVED' AND p_status = ANY (ARRAY['IN_REVIEW', 'AWAITING_CLARIFICATION', 'EXTENDED', 'ANSWERED', 'DENIED', 'CLOSED'])) OR
    (v_current.status = 'IN_REVIEW' AND p_status = ANY (ARRAY['AWAITING_CLARIFICATION', 'EXTENDED', 'ANSWERED', 'DENIED'])) OR
    (v_current.status = 'AWAITING_CLARIFICATION' AND p_status = ANY (ARRAY['IN_REVIEW', 'CLOSED'])) OR
    (v_current.status = 'EXTENDED' AND p_status = ANY (ARRAY['ANSWERED', 'DENIED', 'CLOSED'])) OR
    (v_current.status = 'ANSWERED' AND p_status = 'CLOSED') OR
    (v_current.status = 'DENIED' AND p_status = 'CLOSED')
  ) THEN
    RAISE EXCEPTION 'Invalid LAI request transition from % to %', v_current.status, p_status
      USING ERRCODE = '23514';
  END IF;

  v_from_status := v_current.status;

  UPDATE public_data.lai_request request
  SET
    status = p_status,
    extended_due_at = CASE
      WHEN p_status = 'EXTENDED' THEN COALESCE(request.extended_due_at, request.due_at + interval '10 days')
      ELSE request.extended_due_at
    END,
    answered_at = CASE
      WHEN p_status IN ('ANSWERED', 'DENIED') THEN COALESCE(request.answered_at, v_now)
      ELSE request.answered_at
    END,
    closed_at = CASE
      WHEN p_status = 'CLOSED' THEN COALESCE(request.closed_at, v_now)
      ELSE request.closed_at
    END,
    updated_at = v_now
  WHERE request.id = v_current.id
  RETURNING request.*
  INTO v_current;

  INSERT INTO public_data.lai_request_event (
    tenant_id,
    request_id,
    from_status,
    to_status,
    reason,
    metadata
  )
  VALUES (
    p_tenant_id,
    v_current.id,
    v_from_status,
    p_status,
    NULLIF(btrim(COALESCE(p_reason, '')), ''),
    jsonb_build_object('protocol', p_protocol, 'source', 'state-machine')
  );

  id := v_current.id;
  protocol := v_current.protocol;
  status := v_current.status;
  submitted_at := v_current.submitted_at;
  due_at := v_current.due_at;
  extended_due_at := v_current.extended_due_at;
  answered_at := v_current.answered_at;
  closed_at := v_current.closed_at;
  RETURN NEXT;
END;
$$;
