# FACTS-01-LAW-LGPD — LGPD and ANPD public-sector privacy obligations

**Status:** authoritative | **Scope:** regulatory developer facts and semantic contracts | **Last reviewed:** 2026-05-03

This document is the engineering authority for translating the referenced legal and regulatory material into developer-facing facts and acceptance contracts. Raw retained source text lives under `docs/refs/lgpd/law/`; topic reference notes remain under `docs/refs/lgpd/`.

## Source Index

| Marker | Primary source                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1]    | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm                                                                                                    |
| [2]    | https://www.gov.br/anpd/pt-br/assuntos/noticias/no-dia-internacional-da-protecao-de-dados-anpd-publica-guia-orientativo-sobre-tratamento-de-dados-pessoais-pelo-poder-publico       |
| [3]    | https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado |
| [4]    | https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd                                                        |
| [5]    | https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1                                                                                                                           |

## Developer Facts

| ID       | Fact                                                                                                                                       | Developer consequence                                                                                                                                 | Sources  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| LGPD-F01 | Personal data processing requires a legal basis and purpose.                                                                               | Every data category and processing operation must declare basis, purpose, actor role, retention, and sharing target.                                  | [1]      |
| LGPD-F02 | Sensitive data includes health and biometric data.                                                                                         | Health, biometric, disability, medical leave, and occupational records require explicit sensitive-data classification and stricter access controls.   | [1]      |
| LGPD-F03 | Public administration processing must be tied to public policy execution or legal competence.                                              | Public-sector modules must avoid consent as the default basis for statutory processing and must record public-interest or legal-obligation rationale. | [1], [2] |
| LGPD-F04 | Data subjects have rights to confirmation, access, correction, anonymization, portability where applicable, and information about sharing. | Implement request intake, identity verification, due-date control, response evidence, and denial rationale.                                           | [1], [5] |
| LGPD-F05 | The controller must identify an encarregado/DPO communication channel.                                                                     | Public contact, escalation owner, ticket routing, and evidence of response must be present in operational workflows.                                  | [1], [3] |
| LGPD-F06 | RIPD is the risk document for high-risk personal-data processing.                                                                          | High-risk workflows must have a DPIA/RIPD checklist covering data categories, necessity, proportionality, risks, controls, and residual risk.         | [1], [4] |
| LGPD-F07 | Data minimization applies even when transparency law requires disclosure.                                                                  | Public outputs must separate public-interest fields from identifiers that increase reidentification risk.                                             | [1], [2] |

## Semantic Contracts

| Contract                        | Rule                                                                                                                   | Observable acceptance                                                                                                                                | Sources  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| LGPD-C01-processing-register    | Every personal-data processing operation MUST be represented in a ROPA-like register.                                  | Register entries include purpose, legal basis, personal-data categories, sensitive categories, retention, processors, sharing and security controls. | [1], [4] |
| LGPD-C02-sensitive-data-default | Sensitive data MUST default to least-privilege access, explicit audit logging, and no public exposure.                 | Tests or policy checks prove biometric, health, medical leave, and disability fields cannot be read by generic roles.                                | [1]      |
| LGPD-C03-public-power-basis     | Public-sector processing MUST use legal obligation, public policy, or statutory competence before considering consent. | Review checklist rejects consent-only justification for mandatory HR, payroll, social-security, health, and transparency obligations.                | [1], [2] |
| LGPD-C04-dsar-lifecycle         | Data-subject requests MUST have intake, identity verification, triage, response, deadline, and evidence states.        | Workflow tests cover confirmation/access, correction, deletion/anonymization impossibility due to legal retention, and sharing information.          | [1]      |
| LGPD-C05-dpo-contact            | DPO contact details MUST be externally discoverable and internally routable.                                           | A health/preflight check can verify public contact configuration and ticket routing target.                                                          | [1], [3] |
| LGPD-C06-minimized-transparency | Transparency exports MUST suppress or mask identifiers that are not necessary for public accountability.               | Fixtures prove CPF, document numbers, biometric templates, health details, and addresses are absent from public datasets.                            | [1], [2] |
