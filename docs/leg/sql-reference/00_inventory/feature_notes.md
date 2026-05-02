# Feature Discovery Notes

- Requested source database: `rhlinkcom`. Actual online user database inspected: `rhlinkcon`.
- Engine/version: rhlinkcon on Microsoft Azure SQL Edge Developer (RTM) - 15.0.2000.1574 (ARM64) 
	Jan 25 2023 10:36:08 
	Copyright (C) 2019 Microsoft Corporation
	Linux (Ubuntu 18.04.6 LTS aarch64) <ARM64>.
- Database collation: `Latin1_General_CI_AS`.
- User schemas discovered: dbo.
- Tables: 151; views: 0; routines: 8; triggers: 0; synonyms: 0; sequences: 0.
- Computed columns: 0 total, 0 persisted.
- Identity columns: 126; rowversion/timestamp columns: 0.
- Filtered indexes: 0; indexes with INCLUDE columns: 0.
- XML columns: 0; modules referencing XML features: 0; modules referencing JSON features: 0.
- Modules flagged for dynamic SQL review: 0; MERGE usage: 0; temp-object usage: 0.
- APPLY usage: 0; PIVOT/UNPIVOT usage: 0; explicit COLLATE usage in modules: 0.
- Temporal/system-versioned tables reported by catalog: 0.
- Seed/reference data candidates (heuristic): 36. See `raw/seed_candidates.json`.

## Largest Tables By Row Count

- `dbo.flyway_schema_history`: 385 rows
- `dbo.menu`: 99 rows
- `dbo.folha_pagamento_funcionario_verba`: 20 rows
- `dbo.funcionario`: 16 rows
- `dbo.funcionario_verba`: 16 rows
- `dbo.verba`: 11 rows
- `dbo.verba_formula`: 11 rows
- `dbo.aliquota`: 4 rows
- `dbo.empresa_filial`: 3 rows
- `dbo.folha_competencia`: 3 rows
- `dbo.referencia_salarial`: 3 rows
- `dbo.atributo_formula`: 2 rows
- `dbo.cargo_verba`: 2 rows
- `dbo.centro_custo`: 2 rows
- `dbo.codigo_pagamento_gps`: 2 rows
- `dbo.conta_contabil`: 2 rows
- `dbo.folha_pagamento`: 2 rows
- `dbo.agencia`: 1 rows
- `dbo.anexo`: 1 rows
- `dbo.atividade`: 1 rows

## Review Hotspots

