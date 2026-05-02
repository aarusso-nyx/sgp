# CNAB 240 Remessa Bancaria

## Escopo

O SGP gera remessa CNAB 240 para credito em conta de folha aprovada. A saida e um arquivo binario ASCII composto por registros fixos de 240 bytes, sem CRLF, com header de arquivo, header de lote, segmentos A/B por servidor, trailer de lote e trailer de arquivo.

## Bancos suportados

| Banco           | Codigo | Estrategia              |
| --------------- | -----: | ----------------------- |
| Banco do Brasil |    001 | `bb.strategy.ts`        |
| Caixa           |    104 | `caixa.strategy.ts`     |
| Itau            |    341 | `itau.strategy.ts`      |
| Bradesco        |    237 | `bradesco.strategy.ts`  |
| Santander       |    033 | `santander.strategy.ts` |

As estrategias isolam convenio, agencia cedente e modalidade. Campos contratuais reais de cada ente devem ser parametrizados antes da homologacao bancaria.

## Regras de emissao

- A folha (`payroll.payroll_run`) deve estar `APPROVED`.
- Somente contas `hr.employee_bank_account.validation_status = 'VALID'` entram na remessa.
- Valores sao calculados em decimal monetario e gravados como centavos nos campos numericos do CNAB.
- `payroll.payment_remittance_file` guarda banco, versao de layout, contagem, total, hash SHA-256 e data de geracao.
- `payroll.payment_remittance_detail` guarda a sequencia do segmento A por servidor para rastreio e retorno futuro.

## Campos posicionais principais

| Registro        | Posicoes | Conteudo                             |
| --------------- | -------- | ------------------------------------ |
| Header arquivo  | 001-003  | Codigo do banco                      |
| Header arquivo  | 004-007  | Lote `0000`                          |
| Header arquivo  | 008-008  | Tipo de registro `0`                 |
| Header lote     | 009-013  | Operacao/servico/forma de lancamento |
| Segmento A      | 009-013  | Sequencial no lote                   |
| Segmento A      | 014-014  | Segmento `A`                         |
| Segmento A      | 018-043  | Banco, agencia e conta favorecida    |
| Segmento A      | 044-073  | Nome do favorecido                   |
| Segmento A      | 094-101  | Data de pagamento                    |
| Segmento A      | 120-134  | Valor em centavos                    |
| Segmento B      | 014-014  | Segmento `B`                         |
| Segmento B      | 019-032  | CPF do favorecido                    |
| Trailer lote    | 018-023  | Quantidade de registros no lote      |
| Trailer lote    | 024-041  | Soma dos valores em centavos         |
| Trailer arquivo | 018-023  | Quantidade de lotes                  |
| Trailer arquivo | 024-029  | Quantidade total de registros        |

## Referencias

- FEBRABAN, Layout Padrao CNAB 240 posicoes V10.11.
- Caixa, Manual Operacional Pagamento de Salarios, Pagamento/Credito a Fornecedor e Autopagamento CNAB240.
- Santander, Pagamento a Fornecedores Layout CNAB 240.
