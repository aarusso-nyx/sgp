# PONTO-01 — Base Portaria MTP 671/2021

Este documento registra a fundação do módulo `ponto` para controle de jornada conforme a Portaria MTP 671/2021, capítulo VIII, mantendo o desenho físico em inglês e o comportamento de mutação auditável usado pelo restante do SGP v0.0.1.

## Modelo de Dados

O schema `ponto` contém seis tabelas tenant-scoped:

- `work_schedule`: jornada contratada, código, nome, horas semanais, tolerância e vigência.
- `work_shift`: turnos vinculados à jornada, classificados como `FIXED`, `FLEXIBLE`, `SHIFT_12X36`, `SHIFT_6X1` ou `OTHER`.
- `day_schedule`: horários por dia da semana, incluindo entrada, saída para almoço, retorno, saída e total de minutos.
- `employee_schedule_assignment`: vigência da atribuição servidor x jornada.
- `time_record`: marcações reais com `recorded_at`, origem `REP_P`, `REP_A`, `REP_C` ou `MANUAL_ADJUSTMENT`, NSR, `prev_hash`, `record_hash` e `raw_payload`.
- `timesheet_period`: período mensal de apuração com status `OPEN`, `CLOSED` ou `LOCKED` e acumuladores de minutos.

`public.tenant` passa a expor `tenant_timezone text NOT NULL DEFAULT 'America/Sao_Paulo'`, preparando PONTO-07 para cálculo de virada de dia, adicional noturno e fechamento por fuso do tenant.

## Encadeamento de Hash

`time_record` é append-only. O backend calcula o hash em `TimeRecordHashService` usando representação JSON canônica com chaves ordenadas e SHA-256 sobre `prev_hash || canonical(record)`. A criação manual rejeita `prev_hash` divergente do último registro do servidor e exige NSR crescente. O banco bloqueia `UPDATE` e `DELETE` por trigger para preservar a cadeia.

## Segurança, RLS e Auditoria

Todas as tabelas do schema `ponto` usam RLS forçada com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`. Leituras aceitam as permissões `ponto.schedule.read`, `ponto.schedule.write`, `ponto.timerecord.read` ou `ponto.timerecord.write`; escritas exigem a permissão de escrita da superfície correspondente. Todas as mutações chamam `sgp_append_audit_event(...)` por trigger de banco e os controllers mutáveis usam `@AuditMutation`.

## Papéis REP

Este corte cria apenas a base. `REP_P`, `REP_A` e `REP_C` já existem como valores físicos de origem em `ponto.time_record`, mas ingestão REP, AFD/AFDT, validação de equipamento e importação de arquivos ficam para PONTO-02 e PONTO-03.
