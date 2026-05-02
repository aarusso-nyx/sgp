# 64. Alinhamento de Banco - Fase 1 (Core-First)

## Escopo

Esta fase aplica o alinhamento inicial do banco de dados para `v0.0.1` com separação física imediata por schema:

- `hr`: domínio de RH e cadastros operacionais correlatos.
- `payroll`: domínio de folha e objetos canônicos do motor de cálculo.
- `portal`: projeções materializadas somente leitura para `sgp-portal-api`.

Sem camadas de compatibilidade (`shim`, `dual-write`, `schema legado`).

## Artefatos Implementados

1. Prisma multi-schema em `backend/prisma/schema.prisma` com mapeamento explícito por modelo.
2. Migration de split físico: `backend/prisma/migrations/20260421110000_phase1_schema_split/migration.sql`.
3. SQL de suporte atualizado para objetos em `hr`/`payroll`.
4. Projeções do portal convertidas para materialized views em `portal`:
   - `portal.mv_employee_directory`
   - `portal.mv_payroll_run_summary`
5. Script transitório removido:
   - `database/sql/60-legacy-operational-tables.sql`

## Matriz de Alinhamento

Crosswalk legível por máquina entre legado `dbo.*` e runtime canônico:

- `docs/eng/64-database-alignment-matrix.json`

Status permitidos por objeto:

- `implemented`
- `canonicalized`
- `deferred`
- `explicitly_excluded`

## Gate da Fase

Fechamento da fase condicionado a:

1. Migrations + SQL de suporte aplicando com split de schemas sem regressão.
2. Cenários relevantes de `docs/eng` aprovados.
3. Matriz sem objetos não mapeados dentro do target da fase.
