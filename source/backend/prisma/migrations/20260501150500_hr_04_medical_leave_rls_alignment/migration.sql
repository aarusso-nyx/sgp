ALTER TABLE hr.medical_appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_appointment FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_record FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_leave FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_record FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_appointment_select ON hr.medical_appointment;
DROP POLICY IF EXISTS medical_appointment_write ON hr.medical_appointment;
DROP POLICY IF EXISTS p_medical_appointment_select ON hr.medical_appointment;
DROP POLICY IF EXISTS p_medical_appointment_write ON hr.medical_appointment;
CREATE POLICY p_medical_appointment_select ON hr.medical_appointment
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.appointment.write'])
  );
CREATE POLICY p_medical_appointment_write ON hr.medical_appointment
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
  );

DROP POLICY IF EXISTS medical_record_select ON hr.medical_record;
DROP POLICY IF EXISTS medical_record_write ON hr.medical_record;
DROP POLICY IF EXISTS p_medical_record_select ON hr.medical_record;
DROP POLICY IF EXISTS p_medical_record_write ON hr.medical_record;
CREATE POLICY p_medical_record_select ON hr.medical_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.opinion.write'])
  );
CREATE POLICY p_medical_record_write ON hr.medical_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  );

DROP POLICY IF EXISTS medical_leave_select ON hr.medical_leave;
DROP POLICY IF EXISTS medical_leave_write ON hr.medical_leave;
DROP POLICY IF EXISTS p_medical_leave_select ON hr.medical_leave;
DROP POLICY IF EXISTS p_medical_leave_write ON hr.medical_leave;
CREATE POLICY p_medical_leave_select ON hr.medical_leave
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read', 'saude.read', 'saude.opinion.write'])
  );
CREATE POLICY p_medical_leave_write ON hr.medical_leave
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  );

DROP POLICY IF EXISTS p_leave_record_select ON hr.leave_record;
DROP POLICY IF EXISTS p_leave_record_write ON hr.leave_record;
CREATE POLICY p_leave_record_select ON hr.leave_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read', 'rh.read', 'rh.write'])
  );
CREATE POLICY p_leave_record_write ON hr.leave_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write', 'rh.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write', 'rh.write'])
  );

WITH hr04_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.appointment.write', 'saude', 'appointment', 'write', '/api/v1/licencas/saude/agendamento', 'Schedule official medical pericia appointments.'),
    ('saude.opinion.write', 'saude', 'opinion', 'write', '/api/v1/pericia/**', 'Record official medical pericia opinions.'),
    ('rh.medical_leave.read', 'rh', 'medical_leave', 'read', '/api/v1/licencas/saude/**', 'Read employee medical leave records.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM hr04_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.tenant_id = public.sgp_current_tenant_uuid()
  AND ap.code IN ('ADMIN', 'RH_OPERADOR')
  AND p.key IN ('saude.appointment.write', 'saude.opinion.write', 'rh.medical_leave.read')
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;
