# Seed Data Report

- Source: `sql/00_inventory/raw/seed_candidates.json` plus `sql/00_inventory/seed_rows/*`.
- Included seed tables: 29.
- Excluded seed candidates: 7.

## Included Tables

- `dbo.atividade`
- `dbo.banco`
- `dbo.categoria_profissional`
- `dbo.cbo`
- `dbo.centro_custo`
- `dbo.cnae`
- `dbo.codigo_pagamento_gps`
- `dbo.grupo_salarial`
- `dbo.menu`
- `dbo.natureza_funcao`
- `dbo.papel`
- `dbo.processo_funcao`
- `dbo.cargo`
- `dbo.cargo_atividade`
- `dbo.funcao`
- `dbo.referencia_salarial`
- `dbo.tipo_folha`
- `dbo.tipo_processamento`
- `dbo.turno`
- `dbo.unidade_federativa`
- `dbo.municipio`
- `dbo.agencia`
- `dbo.empresa_filial`
- `dbo.verba`
- `dbo.cargo_verba`
- `dbo.conta_contabil`
- `dbo.verba_formula`
- `dbo.vinculo`
- `dbo.cargo_vinculo`

## Excluded Candidates

- `dbo.anexo`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.usuario`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.funcionario`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.folha_competencia`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.folha_pagamento`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.funcionario_verba`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data
- `dbo.folha_pagamento_funcionario_verba`: excluded as transactional, person, attachment, or session-specific seed-inappropriate data

## Notes

- `vinculo` has a self-reference, but the extracted seed row leaves the self-FK null, so load ordering remains safe.
- `verba_formula.formula` is preserved as source text; behavior validation for the formula engine remains outside seed scope.
- Identity reset statements are emitted after inserts for included identity-backed tables.

## Files Changed

- `sql/30_seed_data/dbo/10_reference_core.sql`
- `sql/30_seed_data/dbo/20_reference_dependents.sql`
- `sql/30_seed_data/dbo/30_reference_associations.sql`
- `sql/30_seed_data/dbo/99_identity_resets.sql`
- `sql/30_seed_data/dbo/00_seed_report.md`
