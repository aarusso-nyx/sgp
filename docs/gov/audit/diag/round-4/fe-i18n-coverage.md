# Frontend i18n Coverage Baseline

Round: 4
Checked files: 268
Feature roots with findings: 14
Hard-coded string candidates: 251

## Findings By Feature

| Feature          | Findings |
| ---------------- | -------- |
| rh               | 75       |
| ponto            | 46       |
| folha-pagamento  | 31       |
| esocial          | 18       |
| gestao           | 15       |
| avaliacao        | 13       |
| portal-empregado | 13       |
| admin-feature    | 10       |
| saude            | 10       |
| portal           | 9        |
| tce              | 4        |
| fiscal           | 3        |
| security         | 3        |
| publico          | 1        |

## Findings By Kind

| Kind                  | Findings |
| --------------------- | -------- |
| typescript-ui-literal | 251      |

## Top Files

| File                                                                                         | Findings |
| -------------------------------------------------------------------------------------------- | -------- |
| frontend/src/app/features/rh/pages/rh-home/rh-home.ts                                        | 31       |
| frontend/src/app/features/folha-pagamento/rubricas/rubricas.ts                               | 11       |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts       | 10       |
| frontend/src/app/features/gestao/pages/gestao-home/gestao-home.ts                            | 10       |
| frontend/src/app/features/ponto/escalas/ponto-escalas.ts                                     | 9        |
| frontend/src/app/features/portal-empregado/ponto-mobile/ponto-mobile.ts                      | 8        |
| frontend/src/app/features/folha-pagamento/processamentos/rescisao/rescisao.ts                | 7        |
| frontend/src/app/features/ponto/afd/ponto-afd.ts                                             | 6        |
| frontend/src/app/features/ponto/face-admin/face-admin.ts                                     | 6        |
| frontend/src/app/features/ponto/jornadas/ponto-jornadas.ts                                   | 6        |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                             | 5        |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                               | 5        |
| frontend/src/app/features/ponto/rep/ponto-rep.ts                                             | 5        |
| frontend/src/app/features/rh/cadastral-changes/cadastral-changes.ts                          | 5        |
| frontend/src/app/features/rh/employees/alimony/alimony.ts                                    | 5        |
| frontend/src/app/features/rh/funcionarios/funcionarios.ts                                    | 5        |
| frontend/src/app/features/saude/pericia/pericia.ts                                           | 5        |
| frontend/src/app/features/folha-pagamento/pages/folha-pagamento-home/folha-pagamento-home.ts | 4        |
| frontend/src/app/features/ponto/banco-horas/ponto-banco-horas.ts                             | 4        |
| frontend/src/app/features/ponto/biometria/ponto-biometria.ts                                 | 4        |

## Sample Findings

