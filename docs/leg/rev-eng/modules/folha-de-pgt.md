# Module: Folha de Pgt

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 9
- Screens observed: 9
- Actions cataloged: 69
- Fields extracted: 42
- Constraint entries: 28
- Permission findings (403-like): 2

## Permission Findings
- #!/batimentoFolhaPagamento/relatorio | title: 403 | evidence: playwright/reports/deep/004-batimentofolhapagamento-relatorio.png
- #!/relatorio/financeiro/gestao | title: 403 | evidence: playwright/reports/deep/042-relatorio-financeiro-gestao.png

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/arquivoRemessaPagamento/gestao | Gestão de Pagamento - Arquivo de Remessa | 4 | 10 | 1 | 2 | 1 | 5 | observed |
| #!/batimentoFolhaPagamento/relatorio | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/fichaFinanceira/gestao | Ficha Financeira | 5 | 11 | 1 | 2 | 1 | 4 | observed |
| #!/folhaPagamento/gestao | Folha de Pagamento | 3 | 5 | 0 | 1 | 1 | 4 | observed |
| #!/relatorio/financeiro/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/relatorioFolhaPagamento/gestao | Relatórios da Folha | 7 | 7 | 0 | 2 | 1 | 4 | observed |
| #!/relatorioGerencial/gestao | Gestão de Relatório Gerencial | 6 | 13 | 1 | 3 | 1 | 4 | observed |
| #!/relatorioServidorPagBloqueado/gestao | Relatórios de Servidores com Pagamento Bloqueado | 9 | 7 | 0 | 2 | 1 | 4 | observed |
| #!/verbasFuncionario/gestao | Verbas do Funcionário | 4 | 12 | 1 | 2 | 1 | 5 | observed |

## Per-Route Details
### #!/arquivoRemessaPagamento/gestao
- Title: Gestão de Pagamento - Arquivo de Remessa
- Evidence: playwright/reports/deep/001-arquivoremessapagamento-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 4

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| fl-input-5 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- #!/arquivoRemessaPagamento/importadorArquivoRetornoPagamento/gestao [link] => navigates:#!/arquivoRemessaPagamento/importadorArquivoRetornoPagamento/gestao
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
- #!/arquivoRemessaPagamento/importadorArquivoRetornoPagamento/gestao

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- selectedSituacoes
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- arquivoRemessaPagamentoCtrl
- authCtrl

### #!/batimentoFolhaPagamento/relatorio
- Title: 403
- Evidence: playwright/reports/deep/004-batimentofolhapagamento-relatorio.png
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

### #!/fichaFinanceira/gestao
- Title: Ficha Financeira
- Evidence: playwright/reports/deep/022-fichafinanceira-gestao.png
- Fields: 5
- Actions: 11
- Models: 16
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Funcionário | input | search | no |  |
| filial | select |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadlist()
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
- search
- situacoesFuncionaisSelect
- vinculosSelect
- filialId
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- fichaFinanceiraCtrl
- authCtrl

### #!/folhaPagamento/gestao
- Title: Folha de Pagamento
- Evidence: playwright/reports/deep/023-folhapagamento-gestao.png
- Fields: 3
- Actions: 5
- Models: 26
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
- selectedCompetencia
- folhaPagamento.filialId
- folhaPagamento.tipoProcessamentoId
- folhaPagamento.periodoProcessamentoInicio
- folhaPagamento.periodoProcessamentoFim
- folhaPagamento.status
- folhasTipoProcessamentoFilter
- folhasFilialFilter
- folhasSituacaoFilter
- selected
- tab2.folhaPagamento.tipoProcessamentoId
- tab2.folhaPagamento.periodoProcessamentoInicio
- tab2.folhaPagamento.periodoProcessamentoFim
- tab2.folhaPagamento.status
- selectedLotes
- anos
- comp
- user.username
- user.password
- tab in $mdTabsCtrl.tabs
- (index, tab) in $mdTabsCtrl.tabs
- sidebarCtrl
- headerCtrl
- folhaPagamentoCtrl
- ... (+1 more)

