CREATE VIEW payroll_calc.v_decimo_terceiro_avos AS
 WITH status_years AS (
         SELECT DISTINCT history.tenant_id,
            history.employee_id,
            employee.employment_link_id,
            year_value.year_value AS reference_year
           FROM ((hr.employee_status_history history
             JOIN hr.employee employee ON ((employee.id = history.employee_id)))
             CROSS JOIN LATERAL generate_series((EXTRACT(year FROM history.starts_on))::integer, (EXTRACT(year FROM COALESCE(history.ends_on, make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 12, 31))))::integer) year_value(year_value))
          WHERE (employee.employment_link_id IS NOT NULL)
        ), month_activity AS (
         SELECT status_years.tenant_id,
            status_years.employee_id,
            status_years.employment_link_id,
            status_years.reference_year,
            month_value.month_value,
            sum(GREATEST(((LEAST(COALESCE(history.ends_on, make_date(status_years.reference_year, 12, 31)), ((make_date(status_years.reference_year, month_value.month_value, 1) + '1 mon -1 days'::interval))::date) - GREATEST(history.starts_on, make_date(status_years.reference_year, month_value.month_value, 1))) + 1), 0)) AS active_days
           FROM (((status_years
             CROSS JOIN generate_series(1, 12) month_value(month_value))
             JOIN hr.employee_status_history history ON (((history.tenant_id = status_years.tenant_id) AND (history.employee_id = status_years.employee_id))))
             JOIN hr.functional_status functional_status ON (((functional_status.id = history.functional_status_id) AND (functional_status.enters_payroll = true))))
          WHERE ((history.starts_on <= ((make_date(status_years.reference_year, month_value.month_value, 1) + '1 mon -1 days'::interval))::date) AND (COALESCE(history.ends_on, make_date(status_years.reference_year, 12, 31)) >= make_date(status_years.reference_year, month_value.month_value, 1)))
          GROUP BY status_years.tenant_id, status_years.employee_id, status_years.employment_link_id, status_years.reference_year, month_value.month_value
        )
 SELECT tenant_id,
    employee_id,
    employment_link_id,
    reference_year,
    (count(*) FILTER (WHERE (active_days >= 15)))::integer AS avos
   FROM month_activity
  GROUP BY tenant_id, employee_id, employment_link_id, reference_year;
