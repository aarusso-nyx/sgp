export const salaryHistoryOverlapSpec = `
-- Exercised by npm run db:smoke in FOL-05 salary-history assertions.
-- Assertions:
-- 1. avaliacao.fn_get_vencimento_vigente returns the correct base salary for
--    three different competences.
-- 2. hr.salary_level_history prevents overlapping validity windows for the
--    same tenant and salary_range_level_id with exclusion_violation.
-- 3. Mass salary-base history remains tenant-scoped through
--    avaliacao.salary_history.read/write RLS policies.
`;
