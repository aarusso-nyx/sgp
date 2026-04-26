# 66. Alinhamento de Banco - Fase 4 (Verificacao Local)

> Decisao temporaria de 2026-04-26: os gates de governanca/release ficam postergados. Este documento permanece como contrato da verificacao local de alinhamento de banco; qualquer wiring de CI, merge/deploy ou governanca produtiva e nao-bloqueante ate nova decisao.

## Objetivo

Endurecer o gate automatizado para refletir o contrato multi-tenant real do SGP e impedir falso-verde de alinhamento quando ainda existirem lacunas de `tenant_id`, RLS ou matriz de legado.

## Entregas

1. Script de validação determinística revisado:
   - `source/scripts/check-db-alignment.mjs`
2. Cobertura de tenant/RLS verificada em artefatos runtime:
   - migration `20260425090000_tenant_rls_hardening`
   - migration `20260425113000_tenant_scope_completion`
   - `source/database/sql/11-rls-context.sql`
   - `source/database/sql/12-rls-policies.sql`
   - `source/database/sql/20-sgp-core.sql`
3. Script exposto no workspace:
   - `npm --prefix source run db:alignment:check`
4. Check local disponivel em `commit:check` do workspace `source`.
5. Workflow CI de alinhamento tratado como opcional/postergado:
   - `source/.github/workflows/db-alignment.yml`
6. Smoke test de bootstrap de banco:
   - `npm --prefix source run db:smoke`
   - `source/scripts/db-bootstrap-smoke.mjs`

## Regras validadas pelo gate

1. Objetos do `current phase` (`SGP_DB_ALIGNMENT_PHASE`, default `full_closure`) devem estar com status `implemented` ou `canonicalized`.
2. Objetos do `current phase` devem ter `canonical_object` definido.
3. Em `full_closure`, qualquer `explicitly_excluded` in-scope quebra o gate; apenas `dbo.sysdiagrams` permanece exclusão aprovada.
4. Contrato retirado (`notification_counter`) não pode reaparecer em:
   - Prisma schema
   - SQL de políticas RLS
5. Política de referência proibida é derivada da matriz: qualquer objeto canônico `hr.*`/`payroll.*` implementado não pode aparecer como `public.<tabela>` em runtime.
6. Cobertura tenant-now é obrigatória para tabelas runtime em escopo:
   - `tenant_id UUID NOT NULL`
   - helper/contexto `app.current_tenant_id` + `app.current_tenant`
   - política RLS com `public.sgp_tenant_matches(tenant_id)`
   - índice tenant-leading nos acessos principais
   - projeções `portal.*` contendo `tenant_id`/`tenant_slug`
7. Quando CI for retomado, deve publicar relatório JSON da validação (`db-alignment-report.json`) com anotações de erro.
8. Quando CI for retomado, deve executar bootstrap de banco em PostgreSQL limpo (migrate + SQL support + seed + assertions de esquema, tenant context e permissões read-only do portal).

## Resultado esperado

Qualquer drift de matriz, ausência de contexto de tenant, RLS sem predicate de tenant, referência runtime proibida, reintrodução de objeto retirado ou mudança incompatível de fase deve quebrar a verificação local. O bloqueio automático de merge/deploy fica para a decisão futura sobre governança.
