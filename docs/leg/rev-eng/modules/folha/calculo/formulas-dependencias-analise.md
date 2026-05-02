# Análise de dependências das fórmulas de folha

Este artefato deriva a matriz `verba -> fórmula -> dependências` a partir do conteúdo persistido em `verba_formula` nos bancos restaurados. O objetivo é explicitar de quais outras rubricas, funções/atributos do motor e campos do contexto cada fórmula depende.

## Resultado geral

- `rhlinkcon`: `14` linhas de dependência deduplicadas na matriz, com `5` dependências diretas por rubrica, `7` dependências diretas por campo de objeto, `1` funções/agregados diretos e `0` referências internas a rubricas dentro de funções do motor.
- `rhlinkcon_motor`: `16` linhas de dependência deduplicadas na matriz, com `5` dependências diretas por rubrica, `7` dependências diretas por campo de objeto, `1` funções/agregados diretos e `2` referências internas a rubricas dentro de funções do motor.
- `rhlinkcon_20190701`: `14` linhas de dependência deduplicadas na matriz, com `5` dependências diretas por rubrica, `7` dependências diretas por campo de objeto, `1` funções/agregados diretos e `0` referências internas a rubricas dentro de funções do motor.

## Padrão sintático observado

- `r{...}`: resultado de outra rubrica já calculada no contexto da folha.
- `o{...}`: campo contextual de objeto, como dados cadastrais ou referência salarial.
- `a{...}`: atributo/função do motor, inclusive funções agregadas como `a{inss(...)}`.
- A lista detalhada foi gravada em `65-matriz-dependencias-formulas-folha.csv`.

## Cadeias funcionais mais relevantes

### `1000 | Salário`

- `rhlinkcon`: `salario = r{vencimento} + r{titulacao_aperfeicoamento} 
salario = salario - r{vale_transporte} 
salario*1`
  Dependências: `r{titulacao_aperfeicoamento} [direta]; r{vale_transporte} [direta]; r{vencimento} [direta]`
- `rhlinkcon_motor`: `salario = r{vencimento} + r{titulacao_aperfeicoamento} 
salario = salario - r{vale_transporte} 
salario*1`
  Dependências: `r{titulacao_aperfeicoamento} [direta]; r{vale_transporte} [direta]; r{vencimento} [direta]`
- `rhlinkcon_20190701`: `salario = r{vencimento} + r{titulacao_aperfeicoamento} 
salario = salario - r{vale_transporte} 
salario*1`
  Dependências: `r{titulacao_aperfeicoamento} [direta]; r{vale_transporte} [direta]; r{vencimento} [direta]`

### `1101 | Vencimento`

- `rhlinkcon`: `o{referenciaSalarialCargo.valor}`
  Dependências: `o{referenciaSalarialCargo.valor} [direta]`
- `rhlinkcon_motor`: `o{referenciaSalarialCargo.valor}`
  Dependências: `o{referenciaSalarialCargo.valor} [direta]`
- `rhlinkcon_20190701`: `o{referenciaSalarialCargo.valor}`
  Dependências: `o{referenciaSalarialCargo.valor} [direta]`

### `1107 | Adicional de Titulação e Aperfeiçoamento`

- `rhlinkcon`: `percent = 0 
SE ( "o{grauInstrucao}" == "SUPERIOR_COMPLETO") 
ENTAO percent = 0.07
SENAO_SE ( "o{grauInstrucao}" == "ESPECIALIZACAO_POS_GRADUACAO" ) 
ENTAO percent = 0.1
SENAO_SE ( "o{grauInstrucao}" == "MESTRADO") 
ENTAO percent = 0.12 
FIM_SE 
r{vencimento} * percent`
  Dependências: `o{grauInstrucao} [direta]; r{vencimento} [direta]`
- `rhlinkcon_motor`: `percent = 0 
SE ( "o{grauInstrucao}" == "SUPERIOR_COMPLETO") 
ENTAO percent = 0.07
SENAO_SE ( "o{grauInstrucao}" == "ESPECIALIZACAO_POS_GRADUACAO" ) 
ENTAO percent = 0.1
SENAO_SE ( "o{grauInstrucao}" == "MESTRADO") 
ENTAO percent = 0.12 
FIM_SE 
r{vencimento} * percent`
  Dependências: `o{grauInstrucao} [direta]; r{vencimento} [direta]`
- `rhlinkcon_20190701`: `percent = 0 
SE ( "o{grauInstrucao}" == "SUPERIOR_COMPLETO") 
ENTAO percent = 0.07
SENAO_SE ( "o{grauInstrucao}" == "ESPECIALIZACAO_POS_GRADUACAO" ) 
ENTAO percent = 0.1
SENAO_SE ( "o{grauInstrucao}" == "MESTRADO") 
ENTAO percent = 0.12 
FIM_SE 
r{vencimento} * percent`
  Dependências: `o{grauInstrucao} [direta]; r{vencimento} [direta]`

### `124 | INSS`

- `rhlinkcon`: `a{inss}`
  Dependências: `a{inss} [direta]`
- `rhlinkcon_motor`: `a{inss(r{vencimento}+r{gratificacao_regencia_classe})}`
  Dependências: `a{inss(r{vencimento}+r{gratificacao_regencia_classe})} [direta]; r{gratificacao_regencia_classe} [interna_em_a{inss(r{vencimento}+r{gratificacao_regencia_classe})}]; r{vencimento} [interna_em_a{inss(r{vencimento}+r{gratificacao_regencia_classe})}]`
- `rhlinkcon_20190701`: `a{inss}`
  Dependências: `a{inss} [direta]`

### `4963 | Vale Transporte`

- `rhlinkcon`: `r{vencimento} * 0.06`
  Dependências: `r{vencimento} [direta]`
- `rhlinkcon_motor`: `r{vencimento} * 0.06`
  Dependências: `r{vencimento} [direta]`
- `rhlinkcon_20190701`: `r{vencimento} * 0.06`
  Dependências: `r{vencimento} [direta]`

## Dicionário local de atributos persistidos

- `o{grauInstrucao}`: `Grau Instrução`.
- `o{referenciaSalarialCargo.valor}`: `Referencia Salarial Cargo`.

## Leitura funcional

- `Salário` é uma rubrica agregadora que depende do resultado de `vencimento`, do adicional de titulação/aperfeiçoamento e do desconto de vale-transporte.
- `Vencimento` e as gratificações percentuais observadas se ancoram na referência salarial do cargo, não em valor fixo parametrizado em tabela própria nesta extração.
- `Adicional de Titulação e Aperfeiçoamento` combina regra condicional por grau de instrução com base de cálculo sobre `vencimento`.
- `INSS` é tratado como função/agregado do motor; no snapshot `rhlinkcon_motor` ele explicita internamente que a base inclui `vencimento` e `gratificação por regência de classe`.
- O banco armazena alias funcionais dentro de `r{...}` como `vencimento` e `vale_transporte`, o que prova dependência semântica entre rubricas, ainda que sem FK explícita de dependência.
