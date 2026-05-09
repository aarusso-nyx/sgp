# Roadmap

Current product and migration priorities are governed by `docs/eng/quality-migration.md` and `docs/gov/audit/backlog-ledger.md`.

- `ADMIN_INSTALL_LATER`: administrative installation gaps remain deferred until accepted in docs/eng.
- `IDENTITY_INSTALL_LATER`: identity installation gaps remain deferred until accepted in docs/eng.
- IaC: AWS production infrastructure remains blocked on the ADR-022 owner decision and an accepted stack choice.

## Deferred backlog (auto-generated)

<!-- begin:auto-deferred-from-ledger -->

Total deferred items in ledger: **79**.

Auto-generated from `docs/gov/audit/backlog-ledger.md`. Do not edit by hand;
regenerate with `npm run roadmap` after changing the ledger.

### Aposentadoria (2)

- `R2-31` Encode EC 103/2019 transition rule — Idade Mínima Progressiva
- `R2-32` Encode EC 103/2019 transition rule — Atividade de Risco / Professor

### BI/Relatórios (4)

- `R2-56` Build report-generation worker (PDF/Excel)
- `R2-79` Implement F-FOL-014 Rel. Gerencial (PDF)
- `R2-80` Implement F-FOL-015 Pagamentos Bloqueados (PDF)
- `R2-81` Implement F-FOL-017 Rel. Financeiro (PDF)

### Cadastro / Cross-cutting (1)

- `R2-60` Wire concurrent-edit handling on cadastro (ETag/If-Match)

### Compliance/eSocial (12)

- `R2-05` Fix `xsd-validator.service.spec.ts` off-by-one on bundle manifest
- `R2-19` Promote eSocial S-5002 parser from Stub to Adherent
- `R2-20` Promote eSocial S-5012 parser from Stub to Adherent
- `R2-21` Implement DCTFWeb MIT module
- `R2-22` Add DCTFWeb totalizer-reconciliation spec
- `R2-23` Implement EFD-Reinf série R-4000
- `R2-24` Mark DIRF deprecated and add competence cut-off guard
- `R2-33` Build eSocial S-1030 (Cargos/Empregos Públicos)
- `R2-34` Build eSocial S-1040 (Funções/Cargos em Comissão)
- `R2-35` Build eSocial S-1060 (Ambientes de Trabalho)
- `R2-36` Build eSocial S-2206 (Alteração de Contrato/Vínculo)
- `R2-38` Implement eSocial S-1298 builder (Reabertura)

### Compliance/TCE (1)

- `R2-271` Implement Atos de Pessoal layouts per state

### Compliance/Transparência (1)

- `R2-83` Add LAI requests workflow (#191 lai-pedidos-acesso)

### Convênio (1)

- `R2-76` Promote Convênio domain (F-CON-001/002/003) to operational

### Cross-cutting (14)

- `R2-01` Remove `AuditRequiredInterceptor` production bypass
- `R2-03` Add `@nestjs/throttler` rate limiting on every entrypoint
- `R2-105` Add specs for `health/`, `external/`, `config/` infrastructure modules
- `R2-107` Promote ESLint `no-floating-promises` and `no-explicit-any` to `error`
- `R2-170` Add `prom-client` `/metrics` endpoint per HTTP entrypoint
- `R2-171` Wire OpenTelemetry tracing
- `R2-172` Add audit-event coverage dashboard query
- `R2-173` Configure CORS production policy
- `R2-174` Add backpressure on worker poll loops
- `R2-40` Implement LGPD legal-basis registry per data flow
- `R2-41` Implement LGPD RCIS workflow (Resolução ANPD 15/2024)
- `R2-42` Designate DPO and expose contact endpoint
- `R2-43` Add general portal "exercer direitos do titular" endpoint
- `R2-58` Add structured logger (pino) with PII redact paths

### Folha (22)

- `R2-103` Decompose `folha-mensal.service.ts` (1157 LOC) into state-machine slices
- `R2-104` Decompose `payroll.service.ts` (1386 LOC, 29 SQL)
- `R2-106` Fix duplicate-instantiation hazard in `folha-pagamento.module.ts` and `portal.module.ts`
- `R2-11` Build eSocial S-2400 (Cadastro de Beneficiário Entes Públicos)
- `R2-12` Build eSocial S-2405 (Alteração de Cadastro do Beneficiário)
- `R2-13` Build eSocial S-2410 (Concessão de Benefício Previdenciário)
- `R2-14` Build eSocial S-2416 (Instituidor de Pensão)
- `R2-15` Build eSocial S-2418 (Reativação de Benefício)
- `R2-153` Add property-based tests on payroll calc paths
- `R2-154` Add idempotency assertions for folha complementar, eSocial S-1200 retransmission, DCTFWeb retransmission
- `R2-16` Build eSocial S-2420 (Cessação de Benefício)
- `R2-17` Build eSocial S-1202 (Remuneração de Servidor RPPS)
- `R2-18` Build eSocial S-1207 (Benefícios Previdenciários RPPS)
- `R2-52` Add golden monetary fixture for férias-folha
- `R2-53` Add golden monetary fixture for rescisão (3 specs)
- `R2-54` Add golden flat-file fixture for CNAB 240 emit (5 banks)
- `R2-55` Add golden flat-file fixture for CNAB 240 retorno
- `R2-70` Implement F-FOL-008 Importador de Verbas de Servidor (XLSX)
- `R2-71` Implement F-FOL-009 Importador de Verbas de Pensionista (XLSX)
- `R2-72` Implement F-FOL-007 Importador de Lançamento Manual (XLSX)
- `R2-77` Implement F-FOL-016 Rel. Batimento da Folha
- `R2-78` Implement F-FOL-013 Rel. Folha de Pagamento (PDF/Excel)

### Gestão (1)

- `R2-74` Implement F-GES-005 Classificações dos Atos

### Pontuação/Frequência (3)

- `R2-151` Add 403 negative-path e2e for every controller
- `R2-30` Encode EC 103/2019 transition rule — Sistema de Pontos
- `R2-82` Implement AFDT/ACJEF generators (Portaria 671)

### Refactor (4)

- `R2-100` Decompose `previdenciario.service.ts` (1717 LOC, 32 SQL sites)
- `R2-101` Decompose `gestao/master-data/master-data.service.ts` (1777 LOC)
- `R2-102` Decompose `rh/workflows/rh-workflows.service.ts` (1425 LOC, 52 SQL sites)
- `R2-108` Set `noImplicitAny:true` and `noUncheckedIndexedAccess:true` on backend tsconfig

### RH (1)

- `R2-75` Implement F-RH-003 Definição de Orgânico

### Self-Service (9)

- `R2-109` Migrate raw `this.http.*` frontend sites to `ApiClient`
- `R2-130` Adopt OnPush + signals + async pipe across admin Angular app
- `R2-131` Wire i18n on admin Angular app
- `R2-132` Wire Portal app pages to backend
- `R2-133` Add Playwright e2e suite for portal
- `R2-134` Add Playwright e2e suite for admin app
- `R2-135` Add gov.br advanced signature flow (Lei 14.063/2020)
- `R2-57` Add portal app auth guard + auth interceptor
- `R2-59` Add `RhRoutingModule` permissionGuard backfill

### Test debt (3)

- `R2-152` Add `useFakeTimers` and remove hard-coded date strings
- `R2-155` Make backend `test:cov` exercise worker entrypoints
- `R2-156` Add snapshot tests on serialized DTOs

<!-- end:auto-deferred-from-ledger -->
