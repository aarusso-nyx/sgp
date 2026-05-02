# Module: Auditoria

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 1
- Screens observed: 1
- Actions cataloged: 10
- Fields extracted: 6
- Constraint entries: 3
- Permission findings (403-like): 0

## Permission Findings
- None observed in current session.

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/auditoria/gestao | Auditoria | 6 | 10 | 1 | 4 | 1 | 4 | observed |

## Per-Route Details
### #!/auditoria/gestao
- Title: Auditoria
- Evidence: playwright/reports/deep/002-auditoria-gestao.png
- Fields: 6
- Actions: 10
- Models: 16
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| Período inicial | input | auditoriaFiltro.periodoInicial | no |  |
| Período final | input | auditoriaFiltro.periodoFinal | no |  |
| Usuário | input | auditoriaFiltro.nome | no |  |
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
- auditoriaFiltro.periodoInicial
- auditoriaFiltro.periodoFinal
- auditoriaFiltro.nome
- auditoriaFiltro.tabelasSelecionadas
- selected
- $pagination.page
- $pagination.limit
- user.username
- user.password
- page in $pageSelect.pages
- option in $pagination.limitOptions
- sidebarCtrl
- headerCtrl
- auditoriaCtrl
- authCtrl

