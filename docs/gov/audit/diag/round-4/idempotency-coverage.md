# Idempotency Coverage

Round: 4
Coverage: 9/9 (100%)

| Surface               | Area                    | Status  | Evidence                                                                                                                                                                                       |
| --------------------- | ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| monthly-payroll       | Folha mensal            | covered | backend/src/folha-pagamento/payroll/payroll.service.ts:covered<br>tests/backend/calc-reprocessamento.e2e-spec.ts:covered<br>tests/backend/calc-reprocessamento-concorrente.e2e-spec.ts:covered |
| decimo-terceiro       | 13 salario              | covered | backend/src/folha-pagamento/payroll/decimo-terceiro.service.ts:covered<br>backend/src/folha-pagamento/payroll/decimo-terceiro.spec.ts:covered                                                  |
| ferias                | Ferias                  | covered | backend/src/folha-pagamento/payroll/ferias-payroll.service.ts:covered<br>tests/backend/calc-ferias.e2e-spec.ts:covered                                                                         |
| rescisao              | Rescisao                | covered | backend/src/folha-pagamento/rescisao/rescisao.service.ts:covered<br>backend/src/folha-pagamento/rescisao/rescisao.service.spec.ts:covered                                                      |
| manual-entry-import   | Importador manual       | covered | backend/src/folha-pagamento/import/manual-entry-import.service.ts:covered<br>backend/src/folha-pagamento/import/manual-entry-import.service.spec.ts:covered                                    |
| servidor-import       | Importador servidor     | covered | backend/src/folha-pagamento/import/servidor-import.service.ts:covered<br>backend/src/folha-pagamento/import/servidor-import.service.spec.ts:covered                                            |
| pensionista-import    | Importador pensionista  | covered | backend/src/folha-pagamento/import/pensionista-import.service.ts:covered<br>backend/src/folha-pagamento/import/pensionista-import.service.spec.ts:covered                                      |
| retro-processing      | Reintegracao retroativa | covered | backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts:covered<br>tests/backend/reintegracao-retroativa-6m.e2e-spec.ts:covered                                    |
| complementary-payroll | Folha complementar      | covered | tests/backend/folha-complementar-idempotency.e2e-spec.ts:covered                                                                                                                               |
