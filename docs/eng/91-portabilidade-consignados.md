# Portabilidade de consignados

CONS-02 implementa a importacao de portabilidade de contratos consignados a partir de arquivos enviados pelo consignante de destino. O arquivo recebido cria um registro em `payment.consignment_portability_file` com hash SHA-256, consignante origem, consignante destino e status operacional. Cada linha validada fica em `payment.consignment_portability_detail`, preservando CPF, contrato antigo, contrato novo, saldo portado, nova parcela, nova taxa e total de parcelas.

## Layout canonico

O layout inicial e `CANONICAL_CSV`, em UTF-8, separado por ponto e virgula, com cabecalho obrigatorio:

```text
employee_cpf;source_contract_number;target_contract_number;transferred_balance;new_monthly_amount;new_rate;new_installments_total
12345678901;OLD-001;NEW-001;1500.00;120.10;1.450000;24
```

CPF e normalizado para onze digitos. Valores monetarios sao `numeric(14,2)` e taxas sao `numeric(18,6)`. O parser rejeita linhas com CPF invalido, contrato ausente, valores negativos ou quantidade de parcelas menor que um.

## Adapters

| Adapter | Entrada | Uso |
| --- | --- | --- |
| `CANONICAL_CSV` | CSV interno separado por `;` | Base contratual comum entre consignantes |
| `BANK_X` | Registro posicional com CPF, contrato origem, contrato destino, saldo, parcela, taxa e parcelas | Exemplo inicial de arquivo fixo por consignante |
| `BANK_Y` | Arquivo delimitado por `|` com cabecalho equivalente ao canonico | Exemplo inicial de arquivo delimitado por consignante |

Novos consignantes devem adicionar adapter isolado em `backend/src/integrations-worker/consignment-portability/adapters/`, mantendo a saida no contrato canonico.

## Processamento

`POST /api/v1/payment/consignment-portability` recebe o conteudo textual, layout e ids dos consignantes. `POST /api/v1/payment/consignment-portability/:id/process` processa ou reprocessa o arquivo. Para cada detalhe, o backend busca `payment.consignment_loan` ativo por tenant, CPF do servidor, numero do contrato antigo e consignante origem. Linha conciliada marca o contrato antigo como `TRANSFERRED`, grava `transferred_to_loan_id`, cria a nova averbação no consignante destino com `transferred_from_loan_id` e registra detalhe `MATCHED`. Linha sem contrato visivel fica `UNMATCHED`, sem alterar a averbação existente, e permanece disponivel para reprocesso apos correcao.

Todas as tabelas sao tenant-scoped com RLS forcado por `sgp_tenant_matches(tenant_id)` e permissao `payment.consignment.read` ou `payment.consignment.write`; mutacoes exigem `payment.consignment.write`. O processamento chama `public.sgp_append_audit_event(...)` por arquivo e por linha processada, preservando trilha imutavel file-by-file e line-by-line.
