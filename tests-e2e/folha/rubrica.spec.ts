export const rubricaE2eSpec = `
Covered by source/backend/test/rubrica.e2e-spec.ts and npm run db:smoke.

Scenario:
1. Create rubrica VENC with formula base_salary(p_employee_id, make_date(p_year, p_month, 1)) and one decimal attribute.
2. Validate formula through POST /v1/folha/rubrica/compile.
3. Preview through POST /v1/folha/rubrica/:id/preview and assert a non-null numeric amount.
4. Link the rubrica to a cargo through payroll.job_position_earning.
`;