### #!/relatorio/financeiro/gestao
- Title: 403
- Evidence: playwright/reports/deep/042-relatorio-financeiro-gestao.png
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

### #!/relatorioFolhaPagamento/gestao
- Title: Relatórios da Folha
- Evidence: playwright/reports/deep/043-relatoriofolhapagamento-gestao.png
- Fields: 7
- Actions: 7
- Models: 12
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| filial | select |  | no |  |
| ano | select |  | no |  |
| FiltroCompetencia | select |  | no |  |
| tipoProcessamento | select |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- Gerar PDF [button] => ng-click:showRelatorio('pdf')
- Gerar Excel [button] => ng-click:showRelatorio('excel')
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- selectedFilial
- selectedFuncional
- relatorioFolhaPagamento.ano
- relatorioFolhaPagamento.competencia
- relatorioFolhaPagamento.tipoProcessamento
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- relatorioFolhaPagamentoCtrl
- authCtrl

### #!/relatorioGerencial/gestao
- Title: Gestão de Relatório Gerencial
- Evidence: playwright/reports/deep/044-relatoriogerencial-gestao.png
- Fields: 6
- Actions: 13
- Models: 18
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| relatorioGerencialFiltroAno | select |  | no |  |
| relatorioGerencialFiltroCompetencia | select |  | no |  |
| tipoProcessamento | select |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- showMesCompare($event) [link] => ng-click:showMesCompare($event)
- showRelatorio('excel') [link] => ng-click:showRelatorio('excel')
- showRelatorio('pdf') [link] => ng-click:showRelatorio('pdf')
- autorenew [button] => ng-click:limpaFiltro()
- refresh [button] => ng-click:loadList();
- Filiais [md-tab-item] => ng-click:$mdTabsCtrl.select(tab.getIndex())
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
- relatorioGerencialFiltro.ano
- relatorioGerencialFiltro.competencia
- relatorioGerencialFiltro.tipoProcessamento
- tabs[0].selectedItem.tipo.descricao
- $pagination.page
- $pagination.limit
- user.username
- user.password
- tab in tabs
- tab in $mdTabsCtrl.tabs
- (index, tab) in $mdTabsCtrl.tabs
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- relatorioGerencialCtrl
- authCtrl

### #!/relatorioServidorPagBloqueado/gestao
- Title: Relatórios de Servidores com Pagamento Bloqueado
- Evidence: playwright/reports/deep/047-relatorioservidorpagbloqueado-gestao.png
- Fields: 9
- Actions: 7
- Models: 13
- Constraints: 5

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| fundosSelecionados | select |  | no |  |
| situacaoFuncionalSelecionadas | select |  | no |  |
| servidorSelecionado | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Data de Nascimento | input | dataNascimento | yes |  |
| pensaoAlimenticia | select |  | no |  |
| pensionista | select |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- Limpar [button] => ng-click:pensionista = null; pensaoAlimenticia = null; dataNascimento = null; servidorSelecionado = null; fundosSelecionados = null; situacaoFuncionalSelecionadas = null
- Gerar PDF [button] => ng-click:showRelatorio('pdf')
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- fundosSelecionados
- searchTerm
- situacaoFuncionalSelecionadas
- dataNascimento
- pensaoAlimenticia
- pensionista
- user.username
- user.password
- sidebarCtrl
- headerCtrl
- relatorioServidorPagBloqueadoCtrl
- authCtrl

### #!/verbasFuncionario/gestao
- Title: Verbas do Funcionário
- Evidence: playwright/reports/deep/062-verbasfuncionario-gestao.png
- Fields: 4
- Actions: 12
- Models: 14
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Funcionário | input | search | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- #!/importadorVerbaFuncionario/gestao [link] => navigates:#!/importadorVerbaFuncionario/gestao
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
- #!/importadorVerbaFuncionario/gestao

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- search
- filialId
- funcionarioVerbaAssociada
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- verbasFuncionarioCtrl
- authCtrl

