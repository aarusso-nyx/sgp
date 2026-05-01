export const formulaCompileSpec = `
-- Exercised by npm run db:smoke in the FOL-01 rubrica assertions.
-- Assertions:
-- 1. payroll_calc.compile_formula returns ready=false with an error for an unsafe expression.
-- 2. Updating payroll.payroll_earning_deduction.formula_expression recompiles through the trigger.
-- 3. Invalid formula_expression leaves formula_ready=false and formula_error populated.
`;
