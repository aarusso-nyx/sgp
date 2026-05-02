# PONTO-07 - Integracao entre ponto e folha

## Escopo

Este documento define a ponte entre o fechamento de ponto e a folha mensal. A fonte operacional e `ponto.timesheet_period` fechado, combinado com marcacoes, escalas publicadas/travadas, banco de horas e justificativas aprovadas. Periodos `OPEN` nao podem gerar linhas para folha.

## Mapa rubrica x agregado

| Rubrica dinamica  | Agregado                       | Tipo     | Regra                                                        |
| ----------------- | ------------------------------ | -------- | ------------------------------------------------------------ |
| `PONTO_HE50`      | `overtime_50_minutes`          | Provento | Hora extra em dia util com minimo legal de 50%.              |
| `PONTO_HE100`     | `overtime_100_minutes`         | Provento | Hora extra em DSR/domingo ou feriado operacional.            |
| `PONTO_NIGHT`     | `night_minutes`                | Provento | Adicional noturno de 20%, com hora reduzida CLT de 52min30s. |
| `PONTO_LATE`      | `late_minutes`                 | Desconto | Atrasos nao abonados.                                        |
| `PONTO_ABSENCE`   | `absence_unpaid_minutes`       | Desconto | Faltas/ausencias com tratamento `UNPAID`.                    |
| `PONTO_HOUR_BANK` | `hour_bank_settlement_minutes` | Provento | Zeragem positiva de banco de horas para folha.               |

## Contrato tecnico

`ponto.fn_aggregate_timesheet(tenant_id, employee_id, period_start, period_end)` consolida os minutos e a view `ponto.v_timesheet_payroll_input` expõe o mesmo contrato para periodos existentes. O backend usa `PayrollBridgeService` para pre-visualizar e aplicar as linhas; cada rubrica chama `payroll_calc.evaluate_earning_deduction(...)` e depois aplica quantidade/multiplicador com `Decimal`.

## Idempotencia

`ponto.payroll_bridge_event` registra `(payroll_run_id, employee_id, timesheet_period_id)` com `applied_lines`. Reaplicar a mesma combinacao retorna o evento existente e nao duplica itens em `payroll.employee_payroll_item`.

## Auditoria e seguranca

A tabela do bridge e tenant-scoped, força RLS por `sgp_tenant_matches(tenant_id)` e exige `ponto.payroll.read` ou `ponto.payroll.write`. Mutacoes disparam `sgp_append_audit_event(...)`.
