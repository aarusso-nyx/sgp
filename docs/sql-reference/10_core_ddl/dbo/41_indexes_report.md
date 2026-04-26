# Worker B Index Report

## Scope

- Frozen inputs:
  - `sql/00_inventory/raw/indexes.json`
  - `sql/00_inventory/raw/key_constraints.json`
  - `sql/01_prelude/00_canonical_rules.md`
- Owned outputs:
  - `sql/10_core_ddl/dbo/40_indexes.sql`
  - `sql/10_core_ddl/dbo/41_indexes_report.md`

## Objects Found

- Raw SQL Server index objects in inventory: `179`
- Constraint-backed index objects excluded from this worker scope: `144`
- Excluded backing index breakdown:
  - `143` primary-key backing indexes
  - `1` unique-constraint backing index
- Standalone non-constraint indexes in scope: `35`
- Standalone unique indexes in scope: `32`
- Standalone non-unique indexes in scope: `3`
- Filtered indexes in scope: `0`
- Indexes with `INCLUDE` columns in scope: `0`
- Standalone indexes with non-default fillfactor in scope: `0`
- Disabled standalone indexes in scope: `0`

## Objects Converted

- PostgreSQL `CREATE INDEX` statements emitted: `35`
- Translation shape:
  - SQL Server `NONCLUSTERED` -> PostgreSQL `btree`
  - `is_unique = true` -> `CREATE UNIQUE INDEX`
  - `fill_factor = 0` -> no PostgreSQL storage parameter emitted

| Table | Source index | PostgreSQL shape | Key columns | Notes |
| --- | --- | --- | --- | --- |
| `area_formacao` | `uk_area_formacao` | `CREATE UNIQUE INDEX` | `area_formacao` | Preserved as standalone unique index |
| `banco` | `uk_banco_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `banco` | `uk_banco_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `cargo` | `uk_cargo_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `categoria_doenca` | `uk_categoria_doenca_codigo` | `CREATE INDEX` | `codigo` | Name suggests uniqueness, inventory marks non-unique |
| `categoria_doenca` | `uk_categoria_doenca_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `categoria_profissional` | `uk_categoria_profissional_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `categoria_profissional` | `uk_categoria_profissional_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `cbo` | `uk_cbo_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `cbo` | `uk_cbo_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `classificacao_internacional_doenca` | `uk_classificacao_internacional_doenca_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `classificacao_internacional_doenca` | `uk_classificacao_internacional_doenca_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `crm_crea` | `uk_crm_crea_nome_conveniado` | `CREATE UNIQUE INDEX` | `nome_conveniado` | Preserved as standalone unique index |
| `crm_crea` | `uk_crm_crea_nome_numero_crm_crea` | `CREATE UNIQUE INDEX` | `numero_crm_crea` | Preserved as standalone unique index |
| `esocial` | `uk_esocial_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `flyway_schema_history` | `flyway_schema_history_s_idx` | `CREATE INDEX` | `success` | Preserved as standalone non-unique index |
| `funcionario` | `uk_funcionario_matricula` | `CREATE UNIQUE INDEX` | `matricula` | Preserved as standalone unique index |
| `funcionario` | `uk_funcionario_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `grupo_salarial` | `uk_grupo_salarial_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `menu` | `uk_menu_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `modelo_documento` | `uk_modelo_documento_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `natureza_funcao` | `uk_natureza_funcao_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `pensao_alimenticia` | `pensao_alimenticia_id_uindex` | `CREATE UNIQUE INDEX` | `id` | Standalone unique index duplicates PK column set; preserved for fidelity |
| `referencia_salarial` | `uk_nivel_salarial_codigo` | `CREATE INDEX` | `codigo` | Name suggests uniqueness, inventory marks non-unique |
| `sub_categoria_doenca` | `uk_sub_categoria_doenca_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `sub_categoria_doenca` | `uk_sub_categoria_doenca_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `tipo_contrato` | `uk_tipo_contrato_nome` | `CREATE UNIQUE INDEX` | `nome` | Preserved as standalone unique index |
| `tipo_processamento` | `uk_tipo_processamento_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `tipo_processamento` | `uk_tipo_processamento_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |
| `transferencia_funcionario` | `transferencia_funcionario_id_uindex` | `CREATE UNIQUE INDEX` | `id` | Standalone unique index duplicates PK column set; preserved for fidelity |
| `turno` | `uk_turno_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `usuario` | `uk_usuario_login` | `CREATE UNIQUE INDEX` | `login` | Preserved as standalone unique index |
| `verba` | `uk_verba_codigo` | `CREATE UNIQUE INDEX` | `codigo` | Preserved as standalone unique index |
| `verba` | `uk_verba_descricao_verba` | `CREATE UNIQUE INDEX` | `descricao_verba` | Preserved as standalone unique index |
| `vinculo` | `uk_fk_vinculo_descricao` | `CREATE UNIQUE INDEX` | `descricao` | Preserved as standalone unique index |

## Unresolved Items

- None blocking SQL generation inside worker scope.
- Redundant standalone unique indexes on `pensao_alimenticia(id)` and `transferencia_funcionario(id)` were preserved because they exist as explicit source objects even though the same column set is already protected by a primary key.

## Assumptions

- Schema `dbo` and all referenced tables already exist before `40_indexes.sql` runs.
- Primary keys and unique constraints are emitted by other workers; this worker intentionally excludes only their backing indexes, not separate standalone indexes with overlapping column sets.
- Collation-sensitive uniqueness behavior for `TEXT` columns is governed by the database/schema collation strategy outside this worker scope. No source index-level `COLLATE`, filtered predicate, or `INCLUDE` clause needed translation here.

## Blockers

- None.

## File Paths Changed

- `sql/10_core_ddl/dbo/40_indexes.sql`
- `sql/10_core_ddl/dbo/41_indexes_report.md`
