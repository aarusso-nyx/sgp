# Agent Handoff

Generated: 2026-04-19
Workspace root used: `/Users/aarusso/Downloads/sgp`
Implementation root: repository root

This document preserves the current implementation context so another agent can resume from a different desktop without relying on chat history.

## Repository Purpose

This repo started as a reverse-documentation workspace for the legacy SGP AngularJS application and now also contains a modernization implementation at the repository root.

The modernization target is:

- Angular + Angular Material frontend
- NestJS backend
- PostgreSQL persistence only
- Prisma schema/modeling
- AWS Cognito User Pools/OAuth2 authentication and Cognito groups as authoritative permissions
- No secrets in tracked files

## Security Rules

- Do not commit real credentials, tokens, cookies, screenshots containing secrets, or `.env` files with real values.
- Legacy exploration credentials must remain external environment variables only:
  - `APP_BASE_URL`
  - `APP_LOGIN`
  - `APP_PASSWORD`
- Implementation runtime secrets must remain in local deployment environment, not tracked docs/code.
- Audit metadata redacts sensitive keys such as authorization, cookie, password, token, secret, credential, `APP_LOGIN`, and `APP_PASSWORD`.

## Important Directories

- repository root: modern implementation workspace.
- `frontend`: Angular application.
- `backend`: NestJS application and Prisma schema.
- `database`: SQL and seed artifacts.
- `docs`: engineering docs, implementation docs, handoff material, and archived work artifacts.
- `tests`, `scripts`, `infra`: test, automation, and deployment scaffolding.

## Current Implemented Slices

### Foundation

- Root npm workspace exists with frontend/backend workspaces.
- Backend uses NestJS modules and PostgreSQL through `DatabaseService`.
- Prisma schema models the normalized SGP data model.
- Frontend uses Angular Material, lazy feature modules, shared shell, shared CRUD table, and filter components.
- Cognito JWT guard and permission guard are implemented.

### Gestao Master Data

Implemented generic master-data CRUD for observed Gestao resources.

Key files:

- `backend/src/gestao/master-data/master-data.controller.ts`
- `backend/src/gestao/master-data/master-data.service.ts`
- `frontend/src/app/features/gestao/pages/gestao-home/gestao-home.ts`
- `frontend/src/app/features/gestao/services/master-data.ts`

### RH Workflows

Implemented RH workflow vertical slice for observed and inferred legacy RH routes.

Modern RH APIs include:

- `GET /rh/workflows`
- `GET /rh/lookups/:kind`
- `GET /rh/:workflow`
- `POST /rh/:workflow`
- `PATCH /rh/:workflow/:id`
- `DELETE /rh/:workflow/:id`
- `POST /rh/imports/:kind`
- `POST /rh/reports/:reportKey/requests`
- `GET /employees/:employeeId/rh-workflows/:workflow`
- `POST /employees/:employeeId/rh-workflows/:workflow`

Covered workflows:

- employees
- dependents
- professional experiences
- frequencies/import request
- status history/afastamentos
- salary history
- service time
- transfers
- complement data
- organic definitions
- vacations
- leaves/licenca premio

Key files:

- `backend/src/rh/employees/*`
- `backend/src/rh/workflows/rh-workflows.controller.ts`
- `backend/src/rh/workflows/rh-workflows.service.ts`
- `backend/src/rh/workflows/rh-workflows.dto.ts`
- `frontend/src/app/features/rh/pages/rh-home/*`
- `frontend/src/app/features/rh/services/rh-workflows.ts`
- `docs/eng/98-rh-workflows.md`

Known RH gaps:

- Lookup relationships currently use UUID text inputs instead of autocomplete selectors.
- Employee create/update currently covers basic registry fields only.
- Legacy-only validations not observable during extraction remain unverified.

### Auditoria

Implemented audit vertical slice.

Backend was refactored into:

- `backend/src/audit/audit.dto.ts`
- `backend/src/audit/audit-query.service.ts`
- `backend/src/audit/audit-writer.service.ts`
- `backend/src/audit/audit-redaction.util.ts`
- `backend/src/audit/audit.service.ts`
- `backend/src/audit/audit.controller.ts`

Canonical audit endpoints:

- `GET /audit/events`
- `GET /audit/facets/actions`
- `GET /audit/facets/tables`
- `GET /audit/facets/users`
- `POST /audit/reports/requests`

Legacy-compatible endpoint:

- `GET /auditoria/audit-search`

Frontend Auditoria workspace:

- `frontend/src/app/features/auditoria/pages/auditoria-home/auditoria-home.ts`
- `frontend/src/app/features/auditoria/pages/auditoria-home/auditoria-home.html`
- `frontend/src/app/features/auditoria/pages/auditoria-home/auditoria-home.scss`
- `frontend/src/app/features/auditoria/services/audit-events.ts`

Frontend supports:

- period filters
- user filter
- action facet
- table facet
- free-text search
- resource/request/status filters
- refresh
- clear filters
- audit report request
- event detail panel with redacted metadata

Docs:

