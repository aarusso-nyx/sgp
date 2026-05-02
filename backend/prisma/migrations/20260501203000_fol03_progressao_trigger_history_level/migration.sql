CREATE OR REPLACE FUNCTION avaliacao.apply_merit_progression()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_salary numeric(14,2);
  v_level_code text;
  v_level_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR NEW.status <> 'applied'::hr.progression_status THEN
    RETURN NEW;
  END IF;

  IF NEW.target_salary_range_level_id IS NULL THEN
    RAISE EXCEPTION 'Applied progression % must have target_salary_range_level_id', NEW.id;
  END IF;

  SELECT
    avaliacao.fn_get_vencimento_vigente(NEW.target_salary_range_level_id, NEW.data_efeito),
    level.code,
    level.name
  INTO v_target_salary, v_level_code, v_level_name
  FROM hr.salary_range_level level
  WHERE level.id = NEW.target_salary_range_level_id
    AND level.tenant_id = NEW.tenant_id;

  IF v_target_salary IS NULL THEN
    RAISE EXCEPTION 'Target salary range level % not found for tenant %', NEW.target_salary_range_level_id, NEW.tenant_id;
  END IF;

  INSERT INTO hr.salary_level_history (
    tenant_id,
    employee_id,
    salary_range_level_id,
    salary_reference_id,
    level_code,
    level_description,
    adjustment_amount,
    effective_on,
    vigencia_inicio,
    vigencia_fim,
    vencimento_basico,
    motivo,
    lei_referencia
  )
  VALUES (
    NEW.tenant_id,
    NEW.employee_id,
    NEW.target_salary_range_level_id,
    NEW.target_salary_reference_id,
    v_level_code,
    v_level_name,
    0,
    NEW.data_efeito,
    NEW.data_efeito,
    NULL,
    v_target_salary,
    'reestruturacao',
    COALESCE(NEW.appointment_act, '')
  )
  ON CONFLICT DO NOTHING;

  UPDATE hr.employee
  SET salary_range_level_id = NEW.target_salary_range_level_id,
    salary_reference_id = COALESCE(NEW.target_salary_reference_id, salary_reference_id),
    updated_at = now()
  WHERE id = NEW.employee_id
    AND tenant_id = NEW.tenant_id;

  NEW.applied_at = COALESCE(NEW.applied_at, now());
  RETURN NEW;
END;
$$;
