# SGP Application Overview

Generated from persisted reverse-documentation artifacts in this repository.

## Evidence Base

- Status: observed
- Sources: `docs/sitemap.md`, `docs/feature-catalog.md`, `docs/workflows.md`, `docs/api-calls.md`, `docs/database-model.md`, `docs/permission-gap-report.md`, `inventories/screens.json`, `inventories/actions.json`, `inventories/api-calls.json`, `inventories/database-model.json`.
- Coverage: 63 screens inspected, 72 mapped routes, 462 cataloged actions, 69 inferred database model candidates.
- Constraint: 19 routes returned 403-like pages for the inspected role. Most captured backend calls returned 401, so backend semantics and mutation payloads remain partially unverified.

## High-Level Product Intent

SGP appears to be an HR and payroll management system for public-sector personnel administration.

The application is organized around a legacy AngularJS shell with hash routes, a left navigation menu, role-gated modules, tabular list screens, filters, report actions, and form-based maintenance screens. Its intended domain is broader than a simple employee registry: it covers foundational HR configuration, employee lifecycle operations, payroll processing, payroll reporting, internship/convênio management, user/profile access control, notifications, and audit trails.

## Main Functional Areas

### Gestão

- Status: observed
- Routes/screens: 35 menu entries, 21 observed tables, 123 observed fields, 256 actions.
- Product role: central administration/configuration module.
- Functional scope:
  - organizational structures: `empresa_filial`, `lotacao`, `centro_custo`, `responsavel_legal`;
  - job and salary foundations: `cargo`, `funcao`, `faixa_salarial`, `referencia_salarial`, `natureza_funcao`;
  - legal/taxonomy data: `legislacao`, `natureza_juridica`, `classificacao_ato`;
  - employment classifications: `situacao_funcional`, `tipo_contrato`, `tipo_folha`, `tipo_processamento`, `vinculo`;
  - operational lookup tables: `banco`, `sindicato`, `motivo`, `motivo_afastamento`, `motivo_desligamento`, `tipo_documento`, `tipo_feria`, `turno`, `verba`, `vale_transporte`;
  - system administration: `usuario`, `perfil_acesso`, `parametro_sistema`, imports/exports.
- Planning interpretation: this module is the master-data backbone. Improvements here should prioritize data consistency, reusable CRUD patterns, validation, search/filter behavior, and permission consistency.

### Módulo RH

- Status: observed
- Routes/screens: 12 menu entries, 7 observed tables, 42 fields, 92 actions.
- Product role: employee lifecycle and personnel record management.
- Functional scope:
  - core employee registry: `funcionario`;
  - employee status history and absence records: `historico_situacao_funcional`;
  - dependents: `dependente`;
  - professional experience: `experiencia_profissional`;
  - salary/reference adjustments: `nivel_salarial_historico`;
  - frequency, time-in-service, transfers, vacation scheduling, leave awards, and complementary registration data.
- Planning interpretation: this is the operational HR module. It likely depends heavily on master data from Gestão, especially employee status, filial, vínculo, cargo/função, salary references, and lotação.

### Folha de Pgt

- Status: observed
- Routes/screens: 9 menu entries, 4 observed tables, 42 fields, 69 actions.
- Product role: payroll processing and payroll-oriented reporting.
- Functional scope:
  - payroll generation/management: `folha_pagamento`;
  - remittance/payment file management: `arquivo_remessa_pagamento`;
  - employee financial record lookup: `ficha_financeira`;
  - employee payroll earnings/deductions: `verba_funcionario`;
  - blocked-payment reports and managerial payroll reports;
  - payroll report exports.
- Observed report/payment columns include competence, processing type, filial, creation/payment dates, status, motive, proventos, descontos, liquid total, average value, employee count.
- Planning interpretation: payroll workflows should be treated as high-risk. Corrections should preserve auditability, generated output reproducibility, and explicit status transitions.

### Convênio

