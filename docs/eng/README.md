# Engineering Authority (`docs/eng`)

This directory is the authoritative engineering and product specification source for SGP v0.0.1.

## Rules

- If `docs/eng` conflicts with reverse docs, `docs/eng` wins.
- For payroll engine internals, folia-derived implementation decisions may supersede specs; unresolved conflicts must be escalated.
- Keep file numbering and structure stable to preserve cross-references.
- Reverse evidence from `docs/legacy-reverse` must be succeeded here before it can be treated as current product/runtime truth.

## Key artifacts

- `BRIEF.md`
- `01-escopo-e-decisoes.md`
- `41-arquitetura-sistema.md`
- `32-diagramas-er.md`
- `63-guia-migracao-legado.md`
- `64-alinhamento-banco-fase-1.md`
- `65-alinhamento-banco-fase-2.md`
- `67-alinhamento-banco-fase-3.md`
- `66-alinhamento-banco-fase-4.md`
- `69-api-route-alignment.json`
- `68-alinhamento-banco-relatorio-fechamento.md`
- `70-adrs.md`
- `71-folia-engine-reconciliation.md`

## Reverse Evidence Succession

The 2026-04-26 reverse-engineering wave is canonicalized in:

- `40-divisao-modular.md` §11
- `43-maquinas-estado.md` "Refinamentos da Evidência Reversa de 2026-04-26"
- `50-arvore-menus.md` §7.4
- `60-catalogo-saidas-oficiais.md` §14
- `62-estrategia-testes.md` §6.2 baseline
- `63-guia-migracao-legado.md` §13
- `71-folia-engine-reconciliation.md` "Reverse evidence folded in on 2026-04-26"
