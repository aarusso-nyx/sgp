# FACTS-01-LAW-TCE — TCE, transparency, public finance reporting and SIAFIC obligations

**Status:** authoritative | **Scope:** regulatory developer facts and semantic contracts | **Last reviewed:** 2026-05-03

This document is the engineering authority for translating the referenced legal and regulatory material into developer-facing facts and acceptance contracts. Raw retained source text lives under `docs/refs/tce/law/`; topic reference notes remain under `docs/refs/tce/`.

## Source Index

| Marker | Primary source                                                              |
| ------ | --------------------------------------------------------------------------- |
| [1]    | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm     |
| [2]    | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp131.htm                   |
| [3]    | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm                   |
| [4]    | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/D10540.htm |
| [5]    | https://www.gov.br/fnde/pt-br/assuntos/sistemas/siope                       |
| [6]    | https://www.gov.br/saude/pt-br/acesso-a-informacao/siops                    |
| [7]    | https://www.tce.sp.gov.br/audesp                                            |
| [8]    | https://tce.pb.gov.br/layout-sagres-2/                                      |

## Developer Facts

| ID      | Fact                                                                                                                               | Developer consequence                                                                                                                                      | Sources  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TCE-F01 | State audit-court obligations are not universal across Brazil.                                                                     | Implement pluggable adapters with explicit court, state, layout name, version, periodicity, transport and evidence model.                                  | [7], [8] |
| TCE-F02 | Transparency law requires active disclosure and access-to-information workflows while protecting unnecessary personal identifiers. | Public payroll exports must expose accountability fields and suppress direct personal identifiers not required for public oversight.                       | [1], [2] |
| TCE-F03 | LRF fiscal reporting includes RREO and RGF obligations with defined fiscal-period semantics.                                       | Fiscal/reporting modules must model period, report type, legal deadline, responsible entity and publication evidence.                                      | [3]      |
| TCE-F04 | SIAFIC defines an integrated execution and control system for budget, financial and accounting execution.                          | Payroll accounting outputs must be interoperable with accounting execution facts and must preserve competence, budget classification and accounting stage. | [4]      |
| TCE-F05 | SIOPE and SIOPS are domain-specific reporting systems for education and health expenditure.                                        | HR/payroll facts used for education or health reporting need cost-center/program tagging and period traceability.                                          | [5], [6] |
| TCE-F06 | Court-specific layouts often include payroll, acts of personnel, accounting and procurement families.                              | Do not infer payroll layout from a generic court portal; adapter conformance requires the selected layout/manual.                                          | [7], [8] |

## Semantic Contracts

| Contract                            | Rule                                                                                                                          | Observable acceptance                                                                                                                             | Sources  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TCE-C01-explicit-adapter            | Each court export MUST declare state/court, layout name, layout version, reporting period, payload kind, and transport mode.  | Adapter registry tests fail if any adapter lacks source URL, version, period or transmission declaration.                                         | [1], [3] |
| TCE-C02-no-universal-layout         | No implementation may claim generic TCE conformance without a selected court-specific manual or layout.                       | Conformance metadata exposes `unverified` or equivalent status until official layout evidence is linked.                                          | [3]      |
| TCE-C03-public-payroll-minimization | Public payroll transparency MUST exclude CPF, document numbers, health details, biometric data, home address and bank data.   | Export tests assert presence of name/cargo/remuneration/public unit where required and absence of sensitive identifiers.                          | [1], [2] |
| TCE-C04-fiscal-period-lock          | RREO/RGF style reports MUST carry legal period, generation timestamp, responsible entity and source ledger closure point.     | Re-running after ledger changes produces a new evidence object rather than mutating prior published evidence.                                     | [3]      |
| TCE-C05-siafic-accounting-link      | Payroll accounting exports MUST carry enough classification to reconcile with integrated budget-finance-accounting execution. | Payload contract tests require competence, entity, program/action or accounting classification, stage, amount and source payroll fact identifier. | [4]      |
| TCE-C06-domain-system-tags          | SIOPE/SIOPS exports MUST be built from explicitly tagged education/health expenditure facts.                                  | Tests reject report generation when expenditure facts lack domain tag, funding source or period.                                                  | [5], [6] |
