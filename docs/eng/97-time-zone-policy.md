# Politica de fuso horario para jornada

## Fonte da verdade

`public.tenant.tenant_timezone` e a unica fonte de verdade para calculo de jornada. O valor deve ser um identificador IANA, como `America/Rio_Branco`, `America/Sao_Paulo` ou `America/Noronha`.

## Regra de agregacao

Marcacoes sao persistidas como `timestamptz`, mas dias de trabalho, virada de plantao, janela noturna e limites de periodo sempre sao calculados com `recorded_at AT TIME ZONE tenant_timezone`. O backend nao deve usar `Date.toISOString()` para decidir fronteiras de jornada; a conversao fica isolada em `tenant-timezone.util.ts`.

## Adicional noturno

A janela noturna CLT e 22:00-05:00 no fuso local do tenant. Os minutos da janela sao convertidos pela hora reduzida de 52min30s, usando fator `60 / 52.5`, antes de alimentar a rubrica `PONTO_NIGHT`.

## Interfaces

A tela administrativa de PONTO-07 e o portal do empregado mostram os agregados ja calculados no fuso do tenant. Datas exibidas sao derivadas do contrato do backend, nao recalculadas no navegador.
