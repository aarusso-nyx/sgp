# API Surface

Round: 14

## Drift Checks

| Check                     | Status | Notes |
| ------------------------- | ------ | ----- |
| check-api alignment check | ok     | -     |
| check-api operation check | ok     | -     |

## Per-Tag Summary

| Tag                       | Total | Implemented | Excluded |
| ------------------------- | ----- | ----------- | -------- |
| audit                     | 4     | 4           | 0        |
| avaliacao                 | 24    | 24          | 0        |
| consultas                 | 8     | 8           | 0        |
| convenio                  | 4     | 4           | 0        |
| convenio-internships      | 7     | 7           | 0        |
| documents                 | 6     | 6           | 0        |
| external                  | 2     | 2           | 0        |
| folha-pagamento           | 33    | 33          | 0        |
| folha-rubrica             | 9     | 9           | 0        |
| gestao                    | 15    | 15          | 0        |
| health                    | 2     | 2           | 0        |
| notifications             | 7     | 7           | 0        |
| payment                   | 5     | 5           | 0        |
| payment-return-files      | 2     | 2           | 0        |
| payroll-engine            | 3     | 3           | 0        |
| payslips                  | 2     | 2           | 0        |
| ponto-afd                 | 7     | 7           | 0        |
| ponto-assignment          | 2     | 2           | 0        |
| ponto-biometria           | 5     | 5           | 0        |
| ponto-duty-roster         | 6     | 6           | 0        |
| ponto-face                | 9     | 9           | 0        |
| ponto-hour-bank           | 7     | 7           | 0        |
| ponto-justifications      | 4     | 4           | 0        |
| ponto-mobile              | 4     | 4           | 0        |
| ponto-payroll-bridge      | 2     | 2           | 0        |
| ponto-rep-device          | 3     | 3           | 0        |
| ponto-rep-ingestion       | 3     | 3           | 0        |
| ponto-shift-pattern       | 5     | 5           | 0        |
| ponto-time-record         | 2     | 2           | 0        |
| ponto-timesheet-period    | 1     | 1           | 0        |
| ponto-work-schedule       | 2     | 2           | 0        |
| portal                    | 16    | 16          | 0        |
| portal-aso                | 2     | 2           | 0        |
| portal-lgpd               | 1     | 1           | 0        |
| previdenciario            | 35    | 35          | 0        |
| public-banca              | 1     | 1           | 0        |
| public-concursos          | 2     | 2           | 0        |
| public-inscricoes         | 4     | 4           | 0        |
| public-lai                | 2     | 2           | 0        |
| public-lgpd               | 2     | 2           | 0        |
| public-transparency       | 3     | 3           | 0        |
| publico                   | 1     | 1           | 0        |
| recrutamento              | 13    | 13          | 0        |
| recrutamento-avaliacao    | 9     | 9           | 0        |
| recrutamento-banca        | 5     | 5           | 0        |
| recrutamento-biometria    | 4     | 4           | 0        |
| recrutamento-concurso     | 4     | 4           | 0        |
| recrutamento-prova-online | 10    | 10          | 0        |
| relatorio                 | 1     | 1           | 0        |
| report-service            | 4     | 4           | 0        |
| rh                        | 80    | 80          | 0        |
| root                      | 1     | 1           | 0        |
| saude                     | 6     | 6           | 0        |
| saude-aso                 | 8     | 8           | 0        |
| saude-cat                 | 7     | 7           | 0        |
| saude-epi                 | 4     | 4           | 0        |
| saude-exposicoes          | 4     | 4           | 0        |
| saude-ppp                 | 2     | 2           | 0        |
| saude-programas           | 18    | 18          | 0        |
| tce                       | 4     | 4           | 0        |
| tce-audesp-sp             | 5     | 5           | 0        |
| tce-catalog               | 7     | 7           | 0        |
| tce-queue                 | 5     | 5           | 0        |
| users                     | 1     | 1           | 0        |
| yearly-income             | 2     | 2           | 0        |

## Routes

