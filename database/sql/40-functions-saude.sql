CREATE FUNCTION saude.exposure_read_for_payroll(p_employee_id uuid, p_ref_date date) RETURNS TABLE(environmental_exposure_id uuid, harmful_agent_code text, agent_kind saude.harmful_agent_kind, intensity_value numeric, intensity_unit text, mitigated_by_epi boolean, mitigated_by_epc boolean, special_retirement_eligible boolean, insalubrity_due boolean, danger_pay_due boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'saude', 'public', 'pg_catalog'
    AS $$
  SELECT
    exposure.id,
    exposure.harmful_agent_code,
    exposure.agent_kind,
    exposure.intensity_value,
    exposure.intensity_unit,
    exposure.mitigated_by_epi,
    exposure.mitigated_by_epc,
    exposure.special_retirement_eligible,
    (
      exposure.harmful_agent_code = '01.01.001'
      AND COALESCE(exposure.intensity_value, 0) > 85
      AND exposure.mitigated_by_epi = false
    ) AS insalubrity_due,
    (
      exposure.agent_kind = 'ACIDENTE'::saude.harmful_agent_kind
      AND exposure.special_retirement_eligible = true
    ) AS danger_pay_due
  FROM saude.environmental_exposure exposure
  WHERE exposure.employee_id = p_employee_id
    AND exposure.exposure_start <= p_ref_date
    AND (exposure.exposure_end IS NULL OR exposure.exposure_end >= p_ref_date)
    AND public.sgp_tenant_matches(exposure.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'payroll.run.execute', 'folha.write']);
$$;

CREATE FUNCTION saude.sst01_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
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
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION saude.sst01_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION saude.sst02_block_program_revision_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'program_revision is append-only';
END;
$$;

CREATE FUNCTION saude.sst03_validate_cat_emission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_accident saude.work_accident%ROWTYPE;
BEGIN
  SELECT * INTO v_accident
  FROM saude.work_accident
  WHERE id = NEW.work_accident_id
    AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAT emission requires a same-tenant work_accident';
  END IF;

  IF NEW.cat_kind = 'OBITO'::saude.cat_kind AND v_accident.death_at IS NULL THEN
    RAISE EXCEPTION 'OBITO CAT requires work_accident.death_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION saude.sst03_validate_work_accident_state() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NOT (
      (OLD.status = 'REGISTRADO'::saude.work_accident_status AND NEW.status = 'COMUNICADO'::saude.work_accident_status)
      OR (OLD.status = 'COMUNICADO'::saude.work_accident_status AND NEW.status IN ('REABERTO'::saude.work_accident_status, 'COMUNICACAO_OBITO'::saude.work_accident_status, 'ENCERRADO'::saude.work_accident_status))
      OR (OLD.status = 'REABERTO'::saude.work_accident_status AND NEW.status IN ('COMUNICACAO_OBITO'::saude.work_accident_status, 'ENCERRADO'::saude.work_accident_status))
      OR (OLD.status = 'COMUNICACAO_OBITO'::saude.work_accident_status AND NEW.status = 'ENCERRADO'::saude.work_accident_status)
    ) THEN
      RAISE EXCEPTION 'invalid work_accident status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'ENCERRADO'::saude.work_accident_status
     AND NEW.severity = 'FATAL'::saude.work_accident_severity
     AND NOT EXISTS (
       SELECT 1
       FROM saude.cat_emission cat
       WHERE cat.tenant_id = NEW.tenant_id
         AND cat.work_accident_id = NEW.id
         AND cat.cat_kind = 'OBITO'::saude.cat_kind
     ) THEN
    RAISE EXCEPTION 'fatal work_accident requires OBITO CAT before closing';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION saude.sst05_block_ppp_record_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'ppp_record is append-only';
END;
$$;

CREATE FUNCTION saude.sst05_validate_environmental_exposure() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_pgr saude.risk_management_program%ROWTYPE;
  v_employee_tenant uuid;
BEGIN
  SELECT * INTO v_pgr
  FROM saude.risk_management_program
  WHERE id = NEW.risk_management_program_id
    AND tenant_id = NEW.tenant_id
    AND kind = 'PGR'::saude.risk_management_program_kind;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'environmental_exposure requires a same-tenant PGR';
  END IF;

  IF v_pgr.status <> 'ACTIVE'::saude.program_status
     OR NEW.exposure_start < v_pgr.valid_from
     OR NEW.exposure_start > v_pgr.valid_until THEN
    RAISE EXCEPTION 'environmental_exposure requires an ACTIVE PGR covering exposure_start';
  END IF;

  SELECT tenant_id INTO v_employee_tenant
  FROM hr.employee
  WHERE id = NEW.employee_id;

  IF v_employee_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'environmental_exposure requires a same-tenant employee';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION saude.sst05_validate_epi_delivery() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_employee_tenant uuid;
  v_inventory_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_employee_tenant FROM hr.employee WHERE id = NEW.employee_id;
  SELECT tenant_id INTO v_inventory_tenant FROM saude.epi_inventory WHERE id = NEW.epi_inventory_id;

  IF v_employee_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'epi_delivery requires a same-tenant employee';
  END IF;

  IF v_inventory_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'epi_delivery requires a same-tenant EPI inventory item';
  END IF;

  RETURN NEW;
END;
$$;
