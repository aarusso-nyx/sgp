# Margem consignavel e averbacao de consignados

## Escopo

O modulo `folha-pagamento/operations/consignment` controla consignantes, averba contratos de emprestimo consignado por servidor e calcula a margem disponivel por competencia. A modelagem fisica de CONS-01 fica no schema `payment`, com `payment.consignment_entity` para bancos, cooperativas, sindicatos e associacoes conveniadas, e `payment.consignment_loan` para contratos averbados.

## Base legal

A regra padrao segue a Lei 14.509/2022: margem total de 45% sobre a base liquida, segregada em 35% para emprestimos consignados, 5% exclusivo para cartao de credito consignado/saque e 5% exclusivo para cartao consignado de beneficio/saque. O Decreto 8.690/2016, o Decreto 11.150/2022 e a Lei 8.112/1990 art. 45 orientam a ordem de descontos e o respeito ao minimo disponivel.

## Parametrizacao

Os percentuais sao configurados por tenant em `public.system_parameter`:

- `consignment.margin.general_pct`: percentual para consignados gerais, padrao `0.35`.
- `consignment.margin.credit_card_pct`: percentual exclusivo para cartao de credito consignado/saque, padrao `0.05`.
- `consignment.margin.benefit_card_pct`: percentual exclusivo para cartao consignado de beneficio/saque, padrao `0.05`.

Entes com norma local podem alterar os parametros sem mudanca de codigo. As colunas monetarias usam `numeric(14,2)` e taxas usam `numeric(18,6)`.

## Formula

Para cada servidor e competencia:

`net_base = liquido_after_pension - other_legal_deductions`

Na implementacao atual, `net_base` e lido do registro financeiro liquido da folha mensal depois dos descontos legais ja calculados. O calculador aplica:

- `available_general = max(round(net_base * general_pct, 2) - used_general, 0)`
- `available_credit_card = max(round(net_base * credit_card_pct, 2) - used_credit_card, 0)`
- `available_benefit_card = max(round(net_base * benefit_card_pct, 2) - used_benefit_card, 0)`

`used_general` soma contratos ativos `PAYROLL_LOAN`; `used_credit_card` soma contratos ativos `CARD`; `used_benefit_card` soma contratos ativos `OTHER`, que nesta versao representa o bucket de cartao consignado de beneficio sem introduzir novo enum fisico. A criacao de averbacao recusa valor de parcela maior que a margem disponivel do respectivo grupo com resposta HTTP 422.

## Folha mensal

Na cadeia CALC-11, consignados entram depois das bases e dos descontos legais/pensao. Cada contrato ativo gera uma rubrica de desconto `CONSIGNMENT_LOAN_DEDUCTION`, com chamada obrigatoria a `payroll_calc.evaluate_earning_deduction(...)` no contorno da rubrica e valor de parcela do contrato como referencia. Contratos suspensos, terminados, transferidos ou fora da vigencia nao entram na competencia.

## Seguranca e auditoria

`payment.consignment_entity` e `payment.consignment_loan` usam RLS forçado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e permissao `payment.consignment.read` ou `payment.consignment.write`. Mutacoes disparam `sgp_append_audit_event(...)` por trigger e as rotas mutantes tambem registram evento de aplicacao.
