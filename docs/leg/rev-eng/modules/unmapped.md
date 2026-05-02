# Module: Unmapped

Generated at: 2026-04-16T21:16:12.967Z

## Summary
- Routes mapped: 10
- Screens observed: 1
- Actions cataloged: 5
- Fields extracted: 3
- Constraint entries: 3
- Permission findings (403-like): 0

## Permission Findings
- None observed in current session.

## Route Matrix
| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |
|---|---|---:|---:|---:|---:|---:|---:|---|
| #!/ | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/arquivoRemessaPagamento/importadorArquivoRetornoPagamento/gestao | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/importadorVerbaFuncionario/gestao | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/legislacao/formulario | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/login | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/notificacoes | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/page/home | Seja bem vindo! | 3 | 5 | 0 | 1 | 1 | 4 | observed |
| #!/perfil | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/perfilAcesso/formulario | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |
| #!/tipoDocumento/formulario | not captured | 0 | 0 | 0 | 0 | 0 | 0 | observed |

## Per-Route Details
### #!/
- Capture status: unverified (no screen record).

### #!/arquivoRemessaPagamento/importadorArquivoRetornoPagamento/gestao
- Capture status: unverified (no screen record).

### #!/importadorVerbaFuncionario/gestao
- Capture status: unverified (no screen record).

### #!/legislacao/formulario
- Capture status: unverified (no screen record).

### #!/login
- Capture status: unverified (no screen record).

### #!/notificacoes
- Capture status: unverified (no screen record).

### #!/page/home
- Title: Seja bem vindo!
- Evidence: playwright/reports/deep/038-page-home.png
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

### #!/perfil
- Capture status: unverified (no screen record).

### #!/perfilAcesso/formulario
- Capture status: unverified (no screen record).

### #!/tipoDocumento/formulario
- Capture status: unverified (no screen record).

