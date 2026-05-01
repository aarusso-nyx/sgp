CREATE SCHEMA IF NOT EXISTS avaliacao;

CREATE OR REPLACE FUNCTION avaliacao.fn_get_vencimento_vigente(
  p_salary_range_level_id uuid,
  p_competencia date
)
RETURNS numeric(14,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT history.vencimento_basico
      FROM hr.salary_level_history history
      WHERE history.salary_range_level_id = p_salary_range_level_id
        AND history.vigencia_inicio <= p_competencia
        AND (history.vigencia_fim IS NULL OR history.vigencia_fim >= p_competencia)
      ORDER BY history.vigencia_inicio DESC
      LIMIT 1
    ),
    (
      SELECT level.base_salary
      FROM hr.salary_range_level level
      WHERE level.id = p_salary_range_level_id
    ),
    0
  )::numeric(14,2);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.base_salary(
  p_employee_id uuid,
  p_competence date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    CASE
      WHEN srl.id IS NOT NULL THEN avaliacao.fn_get_vencimento_vigente(srl.id, p_competence)
      ELSE NULL
    END,
    sr.amount,
    0
  )
  FROM hr.employee e
  LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
  LEFT JOIN hr.job_position jp ON jp.id = e.job_position_id
  LEFT JOIN hr.salary_range_level srl ON srl.salary_range_id = jp.salary_range_id
  WHERE e.id = p_employee_id
  ORDER BY srl.class_number, srl.level_number_fol02
  LIMIT 1;
$$;
