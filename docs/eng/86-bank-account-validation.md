# Validação de Dados Bancários

BANK-03 define que contas para crédito de folha só ficam elegíveis quando a validação determinística retorna `VALID`. O cadastro usa o catálogo FEBRABAN em `hr.bank`, valida agência, conta e CPF do titular, e registra a mutação em `public.audit_event` e em `hr.employee_bank_account_history`.

## Bancos suportados

As regras iniciais cobrem BB `001`, Santander `033`, Banrisul `041`, Caixa `104`, Bradesco `237`, Itaú `341`, Sicredi `748` e Sicoob `756`. Cada regra declara comprimento de agência, comprimento de conta, necessidade de DV de agência e pesos de DV de conta. A implementação vive em `source/backend/src/folha-pagamento/operations/bank-account/`.

## Códigos de erro

- `BANK_NOT_SUPPORTED`: banco sem regra ativa no validador.
- `AGENCY_LENGTH_INVALID`: agência fora do tamanho esperado.
- `AGENCY_DIGIT_INVALID`: dígito verificador de agência inválido.
- `ACCOUNT_LENGTH_INVALID`: conta fora do tamanho esperado.
- `ACCOUNT_DIGIT_INVALID`: dígito verificador da conta inválido.
- `CPF_INVALID`: CPF do titular inválido.
- `HOLDER_CPF_NOT_EMPLOYEE`: titular próprio não confere com o CPF do servidor.
- `DEPENDENT_NOT_AUTHORIZED`: dependente não existe para o servidor ou não possui autorização documental para crédito.

## Elegibilidade CNAB

BANK-01 deve consumir somente contas em `hr.employee_bank_account` com `validation_status = 'VALID'`. Contas `PENDING` ou `REJECTED` não podem ser listadas como destino de remessa.
