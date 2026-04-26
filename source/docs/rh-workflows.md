# RH Workflows

The modern RH slice implements the legacy SGP RH route family as PostgreSQL-backed NestJS APIs and a route-aware Angular workspace.

## Implemented Workflow Coverage

| Legacy route                           | Modern API resource            | Status   | Notes                                                                                         |
| -------------------------------------- | ------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `#!/funcionario/gestao`                | `/employees`                   | observed | Employee registry list, create, update, and deactivate.                                       |
| `#!/dependente/gestao`                 | `/rh/dependents`               | observed | Employee dependents with CPF, birth date, relationship, and IR dependent flag.                |
| `#!/experienciaProfissional/gestao`    | `/rh/professional-experiences` | observed | Prior professional experience and period fields.                                              |
| `#!/frequencia/gestao`                 | `/rh/frequencies`              | observed | Frequency and absence days, with import request endpoint.                                     |
| `#!/historicoSituacaoFuncional/gestao` | `/rh/status-history`           | observed | Functional status history and afastamento reasons.                                            |
| `#!/nivelSalarialHistorico/gestao`     | `/rh/salary-history`           | observed | Salary level/reference history.                                                               |
| `#!/tempoServico/gestao`               | `/rh/service-time`             | observed | Service-time periods and day counts.                                                          |
| `#!/transferenciaFuncionario/gestao`   | `/rh/transfers`                | observed | Employee branch/work-location transfers.                                                      |
| `#!/dadoCadastralComplementar/gestao`  | `/rh/complement-data`          | inferred | Implemented because the legacy route was present but access was restricted during extraction. |
| `#!/definicaoOrganico/gestao`          | `/rh/organic-definitions`      | inferred | Work-location/organic structure CRUD.                                                         |
| `#!/feriasProgramacao/gestao`          | `/rh/vacations`                | inferred | Vacation scheduling workflow.                                                                 |
| `#!/licencaPremio/gestao`              | `/rh/leaves`                   | inferred | Leave/licenca-premio records.                                                                 |

## Backend Behavior

- RH workflow APIs are guarded by Cognito JWT and permission guards.
- Read operations require `rh:read`.
- Mutating operations require `rh:write`.
- Report request creation is exposed through `/rh/reports/:reportKey/requests`.
- Import/process request creation is exposed through `/rh/imports/:kind`.
- All persisted workflow data uses PostgreSQL tables via `DatabaseService`; there is no in-memory runtime persistence.
- Mutations append audit events when audit persistence is configured.

## Frontend Behavior

- The RH Angular module maps each legacy child route to a workflow configuration.
- `/rh/funcionario` uses `/employees`.
- Other `/rh/<legacy-child>` routes use `/rh/<workflow-key>`.
- Dynamic forms include required fields and fields inferred from the legacy extraction and database model.
- Inferred legacy routes are visibly marked as inferred in the RH header.

## Remaining Gaps

- The dynamic RH form currently accepts UUIDs for lookup relationships instead of searchable autocomplete pickers.
- Employee registry create/update only covers the basic registry fields currently exposed by `EmployeesService`.
- Legacy-only validations that were not observable in the AngularJS UI remain unverified.
