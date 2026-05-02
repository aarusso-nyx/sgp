# Prompt 01 - DB Full Closure

## Goal

Close the remaining database matrix gap from the current reassessment.

The current audit snapshot reports `151` legacy objects with `canonicalized=50`, `implemented=85`, and `explicitly_excluded=16`. Of those, `dbo.sysdiagrams` is the only approved technical out-of-scope artifact. The other explicit exclusions are in scope unless `docs/eng/` is updated to mark a specific object as future-version scope.

## Read First

- `AGENTS.md`
- `docs/eng/64-database-alignment-matrix.json`
- `docs/eng/64-alinhamento-banco-fase-1.md`
- `docs/eng/65-alinhamento-banco-fase-2.md`
- `docs/eng/66-alinhamento-banco-fase-4.md`
- `docs/eng/67-alinhamento-banco-fase-3.md`
- `docs/eng/68-alinhamento-banco-relatorio-fechamento.md`
- `docs/leg/audit/inv/database-alignment-inventory.json`
- `docs/leg/audit/diag/db-full-closure.md`
- `docs/eng/64-alinhamento-banco-fase-1.md`
- `backend/prisma/schema.prisma`

## Current In-Scope Explicit Exclusions

- `dbo.categoria_profissional_verba`
- `dbo.empresa_filial_lotacao`
- `dbo.etapa`
- `dbo.flyway_schema_history`
- `dbo.funcao_historico_lei`
- `dbo.menu`
- `dbo.papel`
- `dbo.prestador_servico`
- `dbo.tipo_averbacao`
- `dbo.tomador_servico`
- `dbo.treinamento_sugerido`
- `dbo.treinamento_sugerido_complemento`
- `dbo.treinamento_sugerido_funcionario`
- `dbo.treinamento_sugerido_valores`
- `dbo.turno_folga`

## Work Items

1. Re-read the live matrix and runtime schema. Do not trust the audit snapshot if the files have changed.
2. For each in-scope explicit exclusion, choose one closure path:
   - `implemented`: add or map a runtime-owned canonical model/table and wire the needed migration/runtime references.
   - `canonicalized`: map the legacy object to an existing canonical runtime object with a defensible domain owner.
3. Preserve `dbo.sysdiagrams` as the only approved technical out-of-scope artifact.
5. Keep Prisma as the runtime schema owner and SQL files as support-layer artifacts.
6. Keep tenant/RLS behavior intact. Do not remove request-scoped session context, tenant predicates, or row-security enforcement.
7. Update `docs/eng/` whenever a domain ownership or future-version scope decision changes acceptance.
8. Update `docs/leg/rev-eng/deprecation-status.md` for any newly retired legacy evidence.

## Acceptance Gates

Run from the repository root unless noted:

```bash
cd . # repository root
node scripts/check-db-alignment.mjs --json
npm run db:smoke
```

`npm run db:smoke` requires `DATABASE_URL`. If no database is configured, document that as a configuration blocker and do not report DB smoke as green.

The DB alignment gate is acceptable only when full closure has no in-scope explicit exclusions left. A phase-limited green result is not enough.

## Deliverable
