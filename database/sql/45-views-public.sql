CREATE VIEW public.v_permission_catalog AS
 SELECT key AS permission_key,
    module_key,
    resource_key,
    action_key,
    route_pattern,
    description,
    created_at,
    updated_at
   FROM public.permission p;

CREATE VIEW public.v_profile_permission_matrix AS
 SELECT ap.code AS profile_code,
    ap.name AS profile_name,
    p.key AS permission_key,
    p.module_key,
    p.resource_key,
    p.action_key,
    pp.allowed
   FROM ((public.access_profile ap
     JOIN public.profile_permission pp ON ((pp.profile_id = ap.id)))
     JOIN public.permission p ON ((p.id = pp.permission_id)));
