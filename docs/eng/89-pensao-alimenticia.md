# Pensão Alimentícia

Este módulo registra ordens judiciais de pensão alimentícia em `hr.employee_alimony`, com múltiplos beneficiários por servidor, dados do juízo, beneficiário, conta judicial, base de cálculo, vigência, prioridade e status. A ordem vigente pode reter percentual sobre base bruta, líquida ou base específica definida na sentença, ou valor fixo mensal.

## Base Legal

- Lei 5.478/1968: disciplina a ação de alimentos e a retenção em folha quando determinada judicialmente.
- Código Civil, arts. 1.694 a 1.710: define obrigação alimentar, proporcionalidade e revisão.
- Lei 8.213/1991, art. 115: admite desconto em benefício/folha quando autorizado por lei ou decisão judicial.

## Fluxo Operacional

1. RH cadastra a ordem em `/api/v1/employees/:id/alimonies` com permissão `hr.alimony.write`.
2. A mutação grava auditoria por `sgp_append_audit_event(...)`; alterações e exclusões preservam a versão anterior em `hr.employee_alimony_history`.
3. A folha mensal executa `folha-pagamento/operations/alimony/AlimonyDeductionService` após os vencimentos base e antes dos consignados.
4. O desconto é emitido como rubrica `ALIMONY_DEDUCTION`, chamando `payroll_calc.evaluate_earning_deduction(...)` e usando `Decimal(14,2)` para valores e `Decimal(18,6)` para percentuais.
5. A remessa CNAB 240 acrescenta uma linha Segmento A por beneficiário ativo, com `purpose_code` de crédito alimentício e dados da conta judicial indicada na sentença.

## Regras de Desconto

- `ACTIVE`: entra na próxima folha se a competência estiver dentro de `valid_from` e `valid_to`.
- `SUSPENDED`: interrompe desconto e repasse a partir da próxima execução.
- `TERMINATED`: mantém histórico, mas não gera novas retenções.
- `GROSS`: calcula o percentual sobre vencimentos brutos.
- `NET`: calcula o percentual sobre o líquido parcial antes da própria pensão.
- `BASE_SPECIFIC`: calcula sobre rubricas explicitadas em `base_specific_codes`.
- Valor fixo e percentual são mutuamente exclusivos.

## Governança

`hr.employee_alimony` e `hr.employee_alimony_history` usam RLS por tenant com `sgp_tenant_matches(tenant_id)` e permissões `hr.alimony.read` / `hr.alimony.write`. Não há schema de compatibilidade para v0.0.1; o cadastro antigo foi estendido in-place como modelo canônico.
