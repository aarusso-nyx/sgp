CREATE FUNCTION esocial.audit_endpoint_circuit_state_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row esocial.endpoint_circuit_state;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.endpoint_circuit_state',
    v_row.endpoint_url,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.endpoint_circuit_state',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'endpointUrl', v_row.endpoint_url,
      'state', v_row.state::text,
      'failureCount', v_row.failure_count,
      'lastFailureAt', v_row.last_failure_at
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN v_row;
END
$$;

CREATE FUNCTION esocial.audit_event_retry_schedule_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_value esocial.event_retry_schedule;
  audit_action text;
BEGIN
  row_value := COALESCE(NEW, OLD);
  audit_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;

  PERFORM set_config('app.current_tenant_id', row_value.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'esocial.event_retry_schedule',
    row_value.event_id::text,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.event_retry_schedule',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'attempt', row_value.attempt,
      'nextAt', row_value.next_at,
      'lastError', row_value.last_error
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN row_value;
END
$$;

CREATE FUNCTION esocial.audit_s1xxx_dispatch_state_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after esocial.s1xxx_dispatch_state;
  row_before esocial.s1xxx_dispatch_state;
  audit_action text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;

  PERFORM set_config(
    'app.current_tenant_id',
    COALESCE(row_after.tenant_id, row_before.tenant_id)::text,
    true
  );

  PERFORM public.sgp_append_audit_event(
    audit_action,
    'esocial.s1xxx_dispatch_state',
    COALESCE(row_after.source_entity_id, row_before.source_entity_id),
    NULL::uuid,
    NULL::text,
    NULL::text,
    'esocial.s1xxx_dispatch_state',
    NULL::text,
    jsonb_build_object(
      'eventKind', COALESCE(row_after.event_kind, row_before.event_kind)::text,
      'lastPayloadHash', COALESCE(row_after.last_payload_hash, row_before.last_payload_hash)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION esocial.audit_s2298_event_mutation() RETURNS trigger
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
    'esocial.s2298_event',
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

CREATE FUNCTION esocial.audit_s2306_event_mutation() RETURNS trigger
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
    'esocial.s2306_event',
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

CREATE FUNCTION esocial.audit_submission_batch_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row esocial.submission_batch;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.submission_batch',
    v_row.batch_id::text,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.submission_batch',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'environment', v_row.environment::text,
      'endpointUrl', v_row.endpoint_url,
      'status', v_row.status::text,
      'attempts', v_row.attempts,
      'eventCount', cardinality(v_row.event_ids),
      'httpStatus', v_row.http_status
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN v_row;
END
$$;

CREATE FUNCTION esocial.audit_tenant_certificate_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_action TEXT;
  v_tenant_id UUID;
  v_certificate_id TEXT;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_certificate_id := COALESCE(NEW.certificate_id, OLD.certificate_id)::text;

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.tenant_certificate',
    v_certificate_id,
    NULL,
    NULL,
    NULL,
    'esocial.tenant_certificate',
    NULL,
    jsonb_build_object(
      'event', 'esocial.certificate.mutated',
      'operation', TG_OP,
      'alias', COALESCE(NEW.alias, OLD.alias),
      'status', COALESCE(NEW.status::text, OLD.status::text)
    ),
    NULL,
    NULL,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION esocial.audit_xsd_validation_failure_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'esocial.xsd_validation_failure',
    NEW.attempt_id::text,
    NULL,
    NULL,
    NULL,
    'esocial.xsd_validation_failure',
    NULL,
    jsonb_build_object(
      'event', 'esocial.xsd_validation_failed',
      'eventKind', NEW.event_kind,
      'xsdPath', NEW.xsd_path,
      'xmlPointer', NEW.error_xml_pointer
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.enqueue_s2205_pending_alteration(p_tenant_id uuid, p_employee_id uuid, p_field_path text, p_source_table text, p_source_row_id uuid, p_previous_payload jsonb, p_current_payload jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM esocial.s2205_trigger_field WHERE field_path = p_field_path
  ) THEN
    RETURN;
  END IF;

  INSERT INTO esocial.s2205_pending_alteration (
    tenant_id,
    employee_id,
    field_path,
    source_table,
    source_row_id,
    previous_payload,
    current_payload
  )
  VALUES (
    p_tenant_id,
    p_employee_id,
    p_field_path,
    p_source_table,
    p_source_row_id,
    p_previous_payload,
    p_current_payload
  )
  RETURNING id INTO v_id;

  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'esocial.s2205_pending_alteration',
    v_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.s2205_pending_alteration',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'employeeId', p_employee_id::text,
      'fieldPath', p_field_path,
      'sourceTable', p_source_table,
      'sourceRowId', p_source_row_id::text
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
END
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2210_from_cat() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO esocial.s2210_pending (tenant_id, cat_emission_id)
  VALUES (NEW.tenant_id, NEW.id)
  ON CONFLICT (tenant_id, cat_emission_id)
  DO UPDATE
  SET enqueued_at = EXCLUDED.enqueued_at,
      updated_at = now();

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2220_from_aso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status <> 'ARCHIVED'::saude.aso_status
     AND NEW.status = 'ARCHIVED'::saude.aso_status
     AND NEW.s2220_event_id IS NULL THEN
    INSERT INTO esocial.s2220_pending (tenant_id, aso_record_id)
    VALUES (NEW.tenant_id, NEW.id)
    ON CONFLICT (tenant_id, aso_record_id)
    DO UPDATE
    SET enqueued_at = EXCLUDED.enqueued_at,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2230_from_leave() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'ACTIVE'::public."RecordStatus"
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'LEAVE', 'START')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.status = 'ACTIVE'::public."RecordStatus"
     AND TG_OP = 'UPDATE'
     AND OLD.ends_on IS DISTINCT FROM NEW.ends_on
     AND NEW.ends_on IS NOT NULL THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'LEAVE', 'EXTENSION')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2230_from_vacation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status IN ('aprovado', 'gozado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'VACATION', 'START')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.status IN ('aprovado', 'gozado')
     AND TG_OP = 'UPDATE'
     AND OLD.ends_on IS DISTINCT FROM NEW.ends_on THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'VACATION', 'EXTENSION')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2240_from_exposure() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_trigger esocial.s2240_trigger_event;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_trigger := 'START'::esocial.s2240_trigger_event;
  ELSIF OLD.exposure_end IS DISTINCT FROM NEW.exposure_end
        AND NEW.exposure_end IS NOT NULL THEN
    v_trigger := 'END'::esocial.s2240_trigger_event;
  ELSIF OLD.harmful_agent_code IS DISTINCT FROM NEW.harmful_agent_code
        OR OLD.agent_kind IS DISTINCT FROM NEW.agent_kind
        OR OLD.intensity_value IS DISTINCT FROM NEW.intensity_value
        OR OLD.intensity_unit IS DISTINCT FROM NEW.intensity_unit
        OR OLD.exposure_start IS DISTINCT FROM NEW.exposure_start
        OR OLD.mitigated_by_epi IS DISTINCT FROM NEW.mitigated_by_epi
        OR OLD.mitigated_by_epc IS DISTINCT FROM NEW.mitigated_by_epc
        OR OLD.special_retirement_eligible IS DISTINCT FROM NEW.special_retirement_eligible THEN
    v_trigger := 'CHANGE'::esocial.s2240_trigger_event;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO esocial.s2240_pending (tenant_id, environmental_exposure_id, trigger_event)
  VALUES (NEW.tenant_id, NEW.id, v_trigger)
  ON CONFLICT (tenant_id, environmental_exposure_id, trigger_event)
  DO UPDATE
  SET enqueued_at = EXCLUDED.enqueued_at,
      updated_at = now(),
      last_error = NULL;

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_enqueue_s2299_from_employment_link() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_employee_id uuid;
  v_run_status public."PayrollRunStatus";
BEGIN
  IF NEW.termination_payroll_run_id IS NULL
     OR (TG_OP = 'UPDATE' AND OLD.termination_payroll_run_id IS NOT DISTINCT FROM NEW.termination_payroll_run_id) THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_run_status
  FROM payroll.payroll_run
  WHERE id = NEW.termination_payroll_run_id
    AND tenant_id = NEW.tenant_id;

  IF v_run_status <> 'GENERATED'::public."PayrollRunStatus" THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_employee_id
  FROM hr.employee
  WHERE tenant_id = NEW.tenant_id
    AND employment_link_id = NEW.id
  ORDER BY terminated_on DESC NULLS LAST, updated_at DESC
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO esocial.s2299_pending (tenant_id, employment_link_id, employee_id, calc_run_id)
  VALUES (NEW.tenant_id, NEW.id, v_employee_id, NEW.termination_payroll_run_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_es03_pending_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
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
  RETURN v_row;
END;
$$;

CREATE FUNCTION esocial.sgp_es04_emission_state_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_tenant_id uuid;
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 's1200_emission_state' THEN
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_resource_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id)::text
      || ':' || COALESCE(NEW.employee_id, OLD.employee_id)::text;
  ELSE
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_resource_id := COALESCE(NEW.payment_batch_id, OLD.payment_batch_id)::text
      || ':' || COALESCE(NEW.employee_id, OLD.employee_id)::text;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION esocial.sgp_es05_state_totalizer_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
  v_kind text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  IF TG_TABLE_NAME = 's1299_emission_state' THEN
    v_resource_id := v_row.competence::text;
    v_kind := 'S-1299';
  ELSE
    v_resource_id := v_row.competence::text || ':' || v_row.kind::text || ':' || v_row.source_event_recibo;
    v_kind := v_row.kind::text;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'competence', v_row.competence::text,
      'kind', v_kind
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

CREATE FUNCTION esocial.sgp_s2210_pending_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.cat_emission_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION esocial.sgp_s2220_pending_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.aso_record_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION esocial.sgp_s2240_pending_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.environmental_exposure_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'triggerEvent', v_row.trigger_event::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION esocial.sgp_s3000_is_periodic(p_event_kind text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT p_event_kind IN (
    'S-1200',
    'S-1202',
    'S-1207',
    'S-1210',
    'S-1280',
    'S-1300'
  )
$$;

CREATE FUNCTION esocial.sgp_s3000_prepare_request() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_event public.esocial_event;
  v_block_reason text;
BEGIN
  SELECT * INTO v_event
  FROM public.esocial_event
  WHERE id = NEW.target_event_id
    AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'S-3000 target event not found for tenant' USING ERRCODE = '23503';
  END IF;

  IF v_event.receipt_number IS NULL AND NULLIF(btrim(v_event.reference), '') IS NULL THEN
    RAISE EXCEPTION 'S-3000 target event requires accepted receipt' USING ERRCODE = '23514';
  END IF;

  IF v_event.status <> 'PROCESSADO_COM_SUCESSO'::public."ESocialEventStatus" THEN
    RAISE EXCEPTION 'S-3000 target event must be accepted before exclusion' USING ERRCODE = '23514';
  END IF;

  NEW.target_event_kind := COALESCE(NULLIF(btrim(NEW.target_event_kind), ''), v_event.event_type);
  NEW.target_recibo := COALESCE(NULLIF(btrim(NEW.target_recibo), ''), v_event.receipt_number, v_event.reference);
  NEW.updated_at := now();

  IF esocial.sgp_s3000_is_periodic(NEW.target_event_kind) THEN
    SELECT 'periodic_competence_closed_by_s1299'
    INTO v_block_reason
    FROM esocial.s1299_emission_state state
    WHERE state.tenant_id = NEW.tenant_id
      AND state.competence = to_date(v_event.competence || '-01', 'YYYY-MM-DD')
      AND state.status = 'ACCEPTED'::esocial.s1299_emission_status
    LIMIT 1;

    IF v_block_reason IS NOT NULL THEN
      NEW.status := 'BLOCKED';
      NEW.block_reason := v_block_reason;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE FUNCTION esocial.sgp_s3000_request_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row esocial.s3000_request;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'esocial.s3000_request',
    v_row.request_id::text,
    v_row.requested_by_user_id,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.s3000_request',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'targetEventId', v_row.target_event_id::text,
      'targetRecibo', v_row.target_recibo,
      'targetEventKind', v_row.target_event_kind,
      'status', v_row.status::text,
      'blockReason', v_row.block_reason,
      'requestedByUserId', v_row.requested_by_user_id,
      'justification', v_row.justification
    ),
    v_row.justification,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END
$$;
