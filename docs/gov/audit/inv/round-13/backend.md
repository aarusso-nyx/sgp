# Backend Inventory — Round 13

NestJS workspace at `backend/` (npm workspace). Source tree `backend/src/` =
**52 top-level entries / 1 036 `.ts` files / 141 930 LOC**.

## Module Map (top-level under `backend/src/`)

`audit`, `auditoria`, `auth`, `avaliacao`, `common`, `config`, `consultas`,
`convenio`, `database`, `det`, `documents`, `esocial-events`, `external`,
`folha-pagamento`, `gestao`, `health`, `iam`, `integrations`,
`integrations-worker`, `lgpd`, `notifications`, `payroll-engine`, `ponto`,
`portal`, `previdenciario`, `profiles`, `publico`, `recrutamento`,
`relatorio`, `reports`, `rh`, `saude`, `system-parameters`, `tce`, `users`.

NestJS modules registered (per `backend/src/app.module.ts`): `AppModule`,
`AuditModule`, `AuditoriaModule`, `AuthModule`, `AvaliacaoModule`,
`ConfigModule`, `ConsultasModule`, `ConvenioModule`, `DatabaseModule`,
`DetModule`, `DocumentsModule`, `ExternalModule`, `FolhaPagamentoModule`,
`GestaoModule`, `HealthModule`, `IamModule`, `IntegrationsWorkerModule`,
`LgpdAdminModule`, `LoggingModule`, `NotificationsModule`, `PontoModule`,
`PortalModule`, `PrevidenciarioModule`, `ProfilesModule`, `PublicoModule`,
`RecruitmentModule`, `RelatorioModule`, `ReportsModule`, `RhModule`,
`SaudeModule`, `StynxEsocialModule`, `SystemParametersModule`, `TceModule`,
`ThrottlerModule`, `UsersModule`.

## Workers / Entrypoints

| Entry               | Path                                      | Purpose                                    |
| ------------------- | ----------------------------------------- | ------------------------------------------ |
| API                 | `backend/src/main.ts`                     | Primary HTTP API                           |
| Portal API          | `backend/src/main-portal.ts`              | Portal-scoped HTTP API (`AppPortalModule`) |
| Integrations worker | `backend/src/main-integrations-worker.ts` | Fiscal/banking/integration spool           |
| Payroll engine      | `backend/src/main-payroll-engine.ts`      | Folha calc engine                          |
| Report service      | `backend/src/main-report-service.ts`      | Long-running report HTTP service           |
| Report worker       | `backend/src/main-report-worker.ts`       | Report queue worker                        |

Six runtime entrypoints. Coverage hardening for these is exercised by
`backend/src/coverage-hardening.{database-unavailable,network-timeout,s3-unavailable,sqs-unavailable}.spec.ts`.

## Controller × Route × DTO (representative subset)

Round-13 API ledger: **468 routes** (all `untagged`, all `implemented`) per
`docs/gov/audit/api-surface.md`. Drift checks `check-api alignment check` and
`check-api operation check` both `ok` (api-surface.md:7-12). Sampled controller
families:

- **Folha pagamento** — `backend/src/folha-pagamento/{accounting,esocial,fgts,import,operations,payroll,pis-pasep,rescisao,simulacao}/...controller.ts` (rubrica DELETE/PUT, payroll runs, simulação, rescisão, PIS/PASEP).
- **Integrations worker** — `backend/src/integrations-worker/{cnab240,consignment-portability,dctfweb,dirf,efd-reinf,gps,siafic,siconfi,siope,siops}/...service.ts`. Worker is the dispatch boundary; HTTP handles only operator triggers.
- **TCE** — `backend/src/tce/{adapters,builders,catalog,contracts,examples,lifecycle,queue,registry,submission}/`; `backend/src/tce/tce.controller.ts`.
- **DET** — `backend/src/det/det.controller.ts` plus `det.service.ts`, `det.dto.ts`.
- **eSocial events** — `backend/src/esocial-events/esocial-events.{module,service,dto,types}.ts`.
- **Portal** — `backend/src/portal/{portal,lgpd-rights}.controller.ts` (employee self-service surface and LGPD rights endpoints).
- **LGPD admin** — `backend/src/lgpd/{dpo,dsar}.controller.ts` plus DTOs and services (DPO designation lifecycle, DSAR ticket lifecycle).
- **Auth** — `backend/src/auth/sgp-stynx-auth.guard.ts`, `backend/src/auth/sgp-stynx-token-verifier.service.ts`, govbr/session subfolders.
- **Audit** — `backend/src/audit/audit.controller.ts`, `audit-writer.service.ts`, `audit-query.service.ts`, `audit-redaction.util.ts`.
- **Health** — `backend/src/health/health.module.ts` (under `backend/src/health/health/`).

## Permissions / RBAC posture

- 129 backend `.ts` files reference `permission`-related decorators or strings
  (`grep -rl "PERMISSION|@RequirePermission|@Permission|permission:" backend/src --include="*.ts" | wc -l`).
- Decorators and guards live in
  `backend/src/iam/{decorators,guards,permissions}/` (registered via
  `backend/src/iam/iam.module.ts`).

## Audit posture

- Mutation audit centralised in
  `backend/src/audit/audit-writer.service.ts` with redaction helper
  `audit-redaction.util.ts`. Spec: `audit-writer.service.spec.ts`.
- Query surface: `backend/src/audit/audit-query.service.ts` and
  `audit.controller.ts`.
- Persistent ledger ties: `audit_event` and `document_download_audit` per
  `docs/gov/audit/README.md`.

## Integrations and External Dependencies

- `backend/src/integrations/` packages adapter clients
  (`stynx-det`, `stynx-esocial`).
- `backend/src/external/` houses signature/cert services
  (`backend/src/external/signature/tenant-fiscal-certificate.service.ts`).
- Sandbox queue adapters: `backend/src/common/adapters/queue-adapter.ts`,
  `backend/src/common/adapters/sqs-queue-transport.ts`.

## Observability

- Prometheus metrics registered in `backend/src/common/observability/`
  (`prometheus.metrics.spec.ts`).
- OpenTelemetry tracing wiring `otel.tracing.spec.ts`.
- Worker poll observability `worker-poll-observability.spec.ts`.
- Logger pino (PII redact) per FR `R2-58`, evidence in
  `backend/src/common/logging/logging.config.spec.ts`.

## Throttling / CORS

- `ThrottlerModule` registered in `backend/src/app.module.ts` (FR R2-03).
- CORS production policy per FR R2-173 (config in `backend/src/main.ts`).

## Notes for downstream prompts

- All 468 routes report tag `untagged`. OpenAPI tagging is a non-blocking
  technical debt: round-13 prompts may want a `B1` backlog item to assign tags
  for documentation grouping. No FR is tagged with this; not in scope of B0.
- Six entrypoints means each worker needs the `runtime-entrypoint-contract.spec.ts`
  trio (already present per `backend/src/common/bootstrap/`).
