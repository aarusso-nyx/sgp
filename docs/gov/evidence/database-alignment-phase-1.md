# Database Alignment Evidence Phase 1

Evidence/status artifact. It records implementation state and does not override authored or facts authority.

## Merged Artifact Index

- 64. Alinhamento de Banco - Fase 1 (Core-First)

## 64. Alinhamento de Banco - Fase 1 (Core-First)

## 64. Alinhamento de Banco - Fase 1 (Core-First)

### Escopo

Esta fase aplica o alinhamento inicial do banco de dados para `v0.0.1` com separação física imediata por schema:

- `hr`: domínio de RH e cadastros operacionais correlatos.
- `payroll`: domínio de folha e objetos canônicos do motor de cálculo.
- `portal`: projeções materializadas somente leitura para `sgp-portal-api`.

Sem camadas de compatibilidade (`shim`, `dual-write`, `schema legado`).

### Artefatos Implementados

1. SQL canônico multi-schema em `database/sql/` como autoridade física e
   contratual do banco.
2. SQL canônico de split físico e schema runtime: `database/sql/`.
3. SQL de suporte consolidado nos artefatos canônicos em `database/sql`.
4. Projeções do portal convertidas para materialized views em `portal`:
   - `portal.mv_employee_directory`
   - `portal.mv_payroll_run_summary`
5. Script transitório de tabelas operacionais legadas removido; o bootstrap
   atual é composto apenas pelos arquivos canônicos em `database/sql`.

### SQL Canônico

PostgreSQL é o banco-alvo. O v0.0.1 usa SQL canônico em `database/sql` para
bootstrap de bancos novos; Prisma foi removido do runtime e dos artefatos de
alinhamento.

Ordem e responsabilidade dos artefatos:

- `database/sql/00-extensions.sql`: extensões PostgreSQL requeridas.
- `database/sql/01-settings.sql`: ajustes de sessão usados durante aplicação.
- `database/sql/02-schemas.sql`: schemas runtime canônicos.
- `database/sql/03-public-prelude.sql`: enums e helpers públicos exigidos cedo
  por defaults de tabelas posteriores.
- `database/sql/10-NN-*-ddl.sql`: DDL ordenado por schema, com tipos,
  funções exigidas por defaults/colunas geradas, tabelas e constraints locais.
- `database/sql/40-*-functions.sql`: funções de negócio por schema.
- `database/sql/70-*-final.sql`: DDL tardio por schema, com views,
  materialized views, índices, triggers, FKs, RLS e comentários intencionais.
- `database/sql/90-runtime-grants.sql`: grants condicionais para roles runtime
  provisionadas externamente.
- `database/sql/91-reference-data.sql`: linhas de referência determinísticas
  necessárias antes do seed da aplicação.
- `database/sql/40-seed-loader.sql`: helper opcional de `psql` para payloads
  JSON de seed.
- `database/seed/`: fixtures JSON e documentação de seed determinístico,
  não secreto.

A implementação é fresh-start. Runtime schema paths não incluem camadas de
compatibilidade, dual-write ou shims de nomes legados.

### Matriz de Alinhamento

Crosswalk legível por máquina entre legado `dbo.*` e runtime canônico:

- `docs/gov/generated/database/alignment-matrix.json`

Status permitidos por objeto:

- `implemented`
- `canonicalized`
- `deferred`
- `explicitly_excluded`

### Gate da Fase

Fechamento da fase condicionado a:

1. Migrations + SQL de suporte aplicando com split de schemas sem regressão.
2. Cenários relevantes de `docs/eng` aprovados.
3. Matriz sem objetos não mapeados dentro do target da fase.
