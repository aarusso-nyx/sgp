# Module: Gestão

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 35
- Screens observed: 35
- Actions cataloged: 256
- Fields extracted: 123
- Constraint entries: 98
- Permission findings (403-like): 11

## Permission Findings
- #!/centroCusto/gestao | title: 403 | evidence: playwright/reports/deep/007-centrocusto-gestao.png
- #!/classificacaoAto/gestao | title: 403 | evidence: playwright/reports/deep/008-classificacaoato-gestao.png
- #!/diaUtil/gestao | title: 403 | evidence: playwright/reports/deep/016-diautil-gestao.png
- #!/funcao/gestao | title: 403 | evidence: playwright/reports/deep/025-funcao-gestao.png
- #!/lotacao/gestao | title: 403 | evidence: playwright/reports/deep/031-lotacao-gestao.png
- #!/motivoAfastamento/gestao | title: 403 | evidence: playwright/reports/deep/033-motivoafastamento-gestao.png
- #!/naturezaFuncao/gestao | title: 403 | evidence: playwright/reports/deep/035-naturezafuncao-gestao.png
- #!/responsavelLegal/gestao | title: 403 | evidence: playwright/reports/deep/048-responsavellegal-gestao.png
- #!/tipoFerias/gestao | title: 403 | evidence: playwright/reports/deep/054-tipoferias-gestao.png
- #!/valeTransporte/gestao | title: 403 | evidence: playwright/reports/deep/060-valetransporte-gestao.png
- #!/vinculo/gestao | title: 403 | evidence: playwright/reports/deep/063-vinculo-gestao.png

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/banco/gestao | Bancos | 5 | 8 | 1 | 3 | 1 | 4 | observed |
| #!/cargo/gestao | Cargos | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/causaAfastamento/gestao | Causas de Afastamento de Rescisão | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/centroCusto/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/classificacaoAto/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/convenio/gestao | Convênios | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/diaUtil/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/empresaFilial/gestao | Empresas Filiais | 4 | 11 | 1 | 2 | 1 | 4 | observed |
| #!/exportacaoArquivo/gestao | Exportação de Arquivo | 4 | 6 | 0 | 1 | 1 | 4 | observed |
| #!/faixaSalarial/gestao | Faixa Salarial | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/funcao/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/importacaoConsignado | Seja bem vindo! | 3 | 5 | 0 | 1 | 1 | 4 | observed |
| #!/legislacao/gestao | SGP | 5 | 11 | 1 | 3 | 1 | 5 | observed |
| #!/lotacao/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/motivo/gestao | Motivos | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/motivoAfastamento/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/motivoDesligamento/gestao | Motivos do Desligamento | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/naturezaFuncao/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/naturezaJuridica/gestao | Natureza Jurídica | 5 | 10 | 1 | 3 | 1 | 4 | observed |
| #!/parametroSistema/gestao | Formulário de Parâmetros do Sistema | 5 | 10 | 0 | 1 | 1 | 4 | observed |
| #!/perfilAcesso/gestao | Perfis de Acesso - Lista | 4 | 11 | 1 | 2 | 1 | 5 | observed |
| #!/referenciaSalarial/gestao | Referências Salariais | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/responsavelLegal/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/sindicato/gestao | Sindicatos | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/situacaoFuncional/gestao | Situações Funcionais | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/tipoContrato/gestao | Tipos de Contratos | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/tipoDocumento/gestao | Gestão de Tipos de Documento | 4 | 10 | 1 | 2 | 1 | 5 | observed |
| #!/tipoFerias/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/tipoFolha/gestao | Tipos de Folhas | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/tipoProcessamento/gestao | Tipos de Processamento | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/turno/gestao | Turnos | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/usuario/gestao | Gestão de Usuários | 6 | 10 | 1 | 4 | 1 | 4 | observed |
| #!/valeTransporte/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/verba/gestao | Gestão de Verbas | 4 | 12 | 1 | 2 | 1 | 4 | observed |
| #!/vinculo/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |

## Per-Route Details
### #!/banco/gestao
- Title: Bancos
- Evidence: playwright/reports/deep/003-banco-gestao.png
- Fields: 5
- Actions: 8
- Models: 13
- Constraints: 5

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| fl-input-45 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| fl-input-46 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- searchText
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- bancoCtrl
- authCtrl

### #!/cargo/gestao
- Title: Cargos
- Evidence: playwright/reports/deep/005-cargo-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nome | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:nomeBusca=null;loadList()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- nomeBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- cargoCtrl
- authCtrl

