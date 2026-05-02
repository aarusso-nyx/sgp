CREATE VIEW hr.v_employee_career_history AS
 SELECT history.tenant_id,
    history.employee_id,
    history.id AS event_id,
    'functional_status'::text AS event_type,
    history.starts_on AS event_date,
    history.ends_on,
    status.description AS title,
    history.notes,
    jsonb_build_object('functionalStatusId', history.functional_status_id, 'reasonId', history.reason_id) AS metadata
   FROM (hr.employee_status_history history
     JOIN hr.functional_status status ON ((status.id = history.functional_status_id)))
UNION ALL
 SELECT vacation_record.tenant_id,
    vacation_record.employee_id,
    vacation_record.id AS event_id,
    'vacation'::text AS event_type,
    vacation_record.starts_on AS event_date,
    vacation_record.ends_on,
    'Ferias'::text AS title,
    ''::text AS notes,
    jsonb_build_object('days', vacation_record.days, 'status', vacation_record.status) AS metadata
   FROM hr.vacation_record
UNION ALL
 SELECT leave_record.tenant_id,
    leave_record.employee_id,
    leave_record.id AS event_id,
    'leave'::text AS event_type,
    leave_record.starts_on AS event_date,
    leave_record.ends_on,
    COALESCE(reason.description, 'Licenca'::text) AS title,
    leave_record.notes,
    jsonb_build_object('days', leave_record.days, 'status', (leave_record.status)::text, 'absenceReasonId', leave_record.absence_reason_id) AS metadata
   FROM (hr.leave_record
     LEFT JOIN hr.absence_reason reason ON ((reason.id = leave_record.absence_reason_id)))
UNION ALL
 SELECT medical_leave.tenant_id,
    medical_leave.employee_id,
    medical_leave.id AS event_id,
    'medical_leave'::text AS event_type,
    medical_leave.starts_on AS event_date,
    medical_leave.ends_on,
    'Licenca medica'::text AS title,
    ''::text AS notes,
    jsonb_build_object('days', medical_leave.granted_days, 'status', (medical_leave.status)::text) AS metadata
   FROM hr.medical_leave
UNION ALL
 SELECT service_time_record.tenant_id,
    service_time_record.employee_id,
    service_time_record.id AS event_id,
    'service_time'::text AS event_type,
    service_time_record.starts_on AS event_date,
    service_time_record.ends_on,
    service_time_record.source AS title,
    service_time_record.notes,
    jsonb_build_object('daysCount', service_time_record.days_count) AS metadata
   FROM hr.service_time_record
  ORDER BY 5 DESC, 3 DESC;

CREATE VIEW hr.v_vacation_balance AS
 WITH active_contract AS (
         SELECT DISTINCT ON (contract.employee_id) contract.tenant_id,
            contract.employee_id,
            COALESCE(contract.exercise_on, contract.starts_on) AS exercise_on
           FROM hr.employment_contract contract
          WHERE (contract.status = 'ACTIVE'::public."RecordStatus")
          ORDER BY contract.employee_id, contract.starts_on DESC
        ), periods AS (
         SELECT contract.tenant_id,
            contract.employee_id,
            ((contract.exercise_on + ((series.n || ' years'::text))::interval))::date AS accrual_period_start,
            (((contract.exercise_on + (((series.n + 1) || ' years'::text))::interval) - '1 day'::interval))::date AS accrual_period_end
           FROM (active_contract contract
             CROSS JOIN LATERAL generate_series(0, GREATEST(0, (EXTRACT(year FROM age((CURRENT_DATE)::timestamp with time zone, (contract.exercise_on)::timestamp with time zone)))::integer)) series(n))
          WHERE (contract.exercise_on IS NOT NULL)
        )
 SELECT periods.tenant_id,
    periods.employee_id,
    periods.accrual_period_start,
    periods.accrual_period_end,
        CASE
            WHEN (CURRENT_DATE > periods.accrual_period_end) THEN 30
            ELSE 0
        END AS accrued_days,
    (COALESCE(sum(record.days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint))::integer AS used_days,
    (COALESCE(sum(record.pecuniary_bonus_days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint))::integer AS pecuniary_bonus_days,
    (GREATEST(((
        CASE
            WHEN (CURRENT_DATE > periods.accrual_period_end) THEN 30
            ELSE 0
        END - COALESCE(sum(record.days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint)) - COALESCE(sum(record.pecuniary_bonus_days) FILTER (WHERE (record.status = ANY (ARRAY['aprovado'::text, 'gozado'::text]))), (0)::bigint)), (0)::bigint))::integer AS available_days
   FROM (periods
     LEFT JOIN hr.vacation_record record ON (((record.tenant_id = periods.tenant_id) AND (record.employee_id = periods.employee_id) AND (record.accrual_period_start = periods.accrual_period_start) AND (record.accrual_period_end = periods.accrual_period_end) AND (record.status <> 'cancelado'::text))))
  GROUP BY periods.tenant_id, periods.employee_id, periods.accrual_period_start, periods.accrual_period_end;