| File                                                                                           | Line | Kind                  | Text                                            |
| ---------------------------------------------------------------------------------------------- | ---- | --------------------- | ----------------------------------------------- |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 119  | typescript-ui-literal | Código                                          |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 122  | typescript-ui-literal | Responsável                                     |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 123  | typescript-ui-literal | Atualização                                     |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 131  | typescript-ui-literal | Editar registro                                 |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 137  | typescript-ui-literal | Ver detalhes                                    |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 145  | typescript-ui-literal | Código, registro ou responsável                 |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 153  | typescript-ui-literal | Em revisão                                      |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 153  | typescript-ui-literal | Em revisão                                      |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 309  | typescript-ui-literal | ${feature.label} - revisão                      |
| frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts         | 318  | typescript-ui-literal | ${feature.label} - pendência                    |
| frontend/src/app/features/avaliacao/estagio-probatorio/estagio-probatorio.ts                   | 74   | typescript-ui-literal | Nao foi possivel carregar o estagio probatorio. |
| frontend/src/app/features/avaliacao/estagio-probatorio/estagio-probatorio.ts                   | 100  | typescript-ui-literal | Avaliacao registrada.                           |
| frontend/src/app/features/avaliacao/estagio-probatorio/estagio-probatorio.ts                   | 105  | typescript-ui-literal | Nao foi possivel registrar a avaliacao.         |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                               | 82   | typescript-ui-literal | Nao foi possivel carregar os PCCS.              |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                               | 125  | typescript-ui-literal | PCCS salvo.                                     |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                               | 129  | typescript-ui-literal | Nao foi possivel salvar o PCCS.                 |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                               | 155  | typescript-ui-literal | Reajuste aplicado.                              |
| frontend/src/app/features/avaliacao/pccs/pccs.ts                                               | 159  | typescript-ui-literal | Nao foi possivel aplicar o reajuste.            |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                                 | 82   | typescript-ui-literal | Nao foi possivel carregar as progressoes.       |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                                 | 109  | typescript-ui-literal | Simulacao registrada.                           |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                                 | 113  | typescript-ui-literal | Nao foi possivel simular a progressao.          |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                                 | 129  | typescript-ui-literal | Progressao aplicada.                            |
| frontend/src/app/features/avaliacao/progressoes/progressoes.ts                                 | 133  | typescript-ui-literal | Nao foi possivel aplicar a progressao.          |
| frontend/src/app/features/esocial/certificados/esocial-certificados.ts                         | 42   | typescript-ui-literal | Nao foi possivel carregar os certificados.      |
| frontend/src/app/features/esocial/certificados/esocial-certificados.ts                         | 78   | typescript-ui-literal | Informe alias, tipo e arquivo PKCS#12.          |
| frontend/src/app/features/esocial/certificados/esocial-certificados.ts                         | 100  | typescript-ui-literal | Nao foi possivel salvar o certificado.          |
| frontend/src/app/features/esocial/exclusao/esocial-exclusao.ts                                 | 48   | typescript-ui-literal | Nao foi possivel carregar eventos elegiveis.    |
| frontend/src/app/features/esocial/exclusao/esocial-exclusao.ts                                 | 74   | typescript-ui-literal | Nao foi possivel solicitar a exclusao S-3000.   |
| frontend/src/app/features/esocial/fechamento/esocial-fechamento.ts                             | 44   | typescript-ui-literal | Nao foi possivel carregar o fechamento.         |
| frontend/src/app/features/esocial/fechamento/esocial-fechamento.ts                             | 59   | typescript-ui-literal | Nao foi possivel fechar a competencia.          |
| frontend/src/app/features/esocial/folha-periodica/esocial-folha-periodica.ts                   | 43   | typescript-ui-literal | Nao foi possivel carregar a folha periodica.    |
| frontend/src/app/features/esocial/folha-periodica/esocial-folha-periodica.ts                   | 73   | typescript-ui-literal | Nao foi possivel emitir a folha periodica.      |
| frontend/src/app/features/esocial/retornos/esocial-retornos.ts                                 | 44   | typescript-ui-literal | Nao foi possivel carregar os retornos.          |
| frontend/src/app/features/esocial/retornos/esocial-retornos.ts                                 | 61   | typescript-ui-literal | Nao foi possivel forcar o retry.                |
| frontend/src/app/features/esocial/retornos/esocial-retornos.ts                                 | 74   | typescript-ui-literal | Nao foi possivel marcar como tratado.           |
| frontend/src/app/features/esocial/submissao/esocial-submissao.ts                               | 44   | typescript-ui-literal | Nao foi possivel carregar as submissoes.        |
| frontend/src/app/features/esocial/submissao/esocial-submissao.ts                               | 57   | typescript-ui-literal | Nao foi possivel forcar o retry.                |
| frontend/src/app/features/esocial/tabelas/esocial-tabelas.ts                                   | 41   | typescript-ui-literal | Nao foi possivel carregar as tabelas iniciais.  |
| frontend/src/app/features/esocial/tabelas/esocial-tabelas.ts                                   | 70   | typescript-ui-literal | Nao foi possivel emitir os deltas S-1xxx.       |
| frontend/src/app/features/esocial/trabalhadores/esocial-trabalhadores.ts                       | 46   | typescript-ui-literal | Nao foi possivel carregar o cadastro eSocial.   |
| frontend/src/app/features/esocial/trabalhadores/esocial-trabalhadores.ts                       | 87   | typescript-ui-literal | Nao foi possivel emitir o evento eSocial.       |
| frontend/src/app/features/fiscal/dctfweb/dctfweb.ts                                            | 139  | typescript-ui-literal | Operacao DCTFWeb indisponivel.                  |
| frontend/src/app/features/fiscal/dirf/dirf.ts                                                  | 126  | typescript-ui-literal | Operacao DIRF indisponivel.                     |
| frontend/src/app/features/fiscal/gps-residual/gps-residual.ts                                  | 131  | typescript-ui-literal | Operacao GPS indisponivel.                      |
| frontend/src/app/features/folha-pagamento/competencia/folha-mensal.ts                          | 54   | typescript-ui-literal | Nao foi possivel processar a competencia.       |
| frontend/src/app/features/folha-pagamento/comprovantes-rendimentos/comprovantes-rendimentos.ts | 59   | typescript-ui-literal | Nao foi possivel gerar os comprovantes.         |
| frontend/src/app/features/folha-pagamento/fgts-remessas/fgts-remessas.ts                       | 41   | typescript-ui-literal | Nao foi possivel gerar a GRF.                   |
| frontend/src/app/features/folha-pagamento/fgts-remessas/fgts-remessas.ts                       | 57   | typescript-ui-literal | Nao foi possivel gerar a GRRF.                  |
| frontend/src/app/features/folha-pagamento/fgts-remessas/fgts-remessas.ts                       | 71   | typescript-ui-literal | Nao foi possivel carregar a remessa.            |
| frontend/src/app/features/folha-pagamento/fgts/fgts.ts                                         | 41   | typescript-ui-literal | Nao foi possivel carregar o FGTS.               |

## Exceptions

- Spec files are excluded.
- mat-icon/code/pre/script/style text is excluded.
- TypeScript findings are limited to literal strings in likely UI metadata contexts.
- Dynamic backend/business messages are reported only when they appear in frontend UI metadata.
