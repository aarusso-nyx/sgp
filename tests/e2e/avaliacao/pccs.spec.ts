export const pccsE2eSpec = `
Covered by tests/backend/pccs.e2e-spec.ts.

Scenario:
1. Cadastrar PCCS em /v1/avaliacao/career-plan.
2. Vincular cargo e faixa salarial via career_plan_job_position e salary_range.career_plan_id.
3. Consultar /v1/avaliacao/career-plan/:id/trilha e validar a trilha atual.
`;
