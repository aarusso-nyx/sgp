# Database Seeds

Seed files are deterministic fixtures for local development, API tests, and permission-matrix tests. They are documentation-first JSON payloads and must not contain secrets, passwords, tokens, or real credentials.

## Files

- `permission-catalog.json`: baseline modules and route/action permissions used by v0.0.1 seed workflows.
- `master-data-baseline.json`: minimal lookup data needed to create employees, payroll runs, and reports.
- `fixture-scenarios.json`: representative non-sensitive HR, payroll, report, and convenio scenarios for local/test databases.

## Loading Policy

- Apply Prisma migrations first.
- Load seed files with `npm --prefix source run db -- seed` (or `npm --prefix source run db:seed`) or a controlled SQL loader.
- Use stable business codes from these files for idempotent upserts.
- Never store real `APP_LOGIN`, passwords, Cognito tokens, or production CPF/CNPJ values here.
- Test users must use placeholder identifiers and external authentication must be mocked or provisioned separately.

## Suggested Order

1. `permission-catalog.json`
2. `master-data-baseline.json`
3. `fixture-scenarios.json`
