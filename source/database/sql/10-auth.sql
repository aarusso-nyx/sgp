-- Security and authorization convenience views.
-- Permission truth remains in Prisma-owned public.permission/profile tables.
CREATE OR REPLACE VIEW public.v_permission_catalog AS
SELECT
  p.key AS permission_key,
  p.module_key,
  p.resource_key,
  p.action_key,
  p.route_pattern,
  p.description,
  p.created_at,
  p.updated_at
FROM public.permission p;

CREATE OR REPLACE VIEW public.v_profile_permission_matrix AS
SELECT
  ap.code AS profile_code,
  ap.name AS profile_name,
  p.key AS permission_key,
  p.module_key,
  p.resource_key,
  p.action_key,
  pp.allowed
FROM public.access_profile ap
JOIN public.profile_permission pp ON pp.profile_id = ap.id
JOIN public.permission p ON p.id = pp.permission_id;
