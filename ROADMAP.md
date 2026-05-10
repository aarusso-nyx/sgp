# Roadmap

Current product and migration priorities are governed by `docs/eng/quality-migration.md` and `docs/gov/audit/backlog-ledger.md`.

- Admin backend/db/frontend surfaces and AdminFeaturePage parity are delegated
  to the `../stynx` framework; they are not SGP backlog.
- Identity is delegated to the `../stynx` framework. SGP consumes Stynx-issued
  actor/session/claims and keeps only product-domain permissions and tenant
  authorization evidence.
- eSocial and DET implementation are external-service concerns outside this
  repository. SGP owns only accepted gateway/projection/status contracts.
- eSocial external homologation belongs to `../stynx-esocial`; SGP uses
  deterministic mocks/contracts for other external homologation surfaces unless
  a later owner decision reopens one.
- Malware scanning and quarantine are delegated to the `../stynx` storage
  module and are not SGP backlog.
- Automated deployment is AWS-only with separate flows: CDK provision/IaC
  creates resources, while artifact deploy pushes versioned Node/Angular bundles
  to designated EC2/PM2 targets. Release/homologation gates remain postponed for
  a focused owner discussion.
- SIAPE/SIOPS boundaries are tracked in `docs/gov/siape-siops-boundary.md`.

## Deferred backlog (auto-generated)

<!-- begin:auto-deferred-from-ledger -->

Total deferred items in ledger: **34**.

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

### Compliance/Fiscal (1)

- `R2-24` Mark DIRF deprecated and add competence cut-off guard

### Compliance/TCE (1)

- `R2-271` Implement Atos de Pessoal layouts per state

### Convênio (1)

- `R2-76` Promote Convênio domain (F-CON-001/002/003) to operational

### Cross-cutting (3)

- `R2-105` Add specs for `health/`, `external/`, `config/` infrastructure modules
- `R2-172` Add audit-event coverage dashboard query
- `R2-174` Add backpressure on worker poll loops

### Folha (13)

- `R2-103` Decompose `folha-mensal.service.ts` (1157 LOC) into state-machine slices
- `R2-104` Decompose `payroll.service.ts` (1386 LOC, 29 SQL)
- `R2-106` Fix duplicate-instantiation hazard in `folha-pagamento.module.ts` and `portal.module.ts`
- `R2-154` Add idempotency assertions for folha complementar and DCTFWeb retransmission
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

### Pontuação/Frequência (2)

- `R2-151` Add 403 negative-path e2e for every controller
- `R2-30` Encode EC 103/2019 transition rule — Sistema de Pontos

### Refactor (3)

- `R2-100` Decompose `previdenciario.service.ts` (1717 LOC, 32 SQL sites)
- `R2-101` Decompose `gestao/master-data/master-data.service.ts` (1777 LOC)
- `R2-102` Decompose `rh/workflows/rh-workflows.service.ts` (1425 LOC, 52 SQL sites)

### RH (1)

- `R2-75` Implement F-RH-003 Definição de Orgânico

### Self-Service (1)

- `R2-135` Add gov.br advanced signature flow (Lei 14.063/2020)

<!-- end:auto-deferred-from-ledger -->
