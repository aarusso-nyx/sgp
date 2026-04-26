# Legacy Reverse Deprecation Coverage

This table tracks which archived reverse docs/sections have been superseded by canonical engineering docs.

| legacy_doc | legacy_section | canonical_doc | canonical_section | coverage_status | deprecation_status | owner | last_reviewed |
|---|---|---|---|---|---|---|---|
| application-overview.md | entire document | docs/eng/BRIEF.md | scope and product identity | covered | deprecated | orchestrator | 2026-04-22 |
| application-overview.md | architecture interpretations | docs/eng/41-arquitetura-sistema.md | architecture and containers | covered | deprecated | orchestrator | 2026-04-22 |
| database-model.md | inferred table catalog | docs/eng/32-diagramas-er.md | ER models by context | partial | active_evidence | orchestrator | 2026-04-22 |
| database-model.md | payroll model assumptions | docs/eng/01-escopo-e-decisoes.md | payroll entities and decisions | covered | deprecated | orchestrator | 2026-04-22 |
| sitemap.md | route and menu shell map | docs/eng/50-arvore-menus.md | menu tree | covered | deprecated | docs-worker | 2026-04-22 |
| feature-catalog.md | feature inventory | docs/eng/10-uc-administracao-seguranca.md | use cases | partial | active_evidence | docs-worker | 2026-04-22 |
| workflows.md | lifecycle/workflow notes | docs/eng/43-maquinas-estado.md | state machines | covered | deprecated | docs-worker | 2026-04-22 |
| api-calls.md | observed HTTP payloads | docs/eng/42-contratos-integracao.md | contracts and integrations | partial | active_evidence | specs-worker | 2026-04-22 |
| api-calls.md | canonical route parity backlog | docs/eng/69-api-route-alignment.json | documented versus runtime route closure matrix | covered | deprecated | orchestrator | 2026-04-22 |
| permission-gap-report.md | permission gap narrative | docs/eng/51-modelo-autorizacao.md | RBAC model | covered | deprecated | specs-worker | 2026-04-22 |
| permission-gap-report.csv | extracted permission data | docs/eng/51-modelo-autorizacao.md | permission matrix | partial | active_evidence | specs-worker | 2026-04-22 |
| handoff-2026-04-19.md | prior reverse handoff | docs/eng/BRIEF.md | baseline scope | covered | retired | orchestrator | 2026-04-22 |
| modules/gestao.md | reverse module notes | docs/eng/40-divisao-modular.md | module decomposition | covered | deprecated | docs-worker | 2026-04-22 |
| modules/modulo-rh.md | reverse module notes | docs/eng/40-divisao-modular.md | module decomposition | covered | deprecated | docs-worker | 2026-04-22 |
| modules/folha-de-pgt.md | reverse module notes | docs/eng/01-escopo-e-decisoes.md | payroll module scope | covered | deprecated | docs-worker | 2026-04-22 |
| modules/auditoria.md | reverse module notes | docs/eng/70-adrs.md | audit ADR sections | covered | deprecated | specs-worker | 2026-04-22 |
| modules/convenio.md | reverse module notes | docs/eng/40-divisao-modular.md | module decomposition | covered | deprecated | docs-worker | 2026-04-22 |
| modules/relatorio.md | reverse module notes | docs/eng/60-catalogo-saidas-oficiais.md | official outputs | covered | deprecated | docs-worker | 2026-04-22 |
| modules/unmapped.md | unmatched surfaces | docs/eng/63-guia-migracao-legado.md | migration backlog | partial | active_evidence | orchestrator | 2026-04-22 |
| sql-reference/00_inventory/raw/tables.json | legacy dbo table inventory | docs/eng/64-database-alignment-matrix.json | legacy-to-canonical object matrix | covered | deprecated | orchestrator | 2026-04-22 |
| source/database/sql/60-legacy-operational-tables.sql | transitional operational tables | docs/eng/65-alinhamento-banco-fase-2.md | transitional retirement and canonical replacements | covered | retired | orchestrator | 2026-04-22 |
| modules/modulo-rh.md | observed RH workflow routes now mapped in runtime | docs/eng/67-alinhamento-banco-fase-3.md | phase_3_core runtime coverage promotions | partial | active_evidence | orchestrator | 2026-04-22 |
| database-model.md | residual post_phase_1 tables | docs/eng/68-alinhamento-banco-relatorio-fechamento.md | full_closure residual canonical mappings | covered | deprecated | orchestrator | 2026-04-25 |
