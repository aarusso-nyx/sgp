CREATE VIEW ponto.v_timesheet_payroll_input AS
 SELECT aggregate.tenant_id,
    aggregate.employee_id,
    aggregate.period_start,
    aggregate.period_end,
    aggregate.worked_minutes,
    aggregate.expected_minutes,
    aggregate.overtime_50_minutes,
    aggregate.overtime_100_minutes,
    aggregate.night_minutes,
    aggregate.late_minutes,
    aggregate.absence_unpaid_minutes,
    aggregate.absence_paid_minutes,
    aggregate.hour_bank_settlement_minutes
   FROM (ponto.timesheet_period period
     CROSS JOIN LATERAL ponto.fn_aggregate_timesheet(period.tenant_id, period.employee_id, period.period_start, period.period_end) aggregate(tenant_id, employee_id, period_start, period_end, worked_minutes, expected_minutes, overtime_50_minutes, overtime_100_minutes, night_minutes, late_minutes, absence_unpaid_minutes, absence_paid_minutes, hour_bank_settlement_minutes));
