CREATE OR REPLACE FUNCTION payroll_calc.compute_rpps(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = payroll_calc, hr, payroll, public, pg_catalog
AS $$
DECLARE
  v_contract_type text;
  v_effective_base numeric;
  v_ceiling numeric;
  v_effective_start date;
  v_amount numeric := 0;
  v_slice numeric;
  v_upper numeric;
  v_original_tenant text;
  v_rate record;
BEGIN
  SELECT link.contract_type
  INTO v_contract_type
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = p_tenant_id;

  IF COALESCE(v_contract_type, '') <> 'statutory' THEN
    v_original_tenant := current_setting('app.current_tenant_id', true);
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'payroll.rpps', p_employment_link_id::text, NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll_calc.compute_rpps',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'payroll.rpps.bypassed',
        'employmentLinkId', p_employment_link_id,
        'contractType', v_contract_type,
        'competence', p_competence
      ),
      NULL::text, NULL::text, NULL::text
    );
    PERFORM set_config('app.current_tenant_id', COALESCE(v_original_tenant, ''), true);
    RETURN 0.00;
  END IF;

  v_ceiling := COALESCE(payroll_calc.rpps_ceiling(p_tenant_id), 0);
  v_effective_base := greatest(COALESCE(p_base_amount, 0), 0);
  IF v_ceiling > 0 THEN
    v_effective_base := least(v_effective_base, v_ceiling);
  END IF;

  IF v_effective_base <= 0 THEN
    RETURN 0.00;
  END IF;

  SELECT max(rate.competence_start)
  INTO v_effective_start
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'RPPS'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence);

  IF v_effective_start IS NULL THEN
    RETURN 0.00;
  END IF;

  FOR v_rate IN
    SELECT bracket_min, bracket_max, rate
    FROM public.tax_rate rate
    WHERE rate.tenant_id = p_tenant_id
      AND rate.kind = 'RPPS'
      AND rate.status = 'ACTIVE'::public."RecordStatus"
      AND rate.competence_start = v_effective_start
      AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
      AND rate.bracket_min <= v_effective_base
    ORDER BY rate.bracket_min ASC
  LOOP
    v_upper := least(v_effective_base, COALESCE(v_rate.bracket_max, v_effective_base));
    v_slice := greatest(v_upper - v_rate.bracket_min + 0.01, 0);
    IF v_rate.bracket_min = 0 THEN
      v_slice := greatest(v_upper, 0);
    END IF;
    v_amount := v_amount + (v_slice * COALESCE(v_rate.rate, 0) / 100);
  END LOOP;

  RETURN round(v_amount, 2)::numeric(14, 2);
END;
$$;
