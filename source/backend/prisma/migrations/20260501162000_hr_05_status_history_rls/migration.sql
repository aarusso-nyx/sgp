-- Allow HR-05 approval workflow to append the functional status timeline.

DROP POLICY IF EXISTS p_leave_status_history_write ON hr.employee_status_history;
CREATE POLICY p_leave_status_history_write ON hr.employee_status_history
  FOR INSERT
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.leave.approve', 'rh.write'])
  );
