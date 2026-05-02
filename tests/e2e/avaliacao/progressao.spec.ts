export const progressaoE2eSpec = `
Covered by tests/backend/progression.e2e-spec.ts.

Scenario:
1. Check eligibility through /v1/avaliacao/progression/eligibility.
2. POST /v1/avaliacao/progression/simulate and assert the simulation uses avaliacao.fn_get_vencimento_vigente.
3. POST /v1/avaliacao/progression/:id/apply.
4. Verify the applied path emits audit event avaliacao.progressao.applied and a repeated apply returns HTTP 409.
`;
