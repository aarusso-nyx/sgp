# Backend API Call Catalog

Generated at: 2026-04-16T21:51:45.042Z
Origin: https://sgp.detran.am.gov.br
Routes crawled: 71
Unique API method+path entries: 20
Inferred mutating API method+path entries: 0

## Calls
| Method | Path | Statuses | Hits | Query Keys | Auth/Token Inference | Payload Keys |
|---|---|---|---:|---|---|---|
| GET | /detran-am/api/competencia/anos | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/contadorNotificacao/ | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaEmpresasFiliais | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaEmpresasNaoMatrizesAtivas | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaEnums | 401 | 1 | nomeEnum | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaFiliais | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaSiglaEmpresaFilial | 401 | 3 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaSituacoesFuncionais/entraFolha/true | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaSituacoesFuncionaisDto | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/listaVinculos | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/menus/papeis/gestao | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/notificacoes | 401 | 1 | page, size | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/parametroSistema/publico | 200 | 2 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/programas/listProgramasDto | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/publico/anexo/downloadFile/105_imagemSistema_brasao_detran1.png | 200 | 1 |  |  |  |
| GET | /detran-am/api/publico/anexo/downloadFile/330_imagemSistema_DETRAN_HOR_2COR2.png | 200 | 3 |  | Cookie |  |
| GET | /detran-am/api/relatorioServidorPagBloqueado/empresa/filial/search | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/relatorioServidorPagBloqueado/situacao/funcional/search | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/situacoesFuncionais | 401 | 1 |  | Authorization(Other) / Cookie / token-headers:authorization |  |
| GET | /detran-am/api/usuario/verificaPermissao | 401 | 165 | role | Authorization(Other) / Cookie / token-headers:authorization |  |

## Inferred Mutating Calls (Safe Probe, Aborted)
| Method | Path | Probe Hits | Called From Routes | Inferred From Actions | Payload Keys |
|---|---|---:|---|---|---|
| (none) |  | 0 |  |  |  |

## Mutating Action Candidates (Heuristic)
| Route | Label | ng-click | Form | Host Component | Inferred Method | Path Hint | Confidence |
|---|---|---|---|---|---|---|---|
| #!/parametroSistema/gestao | Salvar | save() |  | parametroSistemaCtrl | POST | /detran-am/api/parametroSistema/publico | low |
| #!/perfil | Salvar | save() |  | parametroSistemaCtrl | POST | /detran-am/api/perfil | low |
| #!/perfilAcesso/formulario | Alterar minha senha | alterarSenha() |  | profileCtrl | PUT | /detran-am/api/perfilAcesso | high |

## Prefill Evidence (Safe Probe)
| Route | Action | Form | Seeded Controls |
|---|---|---|---:|
| (none) |  |  | 0 |

## Notes
- Header/payload values are redacted where sensitive.
- Inference is based on observed request metadata during automated route traversal.
- Mutating call probes abort POST/PUT/PATCH/DELETE requests to avoid side effects.
- Safe probe mode pre-fills visible required fields with dummy values to trigger submit flows.
- Full machine-readable details in `inventories/api-calls.json`.
