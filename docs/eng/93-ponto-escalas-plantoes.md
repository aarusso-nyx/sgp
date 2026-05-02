# PONTO-04 — Escalas, Plantões e Turnos

## Escopo

Este documento define a semântica de escalas cíclicas do módulo de ponto eletrônico. A jornada fixa de PONTO-01 continua representada por `work_schedule`, `work_shift`, `day_schedule` e `employee_schedule_assignment`. PONTO-04 adiciona ciclos independentes do dia da semana para 12x36, 6x1, 5x2, 24x72 e escalas customizadas.

## Modelo de ciclo

`ponto.shift_pattern` identifica o padrão e declara `cycle_days`. Cada linha de `ponto.shift_pattern_day` representa uma posição do ciclo, com `day_index` iniciado em zero. Dias trabalhados exigem `entry_time` e `exit_time`; dias de folga permanecem sem horários e geram zero minuto esperado. Quando `exit_time` é menor ou igual a `entry_time`, a saída é projetada para o dia civil seguinte, cobrindo plantões noturnos.

## Ancoragem

`ponto.shift_assignment` aplica um padrão a um empregado com `anchor_date`, `valid_from` e `valid_to`. A data projetada usa:

```text
day_index = (work_date - anchor_date) modulo cycle_days
```

Assim, uma escala 12x36 ancorada em 2026-05-01 trabalha em 2026-05-01, folga em 2026-05-02 e repete o ciclo até o fim da vigência.

## Interação com jornadas fixas

O projetor de roster sempre prioriza `shift_assignment` ativo no período. Quando há escala cíclica ativa, `employee_schedule_assignment` e `day_schedule` não alimentam a jornada esperada desse empregado para as datas cobertas. Sem escala cíclica ativa, o projetor usa a jornada fixa de PONTO-01 pelo dia da semana.

## Roster mestre

`ponto.duty_roster` guarda a escala mestra de um período. `DRAFT` permite geração e revisão, `PUBLISHED` registra a versão publicada, e `LOCKED` congela o período para fechamento. `ponto.duty_roster_entry` materializa por empregado e data: entrada esperada, saída esperada, minutos esperados e flags de adicional.

Mudanças retroativas em `shift_assignment` cobertas por roster `LOCKED` são rejeitadas para preservar o fechamento de ponto e a rastreabilidade de folha.

## Flags

`night_shift_flag` marca turnos com adicional noturno potencial, inclusive plantões que cruzam meia-noite. `hazard_flag` marca exposição insalubre no turno. As flags não calculam rubricas neste slice; elas são insumo explícito para PONTO-07 e CALC-07.

## Segurança e auditoria

Todas as tabelas são tenant-scoped, forçam RLS e usam `sgp_tenant_matches(tenant_id)` com `ponto.roster.read` ou `ponto.roster.write` para leitura. Mutação exige `ponto.roster.write`. Toda mutação chama `sgp_append_audit_event(...)` por gatilho no banco.
