CREATE MATERIALIZED VIEW portal.mv_employee_directory AS
 SELECT e.tenant_id,
    t.slug AS tenant_slug,
    e.id,
    e.registration,
    e.cpf,
    e.name,
    e.lifecycle_status,
    b.code AS branch_code,
    b.name AS branch_name,
    wl.code AS work_location_code,
    wl.name AS work_location_name,
    fs.code AS functional_status_code,
    fs.description AS functional_status,
    el.code AS employment_link_code,
    el.name AS employment_link,
    jp.code AS job_position_code,
    jp.name AS job_position,
    jf.code AS job_function_code,
    jf.name AS job_function
   FROM (((((((hr.employee e
     JOIN public.tenant t ON ((t.id = e.tenant_id)))
     LEFT JOIN hr.branch b ON ((b.id = e.branch_id)))
     LEFT JOIN hr.work_location wl ON ((wl.id = e.work_location_id)))
     LEFT JOIN hr.functional_status fs ON ((fs.id = e.functional_status_id)))
     LEFT JOIN hr.employment_link el ON ((el.id = e.employment_link_id)))
     LEFT JOIN hr.job_position jp ON ((jp.id = e.job_position_id)))
     LEFT JOIN hr.job_function jf ON ((jf.id = e.job_function_id)))
  WITH NO DATA;

CREATE MATERIALIZED VIEW portal.mv_payroll_run_summary AS
 SELECT pr.tenant_id,
    t.slug AS tenant_slug,
    pr.id,
    pr.competence_year,
    pr.competence_month,
    pr.status,
    b.code AS branch_code,
    b.name AS branch_name,
    pt.code AS payroll_type_code,
    pt.description AS payroll_type,
    pty.code AS processing_type_code,
    pty.description AS processing_type,
    pr.employee_count,
    pr.total_earnings,
    pr.total_deductions,
    pr.total_net,
    pr.created_at,
    pr.closed_at
   FROM ((((payroll.payroll_run pr
     JOIN public.tenant t ON ((t.id = pr.tenant_id)))
     LEFT JOIN hr.branch b ON ((b.id = pr.branch_id)))
     JOIN payroll.payroll_type pt ON ((pt.id = pr.payroll_type_id)))
     JOIN payroll.processing_type pty ON ((pty.id = pr.processing_type_id)))
  WITH NO DATA;

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

CREATE UNIQUE INDEX mv_employee_directory_id_idx ON portal.mv_employee_directory USING btree (id);

CREATE INDEX mv_employee_directory_tenant_id_idx ON portal.mv_employee_directory USING btree (tenant_id, id);

CREATE INDEX mv_employee_directory_tenant_slug_idx ON portal.mv_employee_directory USING btree (tenant_slug, id);

CREATE UNIQUE INDEX mv_payroll_run_summary_id_idx ON portal.mv_payroll_run_summary USING btree (id);

CREATE INDEX mv_payroll_run_summary_tenant_id_idx ON portal.mv_payroll_run_summary USING btree (tenant_id, id);

CREATE INDEX mv_payroll_run_summary_tenant_slug_idx ON portal.mv_payroll_run_summary USING btree (tenant_slug, id);
