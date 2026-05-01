# 65. Alinhamento de Banco - Fase 2 (Core Model + Transitional Retirement)

## Objetivo

Concluir a retirada da fatia transicional de tabelas operacionais e manter apenas contratos canônicos em `hr`, `payroll`, `public` e projeções read-only em `portal`.

## Implementação

1. Tabelas operacionais antes transicionais foram migradas para migração Prisma canônica em `hr`:
   - `hr.business_day`
   - `hr.file_export_job`
   - `hr.consignment_import_job`
   - `hr.employee_payroll_item_import_job`
   - `hr.competence_period`
2. Objeto transicional retirado:
   - `public.notification_counter` removido do contrato runtime.
3. Política RLS correspondente a `notification_counter` removida do suporte SQL.
4. Projeções de portal permanecem somente em `portal` (`MATVIEWs`) com consumo read-only.
5. FOL-02 elevou `hr.job_position`, `hr.salary_range` e `hr.salary_range_level` para a base remuneratória canônica: cargos passam a registrar categoria pública, regime jurídico, lei de criação, quantidade de vagas e vínculo obrigatório-opcional à faixa salarial; níveis registram classe, nível e vencimento básico `numeric(14,2)` com unicidade por tenant/faixa/classe/nível.
6. A cobertura RLS de cargos e tabela salarial usa `sgp_tenant_matches(tenant_id)` com permissões `gestao.cargo.read` e `gestao.cargo.write`.

## Evidência

- Migração: `source/backend/prisma/migrations/20260422013000_phase2_operational_tables/migration.sql`
- Migração FOL-02: `source/backend/prisma/migrations/20260501140000_fol02_cargos_estrutura/migration.sql`
- Matriz atualizada: `docs/eng/64-database-alignment-matrix.json`

## Regras preservadas

- Sem camada de compatibilidade legada.
- Nomenclatura física em inglês.
- Engine de folha permanece folia-first em objetos canônicos `payroll.*`.
