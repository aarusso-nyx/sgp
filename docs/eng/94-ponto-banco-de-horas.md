# PONTO-05 — Banco de horas

## Escopo

O banco de horas registra o delta diário entre jornada trabalhada e jornada esperada em `ponto.hour_bank_movement`, mantendo o saldo agregado em `ponto.hour_bank.balance_minutes`. O saldo é sempre derivado por trigger a partir dos movimentos e não deve ser ajustado diretamente pela aplicação.

## Regimes e prazos

- `CLT_INDIVIDUAL`: banco aberto por acordo individual com prazo máximo operacional de 6 meses.
- `CLT_COLETIVO`: banco aberto por acordo ou convenção coletiva com prazo máximo operacional de 1 ano.
- `ESTATUTARIO`: banco aberto por regra local de compensação de horário, com prazo definido pelo estatuto ou ato normativo do ente.

O cadastro do banco armazena `opened_at` e `expires_at`. A aplicação valida o regime no contrato de API e a regra local define a data de vencimento antes da abertura do banco. Bancos vencidos ou encerrados não aceitam novos movimentos `ACCRUAL_*`; a tentativa é bloqueada por trigger e registrada em auditoria com motivo `HOUR_BANK_EXPIRED`.

## Movimentos

Movimentos positivos usam `ACCRUAL_POSITIVE`. Deltas negativos usam `ACCRUAL_NEGATIVE`. Compensações de saída antecipada ou entrada postergada usam `COMPENSATION` e consomem saldo positivo. Ajustes administrativos usam `MANUAL_ADJUSTMENT` e passam pelo endpoint auditado.

Na zeragem por prazo, saldo positivo gera `SETTLEMENT_OVERTIME` para conversão em hora extra 50%. Saldo negativo gera `SETTLEMENT_DEDUCTION` para desconto em folha. A execução recebe `payroll_run_id` e é idempotente por `(hour_bank_id, payroll_run_id, kind)`, impedindo duplicidade ao reprocessar a mesma folha.

## Integração com folha

O settlement chama `payroll_calc.evaluate_earning_deduction(...)` quando uma rubrica de HE 50% é informada, preservando a política folia-first e a política de decimal monetário. O slice não cria a rubrica mensal final nem substitui PONTO-07; ele registra o movimento de zeragem e disponibiliza o vínculo com `payroll_run_id`.

## Segurança

`ponto.hour_bank` e `ponto.hour_bank_movement` são tenant-scoped, têm RLS forçado e usam `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. Leitura exige `ponto.hourbank.read` ou `ponto.hourbank.write`; mutação exige `ponto.hourbank.write`. Todas as mutações disparam `sgp_append_audit_event(...)`.
