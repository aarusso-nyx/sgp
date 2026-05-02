# Extração de fórmulas de folha dos bancos restaurados

Este artefato registra a extração direta das fórmulas persistidas de folha a partir das bases restauradas no SQL Server. O foco desta rodada foi a tabela `verba_formula`, por ser a estrutura que armazena fórmulas operacionais de rubricas de folha.

## Escopo consultado

- `rhlinkcon`: `11` fórmulas em `verba_formula`, `2` atributos em `atributo_formula`, assinatura `8f4cef491362499cde268bf9f61fb13e92cfe2ec`.
- `rhlinkcon_motor`: `11` fórmulas em `verba_formula`, `2` atributos em `atributo_formula`, assinatura `3c7e176eea5d3aef39eacb300a3849df7646f652`.
- `rhlinkcon_20190701`: `11` fórmulas em `verba_formula`, `2` atributos em `atributo_formula`, assinatura `8f4cef491362499cde268bf9f61fb13e92cfe2ec`.

## Resultado objetivo

- Foram extraídas `11` fórmulas de folha em cada banco.
- Os bancos `rhlinkcon` e `rhlinkcon_20190701` têm o mesmo conjunto e o mesmo conteúdo de fórmulas.
- O banco `rhlinkcon_motor` difere apenas na fórmula da verba `124 | INSS`.
- O dicionário local de atributos persistidos em `atributo_formula` contém `Grau Instrução -> o{grauInstrucao}` e `Referencia Salarial Cargo -> o{referenciaSalarialCargo.valor}`.
- A lista completa foi gravada em `63-lista-completa-formulas-folha-bancos.csv`.

## Diferenças relevantes entre bancos

### Verba `124`

- `rhlinkcon`: `INSS`
  Fórmula normalizada: `a{inss}`
- `rhlinkcon_motor`: `INSS`
  Fórmula normalizada: `a{inss(r{vencimento}+r{gratificacao_regencia_classe})}`
- `rhlinkcon_20190701`: `INSS`
  Fórmula normalizada: `a{inss}`

## Observação de escopo

- Também existem colunas de fórmula em `regra_aposentadoria`, mas elas pertencem ao domínio previdenciário e não foram incluídas nesta extração porque o pedido foi focado em folha.
