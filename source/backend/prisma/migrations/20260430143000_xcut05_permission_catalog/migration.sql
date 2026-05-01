-- XCUT-05 canonical permission catalog consolidation.
-- The physical SGP v0.0.1 column is public.permission.key; it is the canonical permission code.
CREATE UNIQUE INDEX IF NOT EXISTS permission_key_key ON public.permission(key);

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('auth.read', 'auth', 'session', 'read', '/api/v1/auth/**', 'Read authenticated session and base navigation.'),
  ('iam.read', 'iam', 'permission', 'read', '/api/v1/iam/**', 'Read the permission catalog.'),
  ('gestao.read', 'gestao', 'admin', 'read', '#!/gestao/**', 'Read administration, security, parameters, users, profiles, and master data.'),
  ('gestao.write', 'gestao', 'admin', 'write', '#!/gestao/**', 'Mutate administration, security, parameters, users, profiles, and master data.'),
  ('rh.read', 'rh', 'employee', 'read', '#!/funcionario/**', 'Read RH employee lifecycle records.'),
  ('rh.write', 'rh', 'employee', 'write', '#!/funcionario/**', 'Mutate RH employee lifecycle records.'),
  ('folha.read', 'folha', 'payroll', 'read', '#!/folhaPagamento/**', 'Read payroll records, accounting catalogs, eSocial payroll surfaces, and calculations.'),
  ('folha.write', 'folha', 'payroll', 'write', '#!/folhaPagamento/**', 'Mutate payroll records, accounting catalogs, eSocial payroll surfaces, and calculations.'),
  ('avaliacao.read', 'avaliacao', 'performance', 'read', '#!/avaliacao/**', 'Read evaluation and career progression records.'),
  ('avaliacao.write', 'avaliacao', 'performance', 'write', '#!/avaliacao/**', 'Mutate evaluation and career progression records.'),
  ('consultas.read', 'consultas', 'managerial', 'read', '#!/consultas/**', 'Read managerial query surfaces.'),
  ('previdenciario.read', 'previdenciario', 'benefit', 'read', '#!/previdenciario/**', 'Read previdenciario records and reports.'),
  ('previdenciario.write', 'previdenciario', 'benefit', 'write', '#!/previdenciario/**', 'Mutate previdenciario records and reports.'),
  ('recrutamento.read', 'recrutamento', 'recruitment', 'read', '#!/recrutamento/**', 'Read recruitment records.'),
  ('recrutamento.write', 'recrutamento', 'recruitment', 'write', '#!/recrutamento/**', 'Mutate recruitment records.'),
  ('saude.read', 'saude', 'medical', 'read', '#!/saude/**', 'Read occupational health and pericia records.'),
  ('saude.write', 'saude', 'medical', 'write', '#!/saude/**', 'Mutate occupational health and pericia records.'),
  ('convenio.read', 'convenio', 'agreement', 'read', '#!/convenios/**', 'Read convenio records.'),
  ('convenio.write', 'convenio', 'agreement', 'write', '#!/convenios/**', 'Mutate convenio records.'),
  ('relatorio.read', 'relatorio', 'report', 'read', '#!/relatorio/**', 'Read report catalog and generated report status.'),
  ('relatorio.generate', 'relatorio', 'report', 'generate', '#!/relatorio/**', 'Generate or queue reports.'),
  ('documents.upload', 'documents', 'attachment', 'upload', '#!/documentos/**', 'Create document upload sessions.'),
  ('documents.register', 'documents', 'attachment', 'register', '#!/documentos/**', 'Confirm or register document attachments.'),
  ('documents.download', 'documents', 'attachment', 'download', '#!/documentos/**', 'Download document attachments.'),
  ('auditoria.read', 'auditoria', 'audit', 'read', '#!/auditoria/**', 'Read audit trail and audit report exports.')
), removed_profile_permissions AS (
  DELETE FROM public.profile_permission pp
  USING public.permission p
  WHERE p.id = pp.permission_id
    AND p.key NOT IN (SELECT key FROM canonical_permissions)
), upserted AS (
  INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
  SELECT key, module_key, resource_key, action_key, route_pattern, description
  FROM canonical_permissions
  ON CONFLICT (key) DO UPDATE
  SET
    module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING key
)
DELETE FROM public.permission
WHERE key NOT IN (SELECT key FROM canonical_permissions);