### #!/causaAfastamento/gestao
- Title: Causas de Afastamento de Rescisão
- Evidence: playwright/reports/deep/006-causaafastamento-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- causaAfastamentoCtrl
- authCtrl

### #!/centroCusto/gestao
- Title: 403
- Evidence: playwright/reports/deep/007-centrocusto-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/classificacaoAto/gestao
- Title: 403
- Evidence: playwright/reports/deep/008-classificacaoato-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/convenio/gestao
- Title: Convênios
- Evidence: playwright/reports/deep/009-convenio-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- convenioCtrl
- authCtrl

### #!/diaUtil/gestao
- Title: 403
- Evidence: playwright/reports/deep/016-diautil-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/empresaFilial/gestao
- Title: Empresas Filiais
- Evidence: playwright/reports/deep/017-empresafilial-gestao.png
- Fields: 4
- Actions: 11
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nome/Sigla | input | siglaNomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- Árvore Da Empresa [button] => ng-click:tree($event)
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- siglaNomeBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- empresaFilialCtrl
- authCtrl

### #!/exportacaoArquivo/gestao
- Title: Exportação de Arquivo
- Evidence: playwright/reports/deep/019-exportacaoarquivo-gestao.png
- Fields: 4
- Actions: 6
- Models: 10
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| tipo_arquivo | select |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- Gerar arquivo [button] => ng-click:gerarArquivo()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- filtro.arquivo
- dateModels.fimPeriodoPortalTransparencia
- user.username
- user.password
- option in tipoArquivoOptions
- sidebarCtrl
- headerCtrl
- exportacaoArquivoCtrl
- authCtrl

### #!/faixaSalarial/gestao
- Title: Faixa Salarial
- Evidence: playwright/reports/deep/020-faixasalarial-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Faixa Salarial | input | grupoSalarialNivel | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- grupoSalarialNivel
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- faixaSalarialCtrl
- authCtrl

### #!/funcao/gestao
- Title: 403
- Evidence: playwright/reports/deep/025-funcao-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/importacaoConsignado
- Title: Seja bem vindo!
- Evidence: playwright/reports/deep/028-importacaoconsignado.png
- Fields: 3
- Actions: 5
- Models: 7
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- DashboardCtrl
- authCtrl

