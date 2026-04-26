# Module: Convênio

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 3
- Screens observed: 3
- Actions cataloged: 20
- Fields extracted: 10
- Constraint entries: 8
- Permission findings (403-like): 1

## Permission Findings
- #!/convenios/estagiario | title: 403 | evidence: playwright/reports/deep/010-convenios-estagiario.png

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/convenios/estagiario | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |
| #!/convenios/instituicaoEnsino | Instituição de Ensino | 4 | 9 | 1 | 2 | 1 | 4 | observed |
| #!/convenios/programa | Programa | 4 | 9 | 1 | 2 | 1 | 4 | observed |

## Per-Route Details
### #!/convenios/estagiario
- Title: 403
- Evidence: playwright/reports/deep/010-convenios-estagiario.png
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

### #!/convenios/instituicaoEnsino
- Title: Instituição de Ensino
- Evidence: playwright/reports/deep/011-convenios-instituicaoensino.png
- Fields: 4
- Actions: 9
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Instituição | input | nomeBusca | no |  |
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
- instituicaoEnsinoCtrl
- authCtrl

### #!/convenios/programa
- Title: Programa
- Evidence: playwright/reports/deep/012-convenios-programa.png
- Fields: 4
- Actions: 9
- Models: 13
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Programa | input | nomeBusca | no |  |
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
- programaCtrl
- authCtrl