- Status: observed
- Routes/screens: 3 menu entries, 2 observed tables, 10 fields, 20 actions.
- Product role: internship/agreement management.
- Functional scope:
  - teaching institutions with name, CNPJ, address;
  - internship programs with start/end dates;
  - internship route exists but returned 403 for the inspected role.
- Planning interpretation: this module likely supports HR internship administration and may share organization/person data with employee or contract modules.

### Relatório

- Status: observed
- Routes/screens: 2 menu entries, no observed tables, 7 fields, 10 actions.
- Product role: cross-module reporting.
- Functional scope:
  - internship reports;
  - RH fund transfer report route exists but returned 403.
- Planning interpretation: reporting should be reviewed together with permission design and export formats, since observed actions include report generation and Excel/PDF-like flows.

### Auditoria

- Status: observed
- Routes/screens: 1 menu entry.
- Product role: audit trail consultation.
- Functional scope:
  - filters: initial period, final period, user;
  - table columns: user, operation, table, date, actions.
- Planning interpretation: audit is a core governance feature. Improvements should preserve immutable audit records and make entity/action traceability explicit.

## Common Screen and Workflow Patterns

- Status: observed
- Most list screens follow a repeated pattern:
  - enter module route;
  - view table/grid;
  - use autocomplete/search filters;
  - refresh or clear filters;
  - open report/action links;
  - navigate to nested create/edit/detail routes where available.
- Repeated actions:
  - `refresh` appeared on 35 routes;
  - `showRelatorio()` appeared on 25 routes;
  - `Salvar` was directly observed on the system-parameter screen;
  - mutating action inference found `Salvar/save()` and `Alterar minha senha`, but no mutating backend request was safely captured.
- Repeated UI models/controllers include route-specific controllers, `sidebarCtrl`, `headerCtrl`, pagination state, autocomplete search text, and login/auth models.
- Planning interpretation: the application likely has a generic CRUD/list framework underneath. This is useful for modernization because shared components can be replaced or corrected once and reused across modules.

## Forms, Conditions, and Constraints

- Status: observed/inferred
- Observed form controls are dominated by Angular Material autocomplete/search fields and module-specific filter inputs.
- Many screens include a `material_login_form` in the captured DOM. This may indicate a persistent login component or a session/auth overlay present during inspection; it should not automatically be treated as a domain form on every screen.
- Required-field constraints were frequently observed on autocomplete/search controls and login fields. Some required constraints may reflect UI component internals rather than business-required database fields.
- Observed examples:
  - Auditoria: period start, period end, user filter;
  - Usuários: name, CPF, login filters;
  - Folha reports: competence, year, filial, employee/status filters;
  - Parametro do Sistema: multiple forms for system, matrícula, funcionário, and image parameters;
  - Relatório de Servidores com Pagamento Bloqueado: selected server and lookup filters.
- Planning interpretation: business validation should be rediscovered at the form-template or backend DTO level before rewriting rules. Current evidence is good for UI constraints, not enough for authoritative data validation.

## Domain Model Summary

- Status: observed/inferred/unverified
- The inferred model contains 69 canonical table candidates after normalization.
- Core people and HR entities:
  - `funcionario`, `dependente`, `historico_situacao_funcional`, `experiencia_profissional`, `tempo_servico`, `transferencia_funcionario`, `frequencia`, `dado_cadastral_complementar`.
- Organization and placement:
  - `empresa_filial`, `filial`, `lotacao`, `centro_custo`.
- Payroll:
  - `folha_pagamento`, `arquivo_remessa_pagamento`, `ficha_financeira`, `verba`, `verba_funcionario`, `tipo_folha`, `tipo_processamento`, `relatorio_folha_pagamento`, `relatorio_gerencial`, `relatorio_servidor_pag_bloqueado`.
- Classifications and lookups:
  - `cargo`, `funcao`, `situacao_funcional`, `vinculo`, `tipo_contrato`, `motivo`, `motivo_afastamento`, `motivo_desligamento`, `tipo_documento`, `tipo_feria`, `turno`, `sindicato`, `banco`, `natureza_juridica`, `legislacao`.
