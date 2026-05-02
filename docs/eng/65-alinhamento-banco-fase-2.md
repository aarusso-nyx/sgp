# 65. Alinhamento de Banco - Fase 2 (Core Model + Transitional Retirement)

## Objetivo

Concluir a retirada da fatia transicional de tabelas operacionais e manter apenas contratos canônicos em `hr`, `payroll`, `public` e projeções read-only em `portal`.

## Implementação

1. Tabelas operacionais antes transicionais foram consolidadas no SQL canônico v0.0.1 em `hr`:
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
6. FOL-04 tornou o PCCS funcional em `avaliacao.career_plan`: o plano registra lei instituidora, vigência, quantidade de classes, quantidade de referências e regra de progressão em markdown; `avaliacao.career_plan_job_position` vincula cargos ao plano e `hr.salary_range.career_plan_id` fixa a matriz salarial usada pela trilha.
7. A cobertura RLS de cargos e tabela salarial usa `sgp_tenant_matches(tenant_id)` com permissões `gestao.cargo.read` e `gestao.cargo.write`; o PCCS usa o mesmo predicado tenant-scoped com `avaliacao.pccs.read` e `avaliacao.pccs.write`.
8. FOL-05 instituiu histórico vigente-por-competência para bases salariais em `hr.salary_level_history`, com `salary_range_level_id`, `vigencia_inicio`, `vigencia_fim`, `vencimento_basico numeric(14,2)`, motivo tipado e lei de referência. A constraint `EXCLUDE USING gist` impede sobreposição por tenant e nível salarial, e `avaliacao.fn_get_vencimento_vigente(...)` resolve o vencimento correto para cálculo retroativo.
9. A API `POST /api/v1/avaliacao/salary-history/reajuste-massa` aplica reajuste em massa por faixa salarial ou PCCS, fecha a vigência anterior, grava auditoria via `sgp_append_audit_event(...)` por nível afetado e atualiza o parâmetro global `reajuste.data_base_padrao` com o último reajuste aplicado.
10. FOL-01 tornou `payroll.payroll_earning_deduction` a tabela funcional de rubricas para a transição Phase 2 -> Phase 3: cada rubrica mantém tipo canônico (`PayrollEntryKind`), incidências tributárias/previdenciárias em `jsonb`, vigência, códigos eSocial/oficial e metadados de fórmula compilada. `payroll.formula_attribute` passou a vincular atributos parametrizáveis diretamente à rubrica, e `payroll.job_position_earning` registra a ponte cargo x rubrica com vigência e condição de aplicação.
11. As três tabelas FOL-01 usam RLS tenant-scoped com `sgp_tenant_matches(tenant_id)` e permissões `folha.rubrica.read`, `folha.rubrica.write` e `folha.rubrica.preview`; mutações do backend gravam auditoria via `sgp_append_audit_event(...)`, incluindo o evento `folha.rubrica.created`.

## Evidência

- SQL canônico: `database/sql/`
- Matriz atualizada: `docs/eng/64-database-alignment-matrix.json`

## Regras preservadas

- Sem camada de compatibilidade legada.
- Nomenclatura física em inglês.
- Engine de folha permanece folia-first em objetos canônicos `payroll.*`.
