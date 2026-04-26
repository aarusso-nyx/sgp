# Folha, verbas, fórmulas e atributos

Este artefato aprofunda a trilha funcional `folha -> verbas -> fórmulas -> atributos` com base exclusiva nos dumps restaurados.

## Superfície realmente provada

Tabelas com dados em `rhlinkcon`:

- `verba`: `11`
- `verba_formula`: `11`
- `atributo_formula`: `2`
- `folha_competencia`: `3`
- `folha_pagamento`: `2`
- `folha_pagamento_funcionario_verba`: `20`

Tabelas com dados em `rhlinkcon_motor`:

- `verba`: `11`
- `verba_formula`: `11`
- `atributo_formula`: `2`
- `folha_competencia`: `3`
- `folha_pagamento`: `2`
- `folha_pagamento_funcionario_verba`: `30`
- `tipo_folha_verbas`: `3`

## Catálogo de verbas efetivamente observado

Exemplos reais de verbas cadastradas:

- `1000 | Salário`
- `1101 | Vencimento`
- `1107 | Adicional de Titulação e Aperfeiçoamento`
- `1112 | Gratificação por Regência de Classe`
- `1158 | Gratificação por Maturação Profissional`
- `1229 | Adicional de Incentivo Funcional ( Motorista )`
- `1236 | Adicional por Regime Especial de Trabalho Policial – RETP`
- `1237 | Adicional Desempenho Profissional`
- `1238 | Adicional de Responsabilidade Técnica ( Engenheiro )`
- `124 | INSS`
- `4963 | Vale Transporte`

Leitura funcional:

- o catálogo combina vantagens, descontos e gratificações;
- a massa cobre verbas-base, incidências previdenciárias e adicionais por qualificação ou exercício.

## Organização funcional das fórmulas

Cada verba tem uma fórmula textual em `verba_formula`.

Padrões observados:

- verbas compostas chamam resultados de outras verbas;
- verbas-base puxam atributos de referência salarial;
- descontos puxam alíquota ou incidência percentual;
- gratificações usam multiplicadores simples sobre referências salariais.

Exemplos observados:

- `Salário`:
  - combina `vencimento`, `titulacao_aperfeicoamento` e desconta `vale_transporte`
- `Vencimento`:
  - puxa `referenciaSalarialCargo.valor`
- `Adicional de Titulação e Aperfeiçoamento`:
  - usa `grauInstrucao` para decidir percentual
- `INSS`:
  - delega a cálculo por alíquota
- `Vale Transporte`:
  - aplica `6%` sobre `vencimento`

Leitura funcional:

- o legado modela rubricas por fórmula declarativa, não apenas por código fixo;
- o resultado de uma verba pode depender de outras verbas já calculadas;
- o desenho sugere cálculo em camadas: base salarial, adicionais, descontos e composição final.

## Atributos que alimentam fórmulas

Na massa restaurada só há `2` atributos cadastrados em `atributo_formula`:

- `Grau Instrução -> o{grauInstrucao}`
- `Referencia Salarial Cargo -> o{referenciaSalarialCargo.valor}`

Leitura funcional:

- os atributos publicados nesta foto são poucos, mas já mostram dois eixos centrais do cálculo:
  - qualificação do servidor
  - referência salarial do cargo

Inferência:

- o produto admite uma camada semântica de atributos para fórmulas;
- nesta massa, essa camada não está exaustivamente povoada, então o universo completo de variáveis do motor não pode ser provado só pelo dump.

## Diferença entre `rhlinkcon` e `rhlinkcon_motor`

### `rhlinkcon`

Na materialização final da folha:

- junho/2019: `10` lançamentos
- julho/2019: `10` lançamentos
- apenas `1000 | Salário` aparece como resultado materializado

Leitura funcional:

- o banco principal desta foto preserva a folha de maneira mais resumida.

### `rhlinkcon_motor`

Na materialização final da folha:

- julho/2019: `30` lançamentos
- para `10` funcionários, aparecem `3` verbas por matrícula:
  - `1000 | Salário`
  - `1101 | Vencimento`
  - `124 | INSS`

Além disso:

- `tipo_folha_verbas` está povoada
- `Folha mensal` está ligada a:
  - `1101 | Vencimento`
  - `1112 | Gratificação por Regência de Classe`
  - `124 | INSS`

Leitura funcional:

- o motor expõe melhor a decomposição do cálculo;
- o banco principal parece guardar só uma visão mais consolidada do resultado.

## Papel de `aliquota`

A tabela `aliquota` tem `4` registros.

Faixas observadas:

- todas para `INSS`
- ano `2019`
- campos:
  - `valor_inicial`
  - `valor_final`
  - `deducao`
  - `aliquota`
  - `faixa`

Leitura funcional:

- a massa prova a existência de parametrização de incidência previdenciária;
- o desconto de `INSS` depende de tabela de faixas, não só de fórmula fixa.

## O que já está provado nesta trilha

- existe catálogo funcional de verbas
- cada verba pode ter fórmula própria
- as fórmulas referenciam atributos semânticos e outras rubricas
- há diferença clara entre o banco principal e o banco do motor
- o motor materializa melhor a decomposição da folha
- existe parametrização de alíquota para INSS

## O que ainda não está provado

- universo completo de atributos de fórmula
- memória de cálculo completa de todas as verbas previstas
- valores finais não nulos para todas as rubricas esperadas
- cálculo completo de IRRF, consignado, rescisão e adiantamentos nesta massa
- documentos oficiais derivados da folha

## Conclusão funcional

O legado usa um desenho híbrido:

- catálogo de verbas
- fórmulas declarativas por rubrica
- atributos semânticos para alimentar as fórmulas
- parametrização de alíquota
- materialização final por competência e matrícula

Nesta fotografia, `rhlinkcon_motor` é a melhor evidência do cálculo detalhado, enquanto `rhlinkcon` é a melhor evidência da folha simplificada já consolidada.
