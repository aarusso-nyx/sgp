# Reintegracao S-2298

**Status:** implemented | **Escopo:** RH, Folha de Pagamento, eSocial

## Fluxo administrativo

A reintegracao registra uma ordem judicial, anulação administrativa ou anistia para vínculo previamente desligado. O operador informa o vínculo, o evento S-2299 original, a data de reintegração, a data da decisão, o fundamento e o anexo digitalizado. A aplicação valida que a data de reintegração não é futura e não antecede o desligamento original.

Ao aplicar a ordem, o sistema encerra o histórico funcional anterior, grava nova transição em `hr.employee_status_history` com `cause = 'REINSTATEMENT'`, remove a data de desligamento do servidor e reabre o vínculo. A ordem passa de `REGISTERED` para `APPLIED` e toda mutação é auditada por `sgp_append_audit_event(...)`.

## Fundamentos legais

O fluxo cobre reintegração por decisão judicial transitada em julgado, anulação de ato administrativo, incluindo decisão em PAD, e anistia. A base funcional considerada para o MVP é CLT art. 495 e Lei 8.112/1990 art. 28, com pagamento das diferenças do período entre o desligamento original e o retorno efetivo.

## Interacao com CALC-09

A aplicação usa a infraestrutura idempotente de reprocessamento de folha: para cada competência retroativa, cria ou reutiliza `payroll.payroll_run` com `cause = 'REINSTATEMENT_RETRO'`, recalcula rubricas compiladas por `payroll_calc.evaluate_earning_deduction(...)` e grava linhas `CALCULATED` com chave de idempotência ativa. A soma consolidada das diferenças é registrada em `payroll.payroll_financial_record` e pode ser repetida sem duplicar verbas ativas.

## Mapeamento S-2298

`esocial.s2298_event` guarda o XML, o recibo do S-2299 original e o tipo de reintegração. O builder gera `evtReintegr` no leiaute S-1.3 local: `tpReint = 1` para judicial, `tpReint = 2` para anistia e `tpReint = 9` para anulação administrativa. `dtEfetRetorno` e `dtEfeito` recebem a data de reintegração. Em reintegração judicial, `nrProcJud` recebe o número do processo com 20 dígitos. O XML é validado contra `evtReintegr.xsd` antes da transmissão pelo hub eSocial.
