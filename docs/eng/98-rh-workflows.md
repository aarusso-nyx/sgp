# RH Workflows

The modern RH slice implements the legacy SGP RH route family as PostgreSQL-backed NestJS APIs and a route-aware Angular workspace.

## Implemented Workflow Coverage

| Legacy route                           | Modern API resource            | Status      | Notes                                                                                         |
| -------------------------------------- | ------------------------------ | ----------- | --------------------------------------------------------------------------------------------- |
| `#!/funcionario/gestao`                | `/employees`                   | observed    | Employee registry list, create, update, and deactivate.                                       |
| `#!/dependente/gestao`                 | `/rh/dependents`               | observed    | Employee dependents with CPF, birth date, relationship, and IR dependent flag.                |
| `#!/experienciaProfissional/gestao`    | `/rh/professional-experiences` | observed    | Prior professional experience and period fields.                                              |
| `#!/frequencia/gestao`                 | `/rh/frequencies`              | observed    | Frequency and absence days, with import request endpoint.                                     |
| `#!/diaUtil/gestao`                    | `/consultas/business-days`     | observed    | Tenant-scoped business-day calendar backed by `hr.business_day`, including holiday overrides. |
| `#!/historicoSituacaoFuncional/gestao` | `/rh/status-history`           | observed    | Functional status history and afastamento reasons.                                            |
| `#!/nivelSalarialHistorico/gestao`     | `/rh/salary-history`           | observed    | Salary level/reference history.                                                               |
| `#!/tempoServico/gestao`               | `/rh/service-time`             | observed    | Service-time periods and day counts.                                                          |
| `#!/transferenciaFuncionario/gestao`   | `/rh/transfers`                | observed    | Employee branch/work-location transfers.                                                      |
| `#!/dadoCadastralComplementar/gestao`  | `/rh/complement-data`          | inferred    | Implemented because the legacy route was present but access was restricted during extraction. |
| `#!/definicaoOrganico/gestao`          | `/rh/organic-definitions`      | implemented | CRUD de `hr.organic_definition`, vinculando lotacao, cargo e vagas autorizadas por vigencia.  |
| `#!/feriasProgramacao/gestao`          | `/rh/vacations`                | inferred    | Vacation scheduling workflow.                                                                 |
| `#!/licencaPremio/gestao`              | `/rh/leaves`                   | inferred    | Leave/licenca-premio records.                                                                 |

## Backend Behavior

- RH workflow APIs are guarded by Cognito JWT and permission guards.
- Read operations require `rh:read`.
- Mutating operations require `rh:write`.
- Business-day queries are exposed as `GET /api/v1/consultas/business-days?startDate=yyyy-mm-dd&endDate=yyyy-mm-dd`; the service treats Monday-Friday as the default workweek and applies active `hr.business_day` rows as tenant-scoped overrides, so configured holidays can make weekdays non-working and configured compensations can make weekends working.
- Frequency creation defaults `worked_days` from the business-day calendar for the submitted year/month when the caller does not provide `workedDays`; explicit caller values still win.
- Vacation scheduling resolves omitted installment `days` through the same business-day calendar before persisting `hr.vacation_record`.
- Report request creation is exposed through `/rh/reports/:reportKey/requests`.
- Import/process request creation is exposed through `/rh/imports/:kind`.
- All persisted workflow data uses PostgreSQL tables via `DatabaseService`; there is no in-memory runtime persistence.
- Mutations append audit events when audit persistence is configured.
- Cadastro mutations that edit `hr.employee` or `hr.employment_link` use optimistic locking. Rows carry an integer `version` starting at `0`; database triggers increment it on each update. API reads expose the current version, single-resource cadastro reads emit `ETag: "<version>"`, and mutating cadastro requests must send `If-Match: "<version>"`. A stale version is rejected with HTTP 412 so parallel editors cannot silently overwrite each other.
- F-RH-003 definicao de organico is first-class in `hr.organic_definition`. Each row links one `hr.work_location` to one `hr.job_position`, stores total/provided/open vacancies with database consistency checks, and exposes `GET/POST /api/v1/rh/organic-definitions` plus `PATCH/DELETE /api/v1/rh/organic-definitions/:id` for RH operators. Concurso vagas may reference the organic definition so nomeacao and later posse keep the same authorized staffing slot.

## Frontend Behavior

- The RH Angular module maps each legacy child route to a workflow configuration.
- Explicit RH feature routes are protected by `permissionGuard` and reuse the existing v0.0.1 permission catalog (`rh.*`, `hr.*`, and `portal.profile.*` where applicable) so unauthorized users do not see guarded RH affordances before backend denial.
- `/rh/funcionario` uses `/employees`.
- Other `/rh/<legacy-child>` routes use `/rh/<workflow-key>`.
- Dynamic forms include required fields and fields inferred from the legacy extraction and database model.
- Inferred legacy routes are visibly marked as inferred in the RH header.

## Remaining Gaps

- The dynamic RH form currently accepts UUIDs for lookup relationships instead of searchable autocomplete pickers.
- Employee registry create/update only covers the basic registry fields currently exposed by `EmployeesService`.
- Legacy-only validations that were not observable in the AngularJS UI remain unverified.
