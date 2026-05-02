CREATE VIEW portal.v_employee_paystub WITH (security_invoker='true') AS
 SELECT run.tenant_id,
    run.id AS payroll_run_id,
    employee.id AS employee_id,
    employee.registration,
    employee.name AS employee_name,
    run.competence_year,
    run.competence_month,
    (run.status)::text AS payroll_status,
    competence.status AS competence_status,
    financial.total_earnings,
    financial.total_deductions,
    financial.net_amount,
    financial.generated_at,
    COALESCE(jsonb_agg(jsonb_build_object('code', earning.code, 'description', earning.description, 'kind', (earning.kind)::text, 'quantity', item.quantity, 'referenceValue', item.reference_value, 'amount', item.amount, 'notes', item.notes) ORDER BY (earning.kind)::text, earning.code) FILTER (WHERE (item.id IS NOT NULL)), '[]'::jsonb) AS lines
   FROM (((((payroll.payroll_run run
     JOIN hr.competence_period competence ON (((competence.tenant_id = run.tenant_id) AND (competence.competence_year = run.competence_year) AND (competence.competence_month = run.competence_month))))
     JOIN payroll.payroll_financial_record financial ON (((financial.tenant_id = run.tenant_id) AND (financial.payroll_run_id = run.id))))
     JOIN hr.employee employee ON (((employee.tenant_id = run.tenant_id) AND (employee.id = financial.employee_id))))
     LEFT JOIN payroll.v_payroll_run_line_active item ON (((item.tenant_id = run.tenant_id) AND (item.payroll_run_id = run.id) AND (item.employee_id = employee.id))))
     LEFT JOIN payroll.payroll_earning_deduction earning ON ((earning.id = item.earning_deduction_id)))
  WHERE ((competence.status = ANY (ARRAY['GENERATED'::text, 'CLOSED'::text])) AND (run.status = ANY (ARRAY['GENERATED'::public."PayrollRunStatus", 'CLOSED'::public."PayrollRunStatus"])) AND public.sgp_tenant_matches(run.tenant_id) AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'::text]))
  GROUP BY run.tenant_id, run.id, employee.id, employee.registration, employee.name, run.competence_year, run.competence_month, run.status, competence.status, financial.total_earnings, financial.total_deductions, financial.net_amount, financial.generated_at;
