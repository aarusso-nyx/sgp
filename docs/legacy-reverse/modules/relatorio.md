# Module: Relatório

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 2
- Screens observed: 2
- Actions cataloged: 10
- Fields extracted: 7
- Constraint entries: 5
- Permission findings (403-like): 1

## Permission Findings
- #!/relatorios/relatorioRepasseFundoRh | title: 403 | evidence: playwright/reports/deep/046-relatorios-relatoriorepassefundorh.png

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/relatorios/estagio | Relatórios de Estágio | 5 | 8 | 0 | 1 | 1 | 4 | observed |
| #!/relatorios/relatorioRepasseFundoRh | 403 | 2 | 2 | 0 | 0 | 1 | 4 | observed |

## Per-Route Details
### #!/relatorios/estagio
- Title: Relatórios de Estágio
- Evidence: playwright/reports/deep/045-relatorios-estagio.png
- Fields: 5
- Actions: 8
- Models: 14
- Constraints: 3

Field Matrix:
| Label/Key | Type | ng-model | Required | Constraints |
|---|---|---|---|---|
| fl-input-1 | input:search | $mdAutocompleteCtrl.scope.searchText | yes |  |
| input_744 | input |  | no |  |
| input_746 | input |  | no |  |
| username | input:text | user.username | yes |  |
| password | input:password | user.password | yes |  |

Visible Actions:
- SGP [link] => navigates:#!/
- menu [button] 
- notifications_none [button] => ng-click:$mdMenu.open($event)
- $mdMenu.open($event) [button] => ng-click:$mdMenu.open($event)
- ctrl.openCalendarPane($event) [button] => ng-click:ctrl.openCalendarPane($event)
- Open calendar [button] => ng-click:ctrl.openCalendarPane($event)
- Gerar Relatório (Excel) [button] => ng-click:vm.gerarRelatorio()
- Login [button] 

Nested Routes/Components:
- #!/
- #!/notificacoes
- #!/perfil
- #!/login

Model Hints:
- $mdAutocompleteCtrl.scope.searchText
- vm.filtro.tipoRelatorio
- vm.filtro.tipoSituacaoFuncionalId
- vm.filtro.programaEstagioId
- vm.filtro.filialId
- vm.filtro.dataInicial
- vm.filtro.dataFinal
- user.username
- user.password
- tipo in vm.tiposDeRelatorio
- sidebarCtrl
- headerCtrl
- RelatorioEstagioCtrl as vm
- authCtrl

### #!/relatorios/relatorioRepasseFundoRh
- Title: 403
- Evidence: playwright/reports/deep/046-relatorios-relatoriorepassefundorh.png
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