### #!/legislacao/gestao
- Title: SGP
- Evidence: playwright/reports/deep/029-legislacao-gestao.png
- Fields: 5
- Actions: 11
- Models: 19
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nº da Norma | input | legislacaoFiltro.numero | no |  |
| Ano da Norma | input | legislacaoFiltro.ano | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- Norma/Legislação [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login
- #!/legislacao/formulario

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- legislacaoFiltro.numero
- legislacaoFiltro.enteFederado
- legislacaoFiltro.norma
- legislacaoFiltro.detalhamentoNorma
- legislacaoFiltro.ano
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- tab in $mdTabsCtrl.tabs
- (index, tab) in $mdTabsCtrl.tabs
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- legislacaoCtrl
- authCtrl

### #!/lotacao/gestao
- Title: 403
- Evidence: playwright/reports/deep/031-lotacao-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/motivo/gestao
- Title: Motivos
- Evidence: playwright/reports/deep/032-motivo-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- motivoCtrl
- authCtrl

### #!/motivoAfastamento/gestao
- Title: 403
- Evidence: playwright/reports/deep/033-motivoafastamento-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/motivoDesligamento/gestao
- Title: Motivos do Desligamento
- Evidence: playwright/reports/deep/034-motivodesligamento-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- motivoDesligamentoCtrl
- authCtrl

### #!/naturezaFuncao/gestao
- Title: 403
- Evidence: playwright/reports/deep/035-naturezafuncao-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/naturezaJuridica/gestao
- Title: Natureza Jurídica
- Evidence: playwright/reports/deep/036-naturezajuridica-gestao.png
- Fields: 5
- Actions: 10
- Models: 14
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Código | input | codigoBusca | no |  |
| Nome | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- codigoBusca
- nomeBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- naturezaJuridicaCtrl
- authCtrl

### #!/parametroSistema/gestao
- Title: Formulário de Parâmetros do Sistema
- Evidence: playwright/reports/deep/039-parametrosistema-gestao.png
- Fields: 5
- Actions: 10
- Models: 16
- Constraints: 5

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Sigla do Sistema | input | parametros.siglaSistema | yes | maxlength=20 |
| Frase Inicial do Sistema | input | parametros.fraseInicialSistema | yes | maxlength=500 |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- ParÃ¢metros Gerais [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
- ParÃ¢metros de MatrÃ­cula [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
- ParÃ¢metros de FuncionÃ¡rio [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
- ParÃ¢metros de Imagens [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
- Salvar [button] => ng-click:save()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- parametros.siglaSistema
- parametros.fraseInicialSistema
- parametros.matriculaFormato
- parametros.matriculaPrefixo
- parametros.matriculaSufixo
- parametros.matriculaAutomatica
- parametros.funcionarioEtapas
- user.username
- user.password
- tab in $mdTabsCtrl.tabs
- (index, tab) in $mdTabsCtrl.tabs
- sidebarCtrl
- headerCtrl
- parametroSistemaCtrl
- authCtrl

### #!/perfilAcesso/gestao
- Title: Perfis de Acesso - Lista
- Evidence: playwright/reports/deep/040-perfilacesso-gestao.png
- Fields: 4
- Actions: 11
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nome | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- search [button] => ng-click:loadList()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login
- #!/perfilAcesso/formulario

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- nomeBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- perfilAcessoCtrl
- authCtrl

### #!/referenciaSalarial/gestao
- Title: Referências Salariais
- Evidence: playwright/reports/deep/041-referenciasalarial-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- referenciaSalarialCtrl
- authCtrl

### #!/responsavelLegal/gestao
- Title: 403
- Evidence: playwright/reports/deep/048-responsavellegal-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/sindicato/gestao
- Title: Sindicatos
- Evidence: playwright/reports/deep/049-sindicato-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descricao | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- sindicatoCtrl
- authCtrl

### #!/situacaoFuncional/gestao
- Title: Situações Funcionais
- Evidence: playwright/reports/deep/050-situacaofuncional-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- situacaoFuncionalCtrl
- authCtrl

### #!/tipoContrato/gestao
- Title: Tipos de Contratos
- Evidence: playwright/reports/deep/052-tipocontrato-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nome | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- nomeBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- tipoContratoCtrl
- authCtrl

### #!/tipoDocumento/gestao
- Title: Gestão de Tipos de Documento
- Evidence: playwright/reports/deep/053-tipodocumento-gestao.png
- Fields: 4
- Actions: 10
- Models: 12
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login
- #!/tipoDocumento/formulario

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- tipoDocumentoCtrl
- authCtrl

### #!/tipoFerias/gestao
- Title: 403
- Evidence: playwright/reports/deep/054-tipoferias-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/tipoFolha/gestao
- Title: Tipos de Folhas
- Evidence: playwright/reports/deep/055-tipofolha-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- tipoFolhaCtrl
- authCtrl

### #!/tipoProcessamento/gestao
- Title: Tipos de Processamento
- Evidence: playwright/reports/deep/056-tipoprocessamento-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- tipoProcessamentoCtrl
- authCtrl

### #!/turno/gestao
- Title: Turnos
- Evidence: playwright/reports/deep/058-turno-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | codigo | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- codigo
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- turnoCtrl
- authCtrl

### #!/usuario/gestao
- Title: Gestão de Usuários
- Evidence: playwright/reports/deep/059-usuario-gestao.png
- Fields: 6
- Actions: 10
- Models: 15
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Nome | input | nomeBusca | no |  |
| CPF | input | cpfBusca | no |  |
| Login | input | loginBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- nomeBusca
- cpfBusca
- loginBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- usuarioCtrl
- authCtrl

### #!/valeTransporte/gestao
- Title: 403
- Evidence: playwright/reports/deep/060-valetransporte-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

### #!/verba/gestao
- Title: Gestão de Verbas
- Evidence: playwright/reports/deep/061-verba-gestao.png
- Fields: 4
- Actions: 12
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | descricaoVerbaBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showRelatorio() [link] => ng-click:showRelatorio()
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList()
- $pagination.previous() [button] => ng-click:$pagination.previous()
- $pagination.next() [button] => ng-click:$pagination.next()
- Ínicio [button] => ng-click:onStart()
- Final [button] => ng-click:onEnd()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- descricaoVerbaBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- verbaCtrl
- authCtrl

### #!/vinculo/gestao
- Title: 403
- Evidence: playwright/reports/deep/063-vinculo-gestao.png
- Fields: 2
- Actions: 2
- Models: 6
- Constraints: 2

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- Retornar a página inicial [link] => navigates:#!/
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- authCtrl