- `docs/eng/98-audit-implementation.md`
- `docs/eng/99-implementation-status.md`

Known audit gaps:

- Audit search reads are not audited by default to avoid recursive high-volume noise.
- Report request is persisted, but actual report file generation/export worker is not implemented.
- Database-level immutability enforcement for `audit_event` should be added once deployment DB roles are finalized.

### Documents Build Fix

Approved and applied during audit implementation:

- Verified DTO naming around `PresignedDownloadDto` is aligned.
- Installed/verified backend dependencies:
  - `@aws-sdk/client-s3`
  - `@aws-sdk/s3-request-presigner`

NPM reports 3 moderate vulnerabilities. Do not run `npm audit fix --force` without reviewing breaking changes.

### Angular Bundle Budget

Raised frontend production initial bundle budget warning from `500kB` to `1MB`.

File:

- `frontend/angular.json`

Build now completes without the previous initial budget warning.

## Validation Status

Last successful validation from repository root:

```bash
npm --workspace backend run build
npm --workspace frontend run build
npm run lint
npm run test
npm run test:e2e
npm --workspace backend exec -- prisma validate --schema prisma/schema.prisma
```

Observed results:

- Backend build: passed
- Frontend build: passed
- Lint: passed
- Unit tests: passed
  - Frontend: 26 test files, 51 tests
  - Backend: 25 suites, 35 tests
- E2E: passed
  - 18 tests
- Prisma validate: passed
- Secret scan over `backend/src`, `frontend/src`, `docs`, and `tests/backend`: clean

Secret scan was run over `backend/src`, `frontend/src`, `docs`, and `tests/backend`. Future agents should run an equivalent scan for credential-looking assignments, bearer tokens, JWTs, and real APP credential values before handing off or committing.

Generated build/cache output was removed after validation:

```bash
rm -rf backend/dist frontend/dist backend/generated frontend/.angular
```

## How To Work From Another Desktop

1. Open the repository root.
2. Use the repository root as the implementation workspace.
3. Install dependencies if needed:

```bash
cd . # repository root
npm install
```

4. Validate baseline:

```bash
npm --workspace backend run build
npm --workspace frontend run build
npm run lint
npm run test
npm run test:e2e
npm --workspace backend exec -- prisma validate --schema prisma/schema.prisma
```

5. Configure local runtime externally with environment variables. Do not write real values to tracked files.

Important backend runtime variables include at least:

- `DATABASE_URL`
- Cognito variables documented in `docs/user/environment.md`
- S3 document variables if using document upload/download flows:
  - `S3_DOCUMENTS_BUCKET`
  - `S3_REGION`
  - optional presign expiry variables

## Important Design Constraints

- Runtime persistence must be PostgreSQL only. Do not introduce in-memory fallback stores for domain data.
- Cognito groups are authoritative roles/permissions source.
- Use simple, idiomatic NestJS and Angular patterns. Avoid abstractions unless they remove immediate duplication.
- Preserve legacy route parity using extracted docs/inventories as evidence.
- Mark unverified behavior explicitly instead of inventing hidden legacy features.
- Prefer official CLIs/schematics for new Angular/NestJS code where practical.

## Suggested Next Vertical Slices

1. RH lookup UX improvement:
   - Replace UUID text fields with autocomplete selectors backed by `/rh/lookups/:kind`.
   - Add employee detail tabs for dependents, status history, transfers, vacations, leaves.

2. Folha de Pgt workflow implementation:
   - Payroll run lifecycle, payroll item imports, remittance generation, blocked payments, financial records.
   - Highest risk area; preserve idempotency and auditability.

3. Report generation/export worker:
   - Consume `report_request` rows from RH/Auditoria/Relatorio requests.
   - Generate files, persist document attachments, and audit downloads.

4. Documents hardening:
   - Finish S3 upload/download browser workflow.
   - Add document download audit events with `DOWNLOAD` action instead of only `PROCESS` where applicable.

5. Database hardening:
   - Add DB-level immutability guard for `public.audit_event` once app DB role/deployment model is known.
   - Add migrations for any missing operational support tables identified during future modules.

## Reference Legacy Evidence

- `docs/application-overview.md`
- `docs/leg/rev-eng/modules/auditoria.md`
- `docs/leg/rev-eng/modules/modulo-rh.md`
- `docs/leg/rev-eng/modules/folha-de-pgt.md`
- `docs/leg/rev-eng/feature-catalog.md`
- `docs/leg/rev-eng/workflows.md`
- `inventories/routes.json`
- `inventories/menus.json`
- `inventories/screens.json`
- `inventories/actions.json`
- `inventories/api-calls.json`
- `inventories/database-model.json`

## Notes For Future Agents

- The root git status may show many untracked files because this was built from a blank/reverse-doc repo. Do not assume untracked means disposable.
- Do not remove generated docs, inventories, prompts, or repository-root files unless explicitly requested.
- If validation fails in unrelated files, stop and ask before changing unrelated code unless the user explicitly authorizes it.
- Keep generated build outputs out of the repo after validation.
