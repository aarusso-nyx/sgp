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
