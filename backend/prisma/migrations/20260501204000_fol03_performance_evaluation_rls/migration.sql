ALTER TABLE hr.performance_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.performance_evaluation FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS performance_evaluation_select ON hr.performance_evaluation;
CREATE POLICY performance_evaluation_select ON hr.performance_evaluation
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY[
          'avaliacao.read',
          'avaliacao.write',
          'avaliacao.progressao.read',
          'avaliacao.progressao.simulate',
          'avaliacao.progressao.apply'
        ]
      )
    )
  );
