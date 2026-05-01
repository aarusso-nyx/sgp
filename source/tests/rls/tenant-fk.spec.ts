export const tenantFkSpec = `
-- Exercised by npm run db:smoke in 99-xcut03-rls-hardening.sql.
-- Assertion:
-- INSERT into a tenant-scoped table with
-- 00000000-0000-0000-0000-000000000000 fails with foreign_key_violation.
`;
