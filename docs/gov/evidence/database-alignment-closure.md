# Database Alignment Closure Evidence

Evidence/status artifact. It records implementation state and does not override authored or facts authority.

## Merged Artifact Index

- 68. Alinhamento de Banco - Relatório de Reabertura (Fase 4 Revisit)

## 68. Alinhamento de Banco - Relatório de Reabertura (Fase 4 Revisit)

## 68. Alinhamento de Banco - Relatório de Reabertura (Fase 4 Revisit)

### Data da reabertura

- 2026-04-25

### Motivo

O relatório de 2026-04-22 marcava a fase 4 como encerrada, mas a linha de base do runtime ainda não atendia o contrato multi-tenant definido em `docs/eng`:

1. JWT aceito sem `tenant_id`.
2. Contexto SQL sem `app.current_tenant_id`.
3. Policies RLS guiadas apenas por permissão.
4. Tabelas de negócio sem `tenant_id`.
5. Gate verde apenas porque a fase alvo era `phase_3_core`, apesar de `109` objetos ainda estarem `explicitly_excluded`.

### Escopo executado no revisit

1. Tenant claim passou a ser obrigatório no auth runtime (`custom:tenant_id`, com fallback controlado para `tenant_id`).
2. O backend agora injeta `app.current_tenant_id` e `app.current_tenant` em toda query.
3. O SQL canônico adiciona `public.tenant`, completa `tenant_id` nas tabelas runtime omitidas no primeiro corte e rebalanceia unicidade de chaves de negócio para escopo por tenant.
4. Helpers/policies SQL passaram a exigir `public.sgp_tenant_matches(tenant_id)`.
5. Projeções `portal.mv_*` agora carregam `tenant_id` e `tenant_slug`.
6. O gate de alinhamento ganhou verificação explícita de cobertura tenant/RLS e suporte a `full_closure`.

### Evidências técnicas

- Gate: `scripts/check-db.mjs alignment check`
- SQL canônico: `database/sql/`
- Grants runtime: `database/sql/90-runtime-grants.sql`
- Smoke: `scripts/db.mjs bootstrap-smoke`
- Matriz vigente: `docs/gov/generated/database/alignment-matrix.json`

### Situação atual

1. O falso-verde de tenant/RLS foi removido.
2. O gate `full_closure` agora exige que todas as entradas in-scope estejam `implemented` ou `canonicalized`, com `canonical_object` definido.
3. `dbo.sysdiagrams` permanece a única exclusão técnica aprovada por ser artefato de diagrama do SQL Server legado.

### Fechamento full_closure de 2026-04-25

A matriz vigente removeu as 15 exclusões in-scope restantes por dois caminhos:

1. Objetos com dono canônico já existente foram mapeados sem criar shims legados:
   - `dbo.empresa_filial_lotacao` -> `hr.work_location`
   - `dbo.etapa` -> `hr.reference_catalog_entry`
   - `dbo.flyway_schema_history` -> `database/sql/`
   - `dbo.menu` -> `public.menu_item`
   - `dbo.papel` -> `public.permission`
   - `dbo.tipo_averbacao` -> `hr.reference_catalog_entry`
2. Objetos sem dono runtime suficiente receberam tabelas canônicas em inglês, tenant-scoped, em `hr` ou `payroll`:
   - `payroll.professional_category_earning`
   - `hr.job_function_legislation_history`
   - `hr.service_provider`
   - `hr.service_taker`
   - `hr.training_suggestion`
   - `hr.training_suggestion_complement`
   - `hr.training_suggestion_employee`
   - `hr.training_suggestion_cost`
   - `hr.shift_day_off`

Evidência:

- SQL canônico: `database/sql/`
- Matriz: `docs/gov/generated/database/alignment-matrix.json`
- Gate: `cd . # repository root && node scripts/check-db.mjs alignment check --json`
