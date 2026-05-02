export const movimentacaoE2eSpec = `
-- Exercised by tests/backend/movimentacao.e2e-spec.ts and npm run test:e2e.
-- Assertions:
-- employee transfer requests can be created, approved, and effected through /api/v1/rh/employee-transfer.
-- effecting inside a closed payroll competence returns 422.
-- database smoke asserts audit_event metadata event rh.movimentacao.efetivada.
`;
