# 67. Alinhamento de Banco - Fase 3 (Backend Runtime Coverage)

## Objetivo

Promover para cobertura canônica os objetos legados que já possuem comportamento backend implementado, reduzindo backlog `deferred` para a trilha de runtime já entregue.

## Escopo promovido para `phase_3_core`

- `dbo.notificacao` -> `public.notification`
- `dbo.usuario` -> `public.user_account`
- `dbo.usuario_papel` -> `public.profile_assignment` (canonicalized)
- `dbo.situacao_funcional` -> `hr.functional_status`
- `dbo.definicao_de_organico` -> `hr.work_location`
- `dbo.transferencia_funcionario` -> `hr.employee_transfer`
- `dbo.folha_competencia` -> `hr.competence_period`
- `dbo.folha_pagamento_funcionario_verba` -> `payroll.employee_payroll_item`
- `dbo.funcionario_verba` -> `payroll.employee_payroll_item` (canonicalized)
- `dbo.ferias_programacao` -> `hr.vacation_record`
- `dbo.falta` -> `hr.leave_record`

## Governança de fase

1. Gate default passou para `SGP_DB_ALIGNMENT_PHASE=phase_3_core`.
2. `source/scripts/check-db-alignment.mjs` valida:
   - estrutura da matriz (`status`, `phase`, duplicidade),
   - completude do phase target,
   - ausência de regressão de objetos retirados,
   - ausência de referências runtime proibidas `public.*` para tabelas movidas para `hr`/`payroll`.
3. Suporte a saída JSON (`--json`) para integração em CI.

## Resultado

`phase_3_core` fica executável e verificável por gate automatizado, sem alterar contratos REST externos.
