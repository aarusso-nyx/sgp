# Aviso previo CLT

## Escopo

O aviso previo para vinculos CLT fica registrado em `payment.prior_notice` e pode ser `WORKED`, `INDEMNIFIED` ou `NONE`. A tabela e tenant-scoped, protegida por RLS com `sgp_tenant_matches(tenant_id)` e permissoes `payroll.run.read` / `payroll.run.write`, e toda mutacao dispara auditoria por `public.sgp_append_audit_event(...)`.

## Proporcionalidade

`payment.compute_prior_notice_days(employment_link_id, termination_date)` aplica a Lei 12.506/2011: 30 dias base, mais 3 dias por ano completo de servico, limitado a 90 dias. Vinculos estatutarios ou nao CLT nao geram registro de aviso previo.

## Reflexos

Para aviso `INDEMNIFIED` em desligamento CLT sem justa causa, `payment.compute_prior_notice(...)` grava a data projetada e a base salarial do aviso. `payroll_calc.compute_rescisao(...)` usa essa data projetada para os avos de 13o proporcional e ferias proporcionais, e emite a rubrica `RESC_AVISO_PREVIO` com quantidade igual aos dias proporcionais.

Em pedido de demissao sem cumprimento, o aviso indenizado e emitido como desconto em `RESC_AVISO_PREVIO_DESCONTO`, sem projetar avos. Aviso `WORKED` registra a modalidade e modo de reducao (`TWO_HOURS_DAY`, `SEVEN_FINAL_DAYS` ou `NONE`), mas nao cria verba indenizada.

## Integracoes

CALC-12 le o aviso persistido antes de compor a rescisao. A base do aviso indenizado integra a composicao rescisoria e fica disponivel para CLT-01/FGTS e para totalizadores eSocial S-1200/S-2299 por meio das rubricas calculadas e da view `payroll.v_termination_with_notice`.
