export const reajusteE2eSpec = `
Covered by tests/backend/salary-history.e2e-spec.ts.

Scenario:
1. Create or use an existing PCCS salary range level.
2. POST /v1/avaliacao/salary-history/reajuste-massa with percentual,
   vigenciaInicio, leiReferencia, and salaryRangeId scope.
3. Verify the response lists affected levels, the previous validity is closed,
   and the timeline endpoint exposes the new salary base read-only.
`;
