# Matriz de Ocorrencias CNAB 240

Este documento registra a matriz operacional do BANK-02 para retorno CNAB 240. O parser le registros de 240 posicoes, considera segmentos A como linhas conciliaveis e usa `occurrence_code` para converter o retorno bancario em status interno canonico.

## Status Internos

| Status interno | Uso |
| --- | --- |
| `ACCEPTED` | Credito aceito ou confirmado pelo banco. |
| `REJECTED_INVALID_ACCOUNT` | Conta, agencia, digito ou favorecido invalido. |
| `REJECTED_INSUFFICIENT_FUNDS` | Pagamento rejeitado por insuficiencia de saldo/limite operacional. |
| `RETURNED_OTHER` | Devolucao ou rejeicao sem causa deterministica tratavel automaticamente. |

## Codigos Por Banco

| Banco | Codigo | Status interno | Mensagem operacional |
| --- | --- | --- | --- |
| 001 Banco do Brasil | `00` | `ACCEPTED` | Credito confirmado pelo banco. |
| 001 Banco do Brasil | `AA` | `ACCEPTED` | Arquivo aceito pelo Banco do Brasil. |
| 001 Banco do Brasil | `BD` | `REJECTED_INVALID_ACCOUNT` | Conta do favorecido invalida. |
| 001 Banco do Brasil | `BE` | `REJECTED_INVALID_ACCOUNT` | Agencia ou conta inexistente. |
| 001 Banco do Brasil | `BI` | `REJECTED_INSUFFICIENT_FUNDS` | Saldo insuficiente para efetivar o pagamento. |
| 001 Banco do Brasil | `RJ` | `RETURNED_OTHER` | Pagamento devolvido ou rejeitado por ocorrencia bancaria. |
| 033 Santander | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum | Matriz comum FEBRABAN usada ate homologacao por carteira. |
| 104 Caixa | `01` | `ACCEPTED` | Credito confirmado pela Caixa. |
| 104 Caixa | `03` | `REJECTED_INVALID_ACCOUNT` | Conta invalida na Caixa. |
| 104 Caixa | `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum | Complemento comum para retornos padronizados. |
| 237 Bradesco | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum | Matriz comum FEBRABAN usada ate homologacao por carteira. |
| 341 Itau | `00`, `BD`, `BE`, `BI`, `RJ` | Conforme matriz comum | Matriz comum FEBRABAN usada ate homologacao por carteira. |

## Regras De Conciliacao

- O retorno deve declarar o hash da remessa original; divergencia bloqueia o processamento antes de atualizar itens de folha.
- Cada linha deve casar `sequence`, `employee_id` e `amount` com `payroll.payment_remittance_detail`.
- Linhas aceitas gravam `employee_payroll_item.payment_status = 'PROCESSED'`; rejeicoes cadastrais ou financeiras gravam `REJECTED`; devolucoes gerais gravam `RETURNED`.
- Cada linha processada gera detalhe em `payroll.payment_return_detail` e auditoria via `public.sgp_append_audit_event(...)`.
