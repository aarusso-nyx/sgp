# Implementation Status

This document tracks implementation progress for SGP v0.0.1.

## Architecture Reset

Status: split runtime topology is now first-class in the workspace.

Implemented:

- Runtime topology manifest in `source/runtime/topology.json` covering:
  - `sgp-admin`
  - `sgp-portal`
  - `sgp-core-api`
  - `sgp-portal-api`
  - scaffold entries for `sgp-payroll-engine`, `sgp-esocial-worker`, `sgp-integrations-worker`, and `sgp-report-service`
- Workspace orchestration now starts the documented admin/portal/API runtimes instead of the earlier single-frontend shorthand.
- Angular workspace now exposes two SPAs:
  - `sgp-admin` on the existing `src/` application tree
  - `sgp-portal` on `portal/src/`, with documented portal sections and routes derived from `docs/eng/50-arvore-menus.md`
- OpenAPI generation now emits admin artifacts plus a dedicated portal generated client/spec destination.
- Runtime entrypoints exist for the planned split service/worker runtimes, and `sgp-integrations-worker` now processes the Folha export contract path (`remessa.gerar`, `retorno.processar`, `gfip.gerada`) against persisted `report_request` jobs.

## Current Vertical Slice: Gestao Master Data, RH Workflows, and Auditoria

Status: PostgreSQL-only foundation implemented; feature expansion remains incremental.

Implemented:

- Backend read endpoints for observed Gestao master-data resources.
- Backend mutation endpoints for master-data records:
  - `POST /api/v1/master-data/:resource`
  - `PATCH /api/v1/master-data/:resource/:id`
  - `DELETE /api/v1/master-data/:resource/:id`
- Runtime persistence is PostgreSQL-only. There is no application in-memory fallback.
- Payroll formula engine primitives ported from folia into SGP SQL runtime:
  - schema `payroll_calc`
  - compile/evaluate functions
  - dependency and circular-reference safeguards
  - cache table and trigger wiring
- Server-side Cognito group permission enforcement:
  - read requires `gestao:read`
  - mutations require `gestao:write`
- Protected IAM permission-catalog endpoint (`GET /api/v1/iam/permissions`) requires `iam:read`.
- Standard DTO validation for code, name, description, active flag, and metadata.
- PostgreSQL mappings for all currently exposed Gestao master-data resources.
- Dedicated RH workflow APIs and Angular workspace for employees, dependents, experience, frequency, status history, service time, transfers, salary history, complement data, vacations, leaves, and organic definitions.
- Auditoria search workspace with period/user/table/action filters, facets, detail panel, and audit report request.
- Audit backend split into query and writer services with redaction and richer request context.
- Read-only PostgreSQL mappings for resources that require dedicated workflows rather than generic CRUD:
  - `empresaFilial` -> `hr.branch`
  - `responsavelLegal` -> `hr.legal_responsible`
  - `usuario` -> `public.user_account`
- Explicit PostgreSQL runtime tables and Prisma models for legacy routes that had no normalized table yet:
  - `business_day`
  - `file_export_job`
  - `consignment_import_job`
  - `employee_payroll_item_import_job`
  - `competence_period`
- Prisma baseline schema for the inferred SGP relational model.
- Deterministic database seed orchestration from `source/database/seed/*.json` and SQL seed files.
- Angular Gestao page with:
  - route-aware resource selection
  - filter bar
  - CRUD table
  - create/edit form
  - deactivate row action
  - error/status messages
- Unit/e2e coverage for backend mutation flow and frontend page behavior.
- Document module S3 flow:
  - `POST /api/v1/arquivos/presigned-upload`
  - `PATCH /api/v1/arquivos/:id/confirmar`
  - `GET /api/v1/arquivos/:id/download`
  - `GET /api/v1/arquivos/:id/download-audit`
  - audit records for upload/register/download actions

- Admin domain modules now backed by runtime persistence:
  - `users`: `/api/v1/admin/usuarios`
  - `profiles`: `/api/v1/admin/perfis`
  - `system-parameters`: `/api/v1/admin/parametros/*` and `/api/v1/admin/feature-flags/:chave`
  - `reports`: `/api/v1/reports/requests`
  - `avaliacao`: `/api/v1/avaliacao/*`
  - `consultas`: `/api/v1/consultas/*`
  - `previdenciario`: `/api/v1/previdenciario/*`
- Additional documented API families exposed in runtime:
  - `/api/portal/v1/*`
  - `/api/external/v1/*`
  - `/api/publico/v1/*`

Evidence source:

- Legacy routes and menus (evidence archive): `inventories/routes.json`, `inventories/menus.json`
- Legacy screen/action observations (evidence archive): `inventories/screens.json`, `inventories/actions.json`
- Reverse database inference (evidence archive): `docs/legacy-reverse/database-model.md`
- Modern implementation: `source/backend/src/gestao`, `source/backend/prisma/schema.prisma`, `source/database/sql`

Runtime requirements:

- `DATABASE_URL` is required for master-data record endpoints.
- Prisma migrations must be applied before SQL support files.
- SQL support files must be applied in lexical order.
- Missing PostgreSQL schema objects produce explicit service-unavailable errors rather than fallback data.

Known limits:

- Generic master-data CRUD intentionally supports only tables whose required fields can be represented by the shared DTO plus metadata. Complex resources remain read-only until dedicated workflow endpoints are implemented.
- Resource-specific UI fields such as bank digit, blocked flag, branch type, legislation details, and payroll earning kind are represented through metadata today; richer dynamic Angular forms are still pending.
- Delete currently means deactivate/soft-delete. Hard delete behavior has not been confirmed from legacy evidence.
- Audit records are appended for implemented mutations when audit persistence is configured.
- The implementation now covers Gestao master-data and structure links, RH workflow slices, Folha orchestration, eSocial event queuing/XML generation, Saude/Pericia plus SST support catalogs, Recrutamento, Avaliacao, Consultas Gerenciais, and a broader Previdenciario slice including rules, simulations, concessions, pensoes, certidoes, declaracoes, recadastramento history, and queued official outputs; remaining parity gaps are concentrated in residual DB exclusions, portal workflows, and still-scaffolded runtimes.
- `sgp-portal` currently closes route/menu shell parity for the documented self-service tree; domain workflows behind those routes remain wave-based closure work.
- Runtime implementation intentionally avoids backwards compatibility schemas/shims in v0.0.1.

## Remaining High-Priority Parity Work

- Add dedicated workflow endpoints for complex Gestao resources: public agencies/branches, legal responsible users, and Cognito-backed users.
- Extend audit capture to future modules as they are implemented.
- Expand dynamic forms from observed `inventories/screens.json` field definitions.
- Expand RH lookup fields into autocomplete selectors and complete employee registry detail tabs.
- Implement Folha de Pgt payroll/remittance workflows.
- Expand the remaining worker runtimes (`sgp-payroll-engine`, `sgp-esocial-worker`, `sgp-report-service`) beyond their current scaffold state.
- Add browser e2e coverage once Cognito local/test auth flow is stable.