| Method | Path                                                                   | Tag                       | Status      | Controller | Handler | Authority |
| ------ | ---------------------------------------------------------------------- | ------------------------- | ----------- | ---------- | ------- | --------- |
| GET    | /api/v1/auditoria/exportacoes/:job_id                                  | audit                     | implemented | -          | -       | -         |
| GET    | /api/v1/auditoria/logs                                                 | audit                     | implemented | -          | -       | -         |
| GET    | /api/v1/auditoria/logs/:id                                             | audit                     | implemented | -          | -       | -         |
| POST   | /api/v1/auditoria/exportacoes                                          | audit                     | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/career-plan                                          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/career-plan/:id/trilha                               | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/desempenhos                                          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/estagio-probatorio/a-vencer                          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/planos-cargos                                        | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/progression                                          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/progression/eligibility                              | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/progressoes                                          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/salary-history/:salaryRangeLevelId/timeline          | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/avaliacao/simulacoes                                           | avaliacao                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/avaliacao/career-plan/:id                                      | avaliacao                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/avaliacao/desempenhos/:id                                      | avaliacao                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/avaliacao/planos-cargos/:id                                    | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/career-plan                                          | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/ciclos/:periodo/relatorio                            | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/desempenhos                                          | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/desempenhos/:id/ficha                                | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/estagio-probatorio                                   | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/planos-cargos                                        | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/progression/:id/apply                                | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/progression/simulate                                 | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/progressoes                                          | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/salary-history/reajuste-massa                        | avaliacao                 | implemented | -          | -       | -         |
| POST   | /api/v1/avaliacao/simulacoes                                           | avaliacao                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/batimento                                            | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/business-days                                        | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/dashboards                                           | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/ficha-financeira                                     | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/ficha-funcional                                      | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/historico-operacional                                | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/pagamentos-bloqueados                                | consultas                 | implemented | -          | -       | -         |
| GET    | /api/v1/consultas/relatorios-situacao                                  | consultas                 | implemented | -          | -       | -         |
| DELETE | /api/v1/convenios/:id                                                  | convenio                  | implemented | -          | -       | -         |
| GET    | /api/v1/convenios                                                      | convenio                  | implemented | -          | -       | -         |
| PATCH  | /api/v1/convenios/:id                                                  | convenio                  | implemented | -          | -       | -         |
| POST   | /api/v1/convenios                                                      | convenio                  | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/estagios/estagiarios                              | convenio-internships      | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/estagios/programas                                | convenio-internships      | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/estagios/:id/desligar                             | convenio-internships      | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/estagios/:id/esocial/s2300                        | convenio-internships      | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/estagios/:id/prorrogacao                          | convenio-internships      | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/estagios/estagiarios                              | convenio-internships      | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/estagios/programas                                | convenio-internships      | implemented | -          | -       | -         |
| DELETE | /api/v1/arquivos/:id                                                   | documents                 | implemented | -          | -       | -         |
| GET    | /api/v1/arquivos                                                       | documents                 | implemented | -          | -       | -         |
| GET    | /api/v1/arquivos/:id/download                                          | documents                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/arquivos/:anexo_id/confirmar                                   | documents                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/arquivos/:id/confirmar                                         | documents                 | implemented | -          | -       | -         |
| POST   | /api/v1/arquivos/presigned-upload                                      | documents                 | implemented | -          | -       | -         |
| GET    | /api/external/v1/dados                                                 | external                  | implemented | -          | -       | -         |
| GET    | /api/external/v1/dicionario/entidades                                  | external                  | implemented | -          | -       | -         |
| DELETE | /api/v1/folhas/catalogos/:resource/:id                                 | folha-pagamento           | implemented | -          | -       | -         |
| DELETE | /api/v1/folhas/contabilidade/:id                                       | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folha/:id/remessa                                              | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folha/contracheques/:id                                        | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folha/remessa                                                  | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folhas                                                         | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folhas/catalogos                                               | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folhas/catalogos/:resource                                     | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folhas/contabilidade                                           | folha-pagamento           | implemented | -          | -       | -         |
| GET    | /api/v1/folhas/mensal/revisao                                          | folha-pagamento           | implemented | -          | -       | -         |
| PATCH  | /api/v1/folhas/:folha_id/status                                        | folha-pagamento           | implemented | -          | -       | -         |
| PATCH  | /api/v1/folhas/catalogos/:resource/:id                                 | folha-pagamento           | implemented | -          | -       | -         |
| PATCH  | /api/v1/folhas/contabilidade/:id                                       | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folha/:id/remessa                                              | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folha/:id/retorno                                              | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folha/simulacao                                                | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas                                                         | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/adiantamentos                                 | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/calcular                                      | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/importar/lancamento-manual                    | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/importar/pensionista                          | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/importar/servidor                             | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_id/massa                                         | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/:folha_rescisao_id/calcular                             | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/catalogos/:resource                                     | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/contabilidade                                           | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/decimo-terceiro/adiantamento                            | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/decimo-terceiro/fechamento                              | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/mensal/abrir                                            | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/mensal/aprovar                                          | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/mensal/fechar                                           | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/folhas/mensal/gerar                                            | folha-pagamento           | implemented | -          | -       | -         |
| POST   | /api/v1/gfip/gerar                                                     | folha-pagamento           | implemented | -          | -       | -         |
| DELETE | /api/v1/folha/rubrica/:id                                              | folha-rubrica             | implemented | -          | -       | -         |
| GET    | /api/v1/folha/rubrica                                                  | folha-rubrica             | implemented | -          | -       | -         |
| GET    | /api/v1/folha/rubrica/links/job-positions                              | folha-rubrica             | implemented | -          | -       | -         |
| PATCH  | /api/v1/folha/rubrica/:id                                              | folha-rubrica             | implemented | -          | -       | -         |
| POST   | /api/v1/folha/rubrica                                                  | folha-rubrica             | implemented | -          | -       | -         |
| POST   | /api/v1/folha/rubrica/:id/preview                                      | folha-rubrica             | implemented | -          | -       | -         |
| POST   | /api/v1/folha/rubrica/:id/recompile                                    | folha-rubrica             | implemented | -          | -       | -         |
| POST   | /api/v1/folha/rubrica/compile                                          | folha-rubrica             | implemented | -          | -       | -         |
| POST   | /api/v1/folha/rubrica/links/job-positions                              | folha-rubrica             | implemented | -          | -       | -         |
| DELETE | /api/v1/master-data/:resource/:id                                      | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/cargos                                                         | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/gestao/cargos                                                  | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/gestao/cargos/:id/tabela-salarial                              | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/gestao/faixas-salariais                                        | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/gestao/faixas-salariais/:salaryRangeId/niveis                  | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/master-data                                                    | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/master-data/:resource                                          | gestao                    | implemented | -          | -       | -         |
| PATCH  | /api/v1/gestao/cargos/:id                                              | gestao                    | implemented | -          | -       | -         |
| PATCH  | /api/v1/master-data/:resource/:id                                      | gestao                    | implemented | -          | -       | -         |
| POST   | /api/v1/cargos                                                         | gestao                    | implemented | -          | -       | -         |
| POST   | /api/v1/gestao/cargos                                                  | gestao                    | implemented | -          | -       | -         |
| POST   | /api/v1/gestao/faixas-salariais                                        | gestao                    | implemented | -          | -       | -         |
| POST   | /api/v1/gestao/faixas-salariais/:salaryRangeId/niveis                  | gestao                    | implemented | -          | -       | -         |
| POST   | /api/v1/master-data/:resource                                          | gestao                    | implemented | -          | -       | -         |
| GET    | /api/v1/health                                                         | health                    | implemented | -          | -       | -         |
| GET    | /api/v1/health/ready                                                   | health                    | implemented | -          | -       | -         |
| GET    | /api/v1/notificacoes                                                   | notifications             | implemented | -          | -       | -         |
| GET    | /api/v1/notificacoes/stream                                            | notifications             | implemented | -          | -       | -         |
| GET    | /api/v1/notificacoes/unread-count                                      | notifications             | implemented | -          | -       | -         |
| GET    | /api/v1/usuarios/me/preferencias-notificacao                           | notifications             | implemented | -          | -       | -         |
| PATCH  | /api/v1/notificacoes/:id                                               | notifications             | implemented | -          | -       | -         |
| PATCH  | /api/v1/notificacoes/marcar-todas-lidas                                | notifications             | implemented | -          | -       | -         |
| PUT    | /api/v1/usuarios/me/preferencias-notificacao                           | notifications             | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:id/consignment-loans                                | payment                   | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:id/consignment-margin                               | payment                   | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:id/consignment-loans                                | payment                   | implemented | -          | -       | -         |
| POST   | /api/v1/payment/consignment-portability                                | payment                   | implemented | -          | -       | -         |
| POST   | /api/v1/payment/consignment-portability/:id/process                    | payment                   | implemented | -          | -       | -         |
| POST   | /api/v1/payment/return-files                                           | payment-return-files      | implemented | -          | -       | -         |
| POST   | /api/v1/payment/return-files/:id/reprocess-rejected                    | payment-return-files      | implemented | -          | -       | -         |
| GET    | /api/v1/payroll-engine/health                                          | payroll-engine            | implemented | -          | -       | -         |
| GET    | /api/v1/payroll-engine/status                                          | payroll-engine            | implemented | -          | -       | -         |
| POST   | /api/v1/payroll-engine/calculations                                    | payroll-engine            | implemented | -          | -       | -         |
| GET    | /api/v1/portal/payslips                                                | payslips                  | implemented | -          | -       | -         |
| GET    | /api/v1/portal/payslips/:id/pdf                                        | payslips                  | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/afd/exports                                              | ponto-afd                 | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/afd/exports/:afdExportId/download                        | ponto-afd                 | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/afd/imports                                              | ponto-afd                 | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/afd/acjef                                                | ponto-afd                 | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/afd/afdt                                                 | ponto-afd                 | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/afd/exports                                              | ponto-afd                 | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/afd/imports                                              | ponto-afd                 | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/atribuicoes                                              | ponto-assignment          | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/atribuicoes                                              | ponto-assignment          | implemented | -          | -       | -         |
| DELETE | /api/v1/ponto/biometria/employees/:employeeId/consent                  | ponto-biometria           | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/biometria/templates                                      | ponto-biometria           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/biometria/consents                                       | ponto-biometria           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/biometria/matches                                        | ponto-biometria           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/biometria/templates                                      | ponto-biometria           | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/escalas/proximas                                         | ponto-duty-roster         | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/escalas/rosters                                          | ponto-duty-roster         | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/escalas/rosters/projetar                                 | ponto-duty-roster         | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/escalas/rosters                                          | ponto-duty-roster         | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/escalas/rosters/:dutyRosterId/publicar                   | ponto-duty-roster         | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/escalas/rosters/:dutyRosterId/travar                     | ponto-duty-roster         | implemented | -          | -       | -         |
| DELETE | /api/v1/ponto/face/employees/:employeeId/consent                       | ponto-face                | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/face/employees/:employeeId/status                        | ponto-face                | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/face/templates                                           | ponto-face                | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/face/threshold                                           | ponto-face                | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/face/clock                                               | ponto-face                | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/face/consents                                            | ponto-face                | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/face/matches                                             | ponto-face                | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/face/templates                                           | ponto-face                | implemented | -          | -       | -         |
| PUT    | /api/v1/ponto/face/threshold                                           | ponto-face                | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/banco-horas                                              | ponto-hour-bank           | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/banco-horas/:hourBankId/movimentos                       | ponto-hour-bank           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/banco-horas                                              | ponto-hour-bank           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/banco-horas/acumular-dia                                 | ponto-hour-bank           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/banco-horas/ajuste-manual                                | ponto-hour-bank           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/banco-horas/compensar                                    | ponto-hour-bank           | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/banco-horas/zerar-vencidos                               | ponto-hour-bank           | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/justifications                                           | ponto-justifications      | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/justifications                                           | ponto-justifications      | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/justifications/:id/cancel                                | ponto-justifications      | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/justifications/:id/decide                                | ponto-justifications      | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/mobile/clock                                             | ponto-mobile              | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/mobile/consents                                          | ponto-mobile              | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/mobile/devices                                           | ponto-mobile              | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/mobile/geofences                                         | ponto-mobile              | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/folha/apply                                              | ponto-payroll-bridge      | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/folha/preview                                            | ponto-payroll-bridge      | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/rep                                                      | ponto-rep-device          | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/rep/:repDeviceId                                         | ponto-rep-device          | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/rep                                                      | ponto-rep-device          | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/rep/batches                                              | ponto-rep-ingestion       | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/rep/batches/:batchId/original                            | ponto-rep-ingestion       | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/rep/:repDeviceId/batches                                 | ponto-rep-ingestion       | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/escalas/atribuicoes                                      | ponto-shift-pattern       | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/escalas/padroes                                          | ponto-shift-pattern       | implemented | -          | -       | -         |
| PATCH  | /api/v1/ponto/escalas/atribuicoes/:shiftAssignmentId                   | ponto-shift-pattern       | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/escalas/atribuicoes                                      | ponto-shift-pattern       | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/escalas/padroes                                          | ponto-shift-pattern       | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/marcacoes/:employeeId                                    | ponto-time-record         | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/marcacoes                                                | ponto-time-record         | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/periodos                                                 | ponto-timesheet-period    | implemented | -          | -       | -         |
| GET    | /api/v1/ponto/jornadas                                                 | ponto-work-schedule       | implemented | -          | -       | -         |
| POST   | /api/v1/ponto/jornadas                                                 | ponto-work-schedule       | implemented | -          | -       | -         |
| GET    | /api/v1/portal/contracheque/:competence                                | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/contracheques/ferias                                    | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/documentos/solicitacoes                                 | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/cadastro                                     | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/cargo                                        | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/contato                                      | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/dependentes                                  | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/documentos                                   | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/meus-dados/endereco                                     | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/minha-carreira                                          | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/minha-equipe/aprovacoes                                 | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/termos-rescisao                                         | portal                    | implemented | -          | -       | -         |
| POST   | /api/v1/portal/documentos/solicitacoes                                 | portal                    | implemented | -          | -       | -         |
| POST   | /api/v1/portal/minha-equipe/aprovacoes/:kind/:id/aprovar               | portal                    | implemented | -          | -       | -         |
| POST   | /api/v1/portal/minha-equipe/aprovacoes/:kind/:id/cancelar              | portal                    | implemented | -          | -       | -         |
| PUT    | /api/v1/portal/meus-dados/:section                                     | portal                    | implemented | -          | -       | -         |
| GET    | /api/v1/portal/aso                                                     | portal-aso                | implemented | -          | -       | -         |
| GET    | /api/v1/portal/aso/proximo                                             | portal-aso                | implemented | -          | -       | -         |
| POST   | /api/portal/v1/lgpd/direitos                                           | portal-lgpd               | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/aposentadorias                                  | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/certidoes-tempo                                 | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/compensacoes                                    | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/declaracoes                                     | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/pensoes                                         | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/recadastramentos/beneficiarios                  | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/recadastramentos/campanhas                      | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/recadastramentos/historico                      | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/recadastramentos/pendencias                     | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/regras                                          | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/previdenciario/simulacoes                                      | previdenciario            | implemented | -          | -       | -         |
| PATCH  | /api/v1/previdenciario/compensacoes/:id                                | previdenciario            | implemented | -          | -       | -         |
| PATCH  | /api/v1/previdenciario/regras/:id                                      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/aposentadorias                                  | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/certidoes-tempo                                 | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/certidoes-tempo/:id/emitir                      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/compensacoes                                    | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/declaracoes                                     | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/declaracoes/:id/emitir                          | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/pensoes                                         | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/provas-vida                                     | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/atos                           | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/beneficiarios                  | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/campanhas                      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/convocacoes                    | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/historico                      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/recadastramentos/relatorios                     | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/regras                                          | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes                                      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes/ec103/atividade-risco-professor      | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes/ec103/idade-progressiva              | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes/ec103/pedagio-100                    | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes/ec103/pedagio-50                     | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/simulacoes/ec103/pontos                         | previdenciario            | implemented | -          | -       | -         |
| POST   | /api/v1/previdenciario/transferencia-siprev/exportar                   | previdenciario            | implemented | -          | -       | -         |
| GET    | /api/v1/publico/banca/verify/:token                                    | public-banca              | implemented | -          | -       | -         |
| GET    | /api/v1/publico/concursos/:slug                                        | public-concursos          | implemented | -          | -       | -         |
| GET    | /api/v1/publico/concursos/:slug/classificacao                          | public-concursos          | implemented | -          | -       | -         |
| GET    | /api/v1/publico/inscricoes/:id                                         | public-inscricoes         | implemented | -          | -       | -         |
| GET    | /api/v1/publico/inscricoes/:id/notas                                   | public-inscricoes         | implemented | -          | -       | -         |
| POST   | /api/v1/publico/concursos/:slug/inscricoes                             | public-inscricoes         | implemented | -          | -       | -         |
| POST   | /api/v1/publico/inscricoes/:id/recursos                                | public-inscricoes         | implemented | -          | -       | -         |
| GET    | /api/v1/public/lai/:tenantId/requests/:protocol/status                 | public-lai                | implemented | -          | -       | -         |
| POST   | /api/v1/public/lai/:tenantId/requests                                  | public-lai                | implemented | -          | -       | -         |
| GET    | /api/v1/public/lgpd/encarregado                                        | public-lgpd               | implemented | -          | -       | -         |
| GET    | /api/v1/public/lgpd/transferencias-internacionais                      | public-lgpd               | implemented | -          | -       | -         |
| GET    | /api/v1/public/transparency/:tenantId/payroll                          | public-transparency       | implemented | -          | -       | -         |
| GET    | /api/v1/public/transparency/:tenantId/payroll.csv                      | public-transparency       | implemented | -          | -       | -         |
| POST   | /api/v1/public/transparency/:tenantId/publish                          | public-transparency       | implemented | -          | -       | -         |
| GET    | /api/publico/v1/:tenant/transparencia/folha                            | publico                   | implemented | -          | -       | -         |
| DELETE | /api/v1/recrutamento/banco-talentos/:id                                | recrutamento              | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/banco-talentos                                    | recrutamento              | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/banco-talentos/:id                                | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/banco-talentos/:id                                | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/candidatos/:candidato_id                          | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/candidatos/:candidato_id_2                        | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/candidatos/:candidato_id_3                        | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/requisicoes/:requisicao_id/concluir               | recrutamento              | implemented | -          | -       | -         |
| PATCH  | /api/v1/recrutamento/requisicoes/:requisicao_id/encaminhar             | recrutamento              | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/banco-talentos                                    | recrutamento              | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/requisicoes                                       | recrutamento              | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/requisicoes/:id/candidatos                        | recrutamento              | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/requisicoes/:requisicao_id/candidatos             | recrutamento              | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/avaliacao/notas/inscricoes/:inscricaoId           | recrutamento-avaliacao    | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/avaliacao/provas/:provaId/gabaritos               | recrutamento-avaliacao    | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/avaliacao/provas/concursos/:concursoId            | recrutamento-avaliacao    | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/avaliacao/recursos/provas/:provaId                | recrutamento-avaliacao    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/avaliacao/provas                                  | recrutamento-avaliacao    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/avaliacao/provas/:provaId/gabaritos               | recrutamento-avaliacao    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/avaliacao/provas/:provaId/questoes                | recrutamento-avaliacao    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/avaliacao/provas/:provaId/respostas               | recrutamento-avaliacao    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/avaliacao/recursos/:id/decisao                    | recrutamento-avaliacao    | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/banca/concursos/:concursoId/membros               | recrutamento-banca        | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/banca/documentos                                  | recrutamento-banca        | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/banca/documentos/:id/publicacao                   | recrutamento-banca        | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/banca/documentos/:id/signatures                   | recrutamento-banca        | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/banca/membros                                     | recrutamento-banca        | implemented | -          | -       | -         |
| DELETE | /api/v1/recrutamento/biometria/candidatos/:candidatoId                 | recrutamento-biometria    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/biometria/capturas                                | recrutamento-biometria    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/biometria/consentimentos                          | recrutamento-biometria    | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/biometria/matching                                | recrutamento-biometria    | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/concursos                                         | recrutamento-concurso     | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/concursos                                         | recrutamento-concurso     | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/concursos/:id/editais                             | recrutamento-concurso     | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/concursos/:id/editais/publish                     | recrutamento-concurso     | implemented | -          | -       | -         |
| DELETE | /api/v1/recrutamento/prova-online/sessions/:id/artifacts               | recrutamento-prova-online | implemented | -          | -       | -         |
| GET    | /api/v1/recrutamento/prova-online/review/sessions/:id                  | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/review/sessions/:id/accept           | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/review/sessions/:id/void             | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions                             | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions/:id/ai/audio                | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions/:id/ai/frame                | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions/:id/artifacts               | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions/:id/events                  | recrutamento-prova-online | implemented | -          | -       | -         |
| POST   | /api/v1/recrutamento/prova-online/sessions/:id/submit                  | recrutamento-prova-online | implemented | -          | -       | -         |
| GET    | /api/v1/relatorios                                                     | relatorio                 | implemented | -          | -       | -         |
| GET    | /api/v1/report-service/health                                          | report-service            | implemented | -          | -       | -         |
| GET    | /api/v1/report-service/status                                          | report-service            | implemented | -          | -       | -         |
| POST   | /api/v1/report-service/poll                                            | report-service            | implemented | -          | -       | -         |
| POST   | /api/v1/report-service/requests                                        | report-service            | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:employeeId/rh-workflows/contribuicoes-sindicais/:id | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:employeeId/rh-workflows/dependentes-beneficio/:id   | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:employeeId/rh-workflows/exercicios/:id              | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:employeeId/rh-workflows/pensoes-alimenticias/:id    | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:employeeId/rh-workflows/vales-transporte/:id        | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/employees/:id/alimonies/:alimonyId                             | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/rh/afastamentos/:id                                            | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/rh/organic-definitions/:id                                     | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/rh/processos-funcao/:id                                        | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/rh/processos/:id                                               | rh                        | implemented | -          | -       | -         |
| DELETE | /api/v1/rh/professional-experiences/:id                                | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:employeeId/rh-workflows/contribuicoes-sindicais     | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:employeeId/rh-workflows/dependentes-beneficio       | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:employeeId/rh-workflows/exercicios                  | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:employeeId/rh-workflows/pensoes-alimenticias        | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:employeeId/rh-workflows/vales-transporte            | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:id/alimonies                                        | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/employees/:id/bank-accounts                                    | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/ferias/saldo/:employee_id                                      | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios                                                   | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:employeeId/licenca-premio/balance                | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:id                                               | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:id/abono-permanencia                             | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:id/dossie                                        | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:id/historico                                     | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/funcionarios/:id/tempo-servico                                 | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/licencas/:employee_id                                          | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/licencas/saude/:employee_id                                    | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/pericia/prontuarios/:id/laudo/pdf                              | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/recadastramento/:recadastramento_id/comprovante                | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/afastamentos                                                | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/employee-transfer                                           | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/employee-transfer/employee/:employeeId                      | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/organic-definitions                                         | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/processos                                                   | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/processos-funcao                                            | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1/rh/professional-experiences                                    | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:employeeId/rh-workflows/contribuicoes-sindicais/:id | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:employeeId/rh-workflows/dependentes-beneficio/:id   | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:employeeId/rh-workflows/exercicios/:id              | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:employeeId/rh-workflows/pensoes-alimenticias/:id    | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:employeeId/rh-workflows/vales-transporte/:id        | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/employees/:id/alimonies/:alimonyId                             | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/rh/afastamentos/:id                                            | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/rh/organic-definitions/:id                                     | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/rh/processos-funcao/:id                                        | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/rh/processos/:id                                               | rh                        | implemented | -          | -       | -         |
| PATCH  | /api/v1/rh/professional-experiences/:id                                | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:employeeId/rh-workflows/contribuicoes-sindicais     | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:employeeId/rh-workflows/dependentes-beneficio       | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:employeeId/rh-workflows/exercicios                  | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:employeeId/rh-workflows/pensoes-alimenticias        | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:employeeId/rh-workflows/vales-transporte            | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:id/alimonies                                        | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:id/bank-accounts                                    | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/employees/:id/bank-accounts/:accountId/revalidate              | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/ferias/programacao                                             | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/ferias/programacao/:id/aprovar                                 | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/ferias/programacao/:id/cancelar                                | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios                                                   | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/:func_rescisao/desligamento                       | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/:id/abono-permanencia                             | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/:id/desligamento                                  | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/:id/tempo-servico                                 | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/:id/vinculos                                      | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/cadastral-changes/:id/approve                     | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/funcionarios/cadastral-changes/:id/reject                      | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/licencas                                                       | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/licencas/:id/aprovar                                           | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/licencas/:id/cancelar                                          | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/licencas/saude/agendamento                                     | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/afastamentos                                                | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/employee-transfer                                           | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/employee-transfer/:id/aprovar                               | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/employee-transfer/:id/cancelar                              | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/employee-transfer/:id/efetivar                              | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/organic-definitions                                         | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/processos                                                   | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/processos-funcao                                            | rh                        | implemented | -          | -       | -         |
| POST   | /api/v1/rh/professional-experiences                                    | rh                        | implemented | -          | -       | -         |
| GET    | /api/v1                                                                | root                      | implemented | -          | -       | -         |
| PATCH  | /api/v1/pericia/agendamentos/:agendamento_id                           | saude                     | implemented | -          | -       | -         |
| PATCH  | /api/v1/pericia/prontuarios/:prontuario_id/validar                     | saude                     | implemented | -          | -       | -         |
| POST   | /api/v1/pericia/agendamentos                                           | saude                     | implemented | -          | -       | -         |
| POST   | /api/v1/pericia/agendamentos/:agendamento_id/parecer                   | saude                     | implemented | -          | -       | -         |
| POST   | /api/v1/pericia/prontuarios                                            | saude                     | implemented | -          | -       | -         |
| POST   | /api/v1/pericia/prontuarios/:prontuario_id/replicar                    | saude                     | implemented | -          | -       | -         |
| GET    | /api/v1/saude/aso                                                      | saude-aso                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/aso/painel/vencimentos                                   | saude-aso                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/exames                                                   | saude-aso                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/aso/:id/arquivar                                         | saude-aso                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/aso/:id/realizacao                                       | saude-aso                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/aso                                                      | saude-aso                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/aso/:id/anexos                                           | saude-aso                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/exames                                                   | saude-aso                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/acidentes                                                | saude-cat                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/acidentes/prazos                                         | saude-cat                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/acidentes/:id/comunicar-obito                            | saude-cat                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/acidentes/:id/encerrar                                   | saude-cat                 | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/acidentes/:id/reabrir                                    | saude-cat                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/acidentes                                                | saude-cat                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/acidentes/:id/cat                                        | saude-cat                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/epi/entregas                                             | saude-epi                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/epi/inventario                                           | saude-epi                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/epi/entregas                                             | saude-epi                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/epi/inventario                                           | saude-epi                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/exposicoes                                               | saude-exposicoes          | implemented | -          | -       | -         |
| GET    | /api/v1/saude/exposicoes/folha                                         | saude-exposicoes          | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/exposicoes/:id                                           | saude-exposicoes          | implemented | -          | -       | -         |
| POST   | /api/v1/saude/exposicoes                                               | saude-exposicoes          | implemented | -          | -       | -         |
| GET    | /api/v1/saude/ppp                                                      | saude-ppp                 | implemented | -          | -       | -         |
| POST   | /api/v1/saude/ppp/gerar                                                | saude-ppp                 | implemented | -          | -       | -         |
| GET    | /api/v1/saude/programas/cipa/comissoes                                 | saude-programas           | implemented | -          | -       | -         |
| GET    | /api/v1/saude/programas/pcmat                                          | saude-programas           | implemented | -          | -       | -         |
| GET    | /api/v1/saude/programas/pcmso                                          | saude-programas           | implemented | -          | -       | -         |
| GET    | /api/v1/saude/programas/pgr                                            | saude-programas           | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/programas/cipa/comissoes/:id/ativar                      | saude-programas           | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/programas/pcmat/:id/ativar                               | saude-programas           | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/programas/pcmso/:id/ativar                               | saude-programas           | implemented | -          | -       | -         |
| PATCH  | /api/v1/saude/programas/pgr/:id/ativar                                 | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/cipa/comissoes                                 | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/cipa/comissoes/:id/atas                        | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/cipa/comissoes/:id/membros                     | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pcmat                                          | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pcmat/:id/revisoes                             | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pcmso                                          | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pcmso/:id/exames                               | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pcmso/:id/revisoes                             | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pgr                                            | saude-programas           | implemented | -          | -       | -         |
| POST   | /api/v1/saude/programas/pgr/:id/revisoes                               | saude-programas           | implemented | -          | -       | -         |
| GET    | /api/v1/tce/adapters                                                   | tce                       | implemented | -          | -       | -         |
| GET    | /api/v1/tce/adapters/:id/events                                        | tce                       | implemented | -          | -       | -         |
| POST   | /api/v1/tce/adapters/:id/disable                                       | tce                       | implemented | -          | -       | -         |
| POST   | /api/v1/tce/adapters/:id/enable                                        | tce                       | implemented | -          | -       | -         |
| GET    | /api/v1/tce/audesp-sp/submissions                                      | tce-audesp-sp             | implemented | -          | -       | -         |
| GET    | /api/v1/tce/audesp-sp/submissions/:id/envelope.xml                     | tce-audesp-sp             | implemented | -          | -       | -         |
| POST   | /api/v1/tce/audesp-sp/submissions                                      | tce-audesp-sp             | implemented | -          | -       | -         |
| POST   | /api/v1/tce/audesp-sp/submissions/:id/submit                           | tce-audesp-sp             | implemented | -          | -       | -         |
| POST   | /api/v1/tce/audesp-sp/submissions/:id/validate                         | tce-audesp-sp             | implemented | -          | -       | -         |
| DELETE | /api/v1/tce/layout-fields/:id                                          | tce-catalog               | implemented | -          | -       | -         |
| GET    | /api/v1/tce/layouts/:id/fields                                         | tce-catalog               | implemented | -          | -       | -         |
| GET    | /api/v1/tce/states                                                     | tce-catalog               | implemented | -          | -       | -         |
| GET    | /api/v1/tce/states/:code/layouts                                       | tce-catalog               | implemented | -          | -       | -         |
| PATCH  | /api/v1/tce/layouts/:id/status                                         | tce-catalog               | implemented | -          | -       | -         |
| POST   | /api/v1/tce/layout-fields                                              | tce-catalog               | implemented | -          | -       | -         |
| POST   | /api/v1/tce/layouts                                                    | tce-catalog               | implemented | -          | -       | -         |
| GET    | /api/v1/tce/circuits                                                   | tce-queue                 | implemented | -          | -       | -         |
| GET    | /api/v1/tce/queue                                                      | tce-queue                 | implemented | -          | -       | -         |
| GET    | /api/v1/tce/queue/:id                                                  | tce-queue                 | implemented | -          | -       | -         |
| POST   | /api/v1/tce/circuits/:adapter_id/:endpoint/reset                       | tce-queue                 | implemented | -          | -       | -         |
| POST   | /api/v1/tce/queue/:id/replay                                           | tce-queue                 | implemented | -          | -       | -         |
| POST   | /api/v1/convites/:token/aceitar                                        | users                     | implemented | -          | -       | -         |
| GET    | /api/v1/portal/yearly-income                                           | yearly-income             | implemented | -          | -       | -         |
| GET    | /api/v1/portal/yearly-income/:year/pdf                                 | yearly-income             | implemented | -          | -       | -         |
