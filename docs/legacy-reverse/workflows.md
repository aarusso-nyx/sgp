# Workflows

## Purpose
Document end-to-end user workflows from observed navigation and actions.

## Workflow template
1. Entry point:
2. Preconditions:
3. Steps:
4. Expected result:
5. Evidence:

## Candidate workflows
### Workflow 1: Gestão de Pagamento - Arquivo de Remessa
1. Entry point: #!/arquivoRemessaPagamento/gestao
2. Preconditions: authenticated user in module `Folha de Pgt`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/001-arquivoremessapagamento-gestao.png

### Workflow 2: Auditoria
1. Entry point: #!/auditoria/gestao
2. Preconditions: authenticated user in module `Auditoria`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/002-auditoria-gestao.png

### Workflow 3: Bancos
1. Entry point: #!/banco/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/003-banco-gestao.png

### Workflow 4: 403
1. Entry point: #!/batimentoFolhaPagamento/relatorio
2. Preconditions: authenticated user in module `Folha de Pgt`.
3. Steps: open route, review form/table state, apply filter `none`, trigger action `Retornar a página inicial`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/004-batimentofolhapagamento-relatorio.png

### Workflow 5: Cargos
1. Entry point: #!/cargo/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/005-cargo-gestao.png

### Workflow 6: Causas de Afastamento de Rescisão
1. Entry point: #!/causaAfastamento/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/006-causaafastamento-gestao.png

### Workflow 7: 403
1. Entry point: #!/centroCusto/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `none`, trigger action `Retornar a página inicial`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/007-centrocusto-gestao.png

### Workflow 8: 403
1. Entry point: #!/classificacaoAto/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `none`, trigger action `Retornar a página inicial`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/008-classificacaoato-gestao.png

### Workflow 9: Convênios
1. Entry point: #!/convenio/gestao
2. Preconditions: authenticated user in module `Gestão`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/009-convenio-gestao.png

### Workflow 10: 403
1. Entry point: #!/convenios/estagiario
2. Preconditions: authenticated user in module `Convênio`.
3. Steps: open route, review form/table state, apply filter `none`, trigger action `Retornar a página inicial`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/010-convenios-estagiario.png

### Workflow 11: Instituição de Ensino
1. Entry point: #!/convenios/instituicaoEnsino
2. Preconditions: authenticated user in module `Convênio`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/011-convenios-instituicaoensino.png

### Workflow 12: Programa
1. Entry point: #!/convenios/programa
2. Preconditions: authenticated user in module `Convênio`.
3. Steps: open route, review form/table state, apply filter `fl-input-1`, trigger action `SGP`.
4. Expected result: screen renders with current dataset and available actions.
5. Evidence: playwright/reports/deep/012-convenios-programa.png


## Notes
- Workflows are generated from observed route metadata and visible actions.
- Marked as operational baselines; validate business semantics with domain owner.
- For full per-module field/action/constraint matrices, see `docs/modules/README.md`.
