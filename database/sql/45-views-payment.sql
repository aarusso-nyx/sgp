CREATE VIEW payment.v_fgts_balance WITH (security_invoker='true') AS
 SELECT account.tenant_id,
    account.fgts_account_id,
    account.employee_id,
    account.employment_link_id,
    account.status,
    account.opened_at,
    account.closed_at,
    (COALESCE(sum(movement.amount) FILTER (WHERE (movement.kind = ANY (ARRAY['DEPOSIT_8'::payment.fgts_movement_kind, 'DEPOSIT_AVISO'::payment.fgts_movement_kind, 'ADJUSTMENT'::payment.fgts_movement_kind]))), (0)::numeric))::numeric(14,2) AS deposit_balance,
    (COALESCE(sum(movement.amount) FILTER (WHERE (movement.kind = 'RESCISION_FINE_40'::payment.fgts_movement_kind)), (0)::numeric))::numeric(14,2) AS rescission_fine_total,
    (count(movement.fgts_movement_id))::integer AS movement_count,
    max(movement.created_at) AS latest_movement_at
   FROM (payment.fgts_account account
     LEFT JOIN payment.fgts_movement movement ON (((movement.tenant_id = account.tenant_id) AND (movement.fgts_account_id = account.fgts_account_id))))
  WHERE (public.sgp_tenant_matches(account.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read'::text, 'payroll.fgts.write'::text]))
  GROUP BY account.tenant_id, account.fgts_account_id, account.employee_id, account.employment_link_id, account.status, account.opened_at, account.closed_at;

CREATE VIEW payment.v_pis_pasep_year WITH (security_invoker='true') AS
 SELECT base.tenant_id,
    base.employee_id,
    employee.registration,
    employee.name AS employee_name,
    employee.cpf,
    base.year_base,
    (base.program)::text AS program,
    base.monthly_base,
    base.total_base,
    base.updated_at
   FROM (payment.pis_pasep_base_year base
     JOIN hr.employee employee ON (((employee.tenant_id = base.tenant_id) AND (employee.id = base.employee_id))))
  WHERE (public.sgp_tenant_matches(base.tenant_id) AND public.sgp_has_any_permission(ARRAY['payroll.payroll.read'::text, 'payroll.payroll.write'::text]));
