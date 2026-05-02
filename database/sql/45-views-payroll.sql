CREATE VIEW payroll.v_payroll_run_line_active WITH (security_invoker='true') AS
 SELECT id,
    employee_id,
    payroll_run_id,
    earning_deduction_id,
    source,
    competence_year,
    competence_month,
    quantity,
    reference_value,
    amount,
    notes,
    created_at,
    updated_at,
    tenant_id,
    deleted_at,
    deleted_reason,
    idempotency_key
   FROM payroll.employee_payroll_item
  WHERE (deleted_at IS NULL);

CREATE VIEW payroll.v_termination_components WITH (security_invoker='true') AS
 SELECT item.tenant_id,
    item.payroll_run_id,
    item.employee_id,
    employee.employment_link_id,
    earning.code AS component_code,
    earning.description AS component_description,
    earning.kind AS component_kind,
    item.reference_value,
    item.quantity,
    item.amount,
    item.notes,
    item.created_at
   FROM ((((payroll.v_payroll_run_line_active item
     JOIN payroll.payroll_earning_deduction earning ON ((earning.id = item.earning_deduction_id)))
     JOIN payroll.payroll_run run ON ((run.id = item.payroll_run_id)))
     JOIN payroll.processing_type processing_type ON ((processing_type.id = run.processing_type_id)))
     JOIN hr.employee employee ON ((employee.id = item.employee_id)))
  WHERE ((processing_type.code = 'RESCISAO'::text) AND public.sgp_tenant_matches(item.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.execute'::text, 'rh.employee.terminate'::text, 'portal.paystub.read'::text]));

CREATE VIEW payroll.v_termination_with_notice WITH (security_invoker='true') AS
 SELECT component.tenant_id,
    component.payroll_run_id,
    component.employee_id,
    component.employment_link_id,
    component.component_code,
    component.component_description,
    component.component_kind,
    component.reference_value,
    component.quantity,
    component.amount,
    component.notes,
    component.created_at,
    notice.kind AS prior_notice_kind,
    notice.notice_days AS prior_notice_days,
    notice.projected_end_date AS prior_notice_projected_end_date,
    notice.base_amount AS prior_notice_base_amount,
    notice.reduction_mode AS prior_notice_reduction_mode
   FROM (payroll.v_termination_components component
     LEFT JOIN payment.prior_notice notice ON (((notice.tenant_id = component.tenant_id) AND (notice.employment_link_id = component.employment_link_id))))
  WHERE (public.sgp_tenant_matches(component.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.run.read'::text, 'payroll.run.write'::text]));
