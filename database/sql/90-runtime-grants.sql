-- Runtime grants for externally provisioned application roles.
-- Fresh local smoke runs create these roles before applying canonical SQL.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA
      public,
      hr,
      payroll,
      payroll_calc,
      portal,
      esocial,
      payment,
      fiscal,
      saude,
      ponto,
      recrutamento,
      tce,
      public_data,
      avaliacao
    TO sgp_app_role;

    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
      public,
      hr,
      payroll,
      payroll_calc,
      portal,
      esocial,
      payment,
      fiscal,
      saude,
      ponto,
      recrutamento,
      tce,
      public_data,
      avaliacao
    TO sgp_app_role;

    GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA
      public,
      hr,
      payroll,
      payroll_calc,
      portal,
      esocial,
      payment,
      fiscal,
      saude,
      ponto,
      recrutamento,
      tce,
      public_data,
      avaliacao
    TO sgp_app_role;

    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA
      public,
      hr,
      payroll,
      payroll_calc,
      portal,
      esocial,
      payment,
      fiscal,
      saude,
      ponto,
      recrutamento,
      tce,
      public_data,
      avaliacao
    TO sgp_app_role;

    REVOKE UPDATE, DELETE ON public.audit_event FROM sgp_app_role;
    REVOKE UPDATE, DELETE ON hr.employee_status_history FROM sgp_app_role;
    REVOKE UPDATE, DELETE ON ponto.time_record_identity FROM sgp_app_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_portal_api') THEN
    GRANT USAGE ON SCHEMA portal TO sgp_portal_api;
    GRANT SELECT ON ALL TABLES IN SCHEMA portal TO sgp_portal_api;
    REVOKE ALL ON SCHEMA hr FROM sgp_portal_api;
    REVOKE ALL ON SCHEMA payroll FROM sgp_portal_api;
    REVOKE ALL ON ALL TABLES IN SCHEMA hr FROM sgp_portal_api;
    REVOKE ALL ON ALL TABLES IN SCHEMA payroll FROM sgp_portal_api;
  END IF;
END
$$;
