DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT ON payroll.v_payroll_run_line_active TO sgp_app_role;
  END IF;
END
$$;