- Security and platform:
  - `usuario`, `perfil_acesso`, `menu`, `notificacao`, `auditoria`, `parametro_sistema`, `anexo`.
- Inferred foreign-key themes:
  - employee-facing tables reference employee, filial, lotação, situação funcional, and vínculo;
  - payroll/report tables reference filial, competence, employee/status dimensions;
  - convenio appears to reference programa.
- Planning interpretation: a modernization plan should begin with a verified ERD for employee, organization, payroll, and security domains. Many inferred primary keys are unverified fallbacks and should be checked against backend schemas or the database directly.

## Security, Permissions, and Runtime Behavior

- Status: observed
- The navigation is role-driven and invokes permission checks such as `/api/usuario/verificaPermissao?role=...`.
- 19 routes returned 403-like pages for the inspected role, concentrated in Gestão, Módulo RH, Folha de Pgt, Relatório, and Convênio.
- API observations:
  - 20 unique method/path entries were captured in the latest API crawl;
  - most protected endpoints returned 401 in crawler context;
  - public endpoints include system parameters and image attachments;
  - mutating endpoint calls were not captured, although UI actions imply create/update flows.
- Planning interpretation: permission behavior is a first-class product concern. Improvements should include a permission matrix, role-to-route coverage tests, and clearer handling for expired sessions versus forbidden access.

## Business Workflows To Validate

- Status: inferred from observed routes
- Employee lifecycle:
  - maintain employee records;
  - manage status/absence history;
  - record dependents, experience, time service, frequency, transfer, vacation scheduling, and leave awards.
- Payroll cycle:
  - configure payroll types/processings/verbas;
  - select competence, filial, status/vínculo dimensions;
  - generate or manage payroll;
  - produce remittance/payment files;
  - inspect financial records and blocked-payment reports;
  - export payroll reports.
- Master-data governance:
  - maintain lookup/reference tables;
  - control active/inactive states;
  - use code/description pairs across many entities;
  - audit changes.
- Access administration:
  - maintain users and access profiles;
  - assign permissions;
  - inspect audit records.
- Reporting:
  - produce PDF/Excel-like reports;
  - filter by employee, competence, filial, year, status, and program/institution where applicable.

## Improvement Planning Notes

- Normalize CRUD patterns first: many screens share list/filter/refresh/report behavior, so component-level fixes should have broad impact.
- Build a permission matrix before changing navigation: routes can be visible yet blocked, and backend permission checks are observed.
- Separate authentication/session failures from authorization failures: crawler evidence shows both 401 API responses and 403 pages.
- Confirm authoritative models from backend/database: the inferred DB model is useful for planning but not enough for migrations or schema changes.
- Prioritize payroll safeguards: payroll generation, remittance files, blocked payments, and financial records need audit trails, idempotency, and status history.
- Treat encoding/i18n issues as technical debt: captured labels include mojibake in at least one employee/dependent screen (`FuncionÃ¡rio`), suggesting encoding or scrape-rendering inconsistencies worth checking.
- Revisit form validation at source level: UI-required flags are noisy because Angular Material controls and login components appear across many captures.
- Add role-aware automated smoke tests: each module should have tests for accessible route, forbidden route, filter load, table render, report action availability, and session expiry handling.
- Capture mutating APIs with a controlled test role/environment: current safe probes preserved side-effect safety, but did not observe POST/PUT/PATCH/DELETE payloads.

## Known Evidence Gaps

- Mutating API payloads and backend validation rules are unverified.
- Several tables have no observed columns due permission blocks or screens that rendered 403.
- Many primary keys and foreign keys are inferred from UI labels/API names, not confirmed from database metadata.
- Role coverage reflects only the inspected credentials.
- The current artifact set documents behavior visible through the browser, not backend implementation internals.
