# Module: Módulo RH

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 12
- Screens observed: 12
- Actions cataloged: 92
- Fields extracted: 42
- Constraint entries: 32
- Permission findings (403-like): 4

## Permission Findings
- #!/dadoCadastralComplementar/gestao | title: 403 | evidence: playwright/reports/deep/013-dadocadastralcomplementar-gestao.png
- #!/definicaoOrganico/gestao | title: 403 | evidence: playwright/reports/deep/014-definicaoorganico-gestao.png
- #!/feriasProgramacao/gestao | title: 403 | evidence: playwright/reports/deep/021-feriasprogramacao-gestao.png
- #!/licencaPremio/gestao | title: 403 | evidence: playwright/reports/deep/030-licencapremio-gestao.png

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/dadoCadastralComplementar/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/definicaoOrganico/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/dependente/gestao | Dependentes | 5 | 12 | 1 | 2 | 1 | 4 | observed |
| #!/experienciaProfissional/gestao | Experiência Profissional | 4 | 9 | 1 | 2 | 1 | 4 | observed |
| #!/feriasProgramacao/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/frequencia/gestao | Frequências | 5 | 10 | 0 | 3 | 1 | 4 | observed |
| #!/funcionario/gestao | Funcionários | 4 | 13 | 1 | 2 | 1 | 4 | observed |
| #!/historicoSituacaoFuncional/gestao | Afastamentos dos Funcionários | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/licencaPremio/gestao | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/nivelSalarialHistorico/gestao | Ajustes de Referência Salarial | 4 | 10 | 1 | 2 | 1 | 4 | observed |
| #!/tempoServico/gestao | Tempo de Serviço dos Funcionários | 4 | 9 | 1 | 2 | 1 | 4 | observed |
| #!/transferenciaFuncionario/gestao | Transferência de Funcionários | 4 | 11 | 1 | 2 | 1 | 4 | observed |

## Per-Route Details
### #!/dadoCadastralComplementar/gestao
- Title: 403
- Evidence: playwright/reports/deep/013-dadocadastralcomplementar-gestao.png
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

### #!/definicaoOrganico/gestao
- Title: 403
- Evidence: playwright/reports/deep/014-definicaoorganico-gestao.png
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

### #!/dependente/gestao
- Title: Dependentes
- Evidence: playwright/reports/deep/015-dependente-gestao.png
- Fields: 5
- Actions: 12
- Models: 17
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| FuncionÃ¡rio | input | search | no |  |
| filial | select |  | no |  |
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
- tipoPessoa
- search
- filial
- searchTerm
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- option in tipoPessoaOptions
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- dependenteCtrl
- authCtrl

### #!/experienciaProfissional/gestao
- Title: Experiência Profissional
- Evidence: playwright/reports/deep/018-experienciaprofissional-gestao.png
- Fields: 4
- Actions: 9
- Models: 13
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
- search
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- experienciaProfissionalCtrl
- authCtrl

### #!/feriasProgramacao/gestao
- Title: 403
- Evidence: playwright/reports/deep/021-feriasprogramacao-gestao.png
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

### #!/frequencia/gestao
- Title: Frequências
- Evidence: playwright/reports/deep/024-frequencia-gestao.png
- Fields: 5
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Funcionário | input | nomeFuncionarioBusca | no |  |
| Ano | input:number | ano | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- Importar Frequências [button] => ng-click:triggerImport()
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
- nomeFuncionarioBusca
- ano
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- frequenciaCtrl
- authCtrl

### #!/funcionario/gestao
- Title: Funcionários
- Evidence: playwright/reports/deep/026-funcionario-gestao.png
- Fields: 4
- Actions: 13
- Models: 19
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
- showRelatorio() [link] => ng-click:showRelatorio()
- importarCSV() [button] => ng-click:importarCSV()
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
- search
- situacoesFuncionais
- searchSituacaoFuncional
- vinculosList
- searchVinculo
- filialList
- searchSiglaFilial
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- funcionarioCtrl
- authCtrl

### #!/historicoSituacaoFuncional/gestao
- Title: Afastamentos dos Funcionários
- Evidence: playwright/reports/deep/027-historicosituacaofuncional-gestao.png
- Fields: 4
- Actions: 10
- Models: 14
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Funcionário | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- SERVIDORES COM AFASTAMENTO VENCIDO [link] => navigates:javascript:void(0);
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
- filialList
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- historicoSituacaoFuncionalCtrl
- authCtrl

### #!/licencaPremio/gestao
- Title: 403
- Evidence: playwright/reports/deep/030-licencapremio-gestao.png
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

### #!/nivelSalarialHistorico/gestao
- Title: Ajustes de Referência Salarial
- Evidence: playwright/reports/deep/037-nivelsalarialhistorico-gestao.png
- Fields: 4
- Actions: 10
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Descrição | input | nivelSalarialDescricaoBusca | no |  |
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
- nivelSalarialDescricaoBusca
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- nivelSalarialHistoricoCtrl
- authCtrl

### #!/tempoServico/gestao
- Title: Tempo de Serviço dos Funcionários
- Evidence: playwright/reports/deep/051-temposervico-gestao.png
- Fields: 4
- Actions: 9
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Funcionário | input | nomeBusca | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
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
- tempoServicoCtrl
- authCtrl

### #!/transferenciaFuncionario/gestao
- Title: Transferência de Funcionários
- Evidence: playwright/reports/deep/057-transferenciafuncionario-gestao.png
- Fields: 4
- Actions: 11
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
- search
- filialList
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- transFuncionarioCtrl
- authCtrl

