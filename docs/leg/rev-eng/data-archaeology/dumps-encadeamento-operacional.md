# Encadeamento operacional funcionário -> verba -> folha -> competência

Este artefato descreve a cadeia operacional realmente observada nos dumps restaurados para o eixo de cadastro funcional, atribuição de verbas, composição da folha e materialização por competência.

## Visão geral da cadeia

O dump mostra uma cadeia em quatro camadas principais:

1. `funcionario`
2. `funcionario_verba` e tabelas de elegibilidade de verba
3. `folha_competencia` e `folha_pagamento`
4. `folha_pagamento_funcionario_verba`

## Camada 1: matrícula e identidade funcional

Tabela central:

- `funcionario`

Papel funcional:

- representa a matrícula ou cadastro funcional básico que receberá verbas e participará da folha.

Evidência observada:

- `16` funcionários no `rhlinkcon`
- campos relevantes presentes:
  - `matricula`
  - `nome`
  - `cpf`
  - `dt_admissao`
  - `vinculo_id`
  - `cargo_id`
  - `funcao_id`
  - `lotacao_id`

Limites observados:

- todos os registros vieram sem lotação materializada na massa crua;
- `10` dos `16` registros estão sem cargo preenchido;
- a massa é parcial e com sinais de dados sintéticos.

## Camada 2: atribuição e elegibilidade de verbas

### Atribuição individual

Tabela central:

- `funcionario_verba`

Papel funcional:

- associa uma verba diretamente à matrícula.

Evidência observada:

- `16` linhas em `rhlinkcon`
- `16` funcionários distintos com pelo menos uma verba individual
- a única verba individual realmente materializada nesta foto é:
  - `1000 | Salário`

Leitura funcional:

- esta camada funciona como carteira individual de verbas da matrícula.

### Elegibilidade por estrutura de RH

Tabelas satélite:

- `cargo_verba`
- `funcao_verba`
- `vinculo_verba`
- `categoria_profissional_verba`

Evidência observada em `rhlinkcon`:

- `cargo_verba = 2`
- `funcao_verba = 0`
- `vinculo_verba = 0`
- `categoria_profissional_verba = 0`

Verbas por cargo observadas:

- `Assistente Técnico Administrativo -> 1101 | Vencimento`
- `Assistente Técnico Administrativo -> 1107 | Adicional de Titulação e Aperfeiçoamento`

Leitura funcional:

- a atribuição por matrícula não é a única origem de verba;
- o cargo também carrega verbas estruturais que podem participar do cálculo.

### Elegibilidade por tipo de folha

Tabela satélite:

- `tipo_folha_verbas`

Evidência observada:

- `rhlinkcon = 0`
- `rhlinkcon_motor = 3`

No `rhlinkcon_motor`, a `Folha mensal` está ligada a:

- `1101 | Vencimento`
- `1112 | Gratificação por Regência de Classe`
- `124 | INSS`

Leitura funcional:

- o banco do motor materializa melhor a composição da folha por tipo;
- o banco principal, nesta foto, ainda não expõe essa camada com dados.

## Camada 3: competência e folha

### Competência

Tabela:

- `folha_competencia`

Papel funcional:

- organiza a folha por mês e ano de referência.

Evidência observada:

- `3` competências
- meses presentes:
  - `05/2019`
  - `06/2019`
  - `07/2019`

### Folha

Tabela:

- `folha_pagamento`

Papel funcional:

- representa o processamento da competência para uma filial e um tipo de processamento.

Evidência observada em `rhlinkcon`:

- `2` folhas
- status encontrado: `DESBLOQUEADO`
- filial encontrada: `F112`
- tipo de processamento encontrado: `Processamento Padrão`

Leitura funcional:

- a competência é o calendário;
- a folha é o processamento efetivo daquela competência.

## Camada 4: resultado materializado da folha

Tabela central:

- `folha_pagamento_funcionario_verba`

Papel funcional:

- materializa o resultado por matrícula e por verba dentro de uma folha já processada.

Evidência observada em `rhlinkcon`:

- `20` linhas
- junho/2019: `10` funcionários com `10` lançamentos
- julho/2019: `10` funcionários com `10` lançamentos
- apenas a verba `1000 | Salário` aparece como resultado nesta foto do banco principal

Evidência observada em `rhlinkcon_motor`:

- `30` linhas
- julho/2019: `10` funcionários com `30` lançamentos
- verbas materializadas:
  - `1000 | Salário`
  - `1101 | Vencimento`
  - `124 | INSS`

Leitura funcional:

- no banco principal, a folha resultante está simplificada;
- no banco do motor, a decomposição por verba calculada está mais explícita.

## Camada de cálculo

### Fórmulas por verba

Tabela:

- `verba_formula`

Evidência observada:

- `11` fórmulas cadastradas

Exemplos observados:

- `1000 | Salário`
- `1101 | Vencimento`
- `1107 | Adicional de Titulação e Aperfeiçoamento`
- `124 | INSS`
- `4963 | Vale Transporte`

### Atributos de fórmula

Tabela:

- `atributo_formula`

Evidência observada:

- `2` atributos
- exemplos:
  - `Grau Instrução -> o{grauInstrucao}`
  - `Referencia Salarial Cargo -> o{referenciaSalarialCargo.valor}`

Leitura funcional:

- as fórmulas não se ligam por chave estrangeira a cada atributo;
- os atributos aparecem como paths semânticos referenciados dentro do texto da fórmula.

## Diferença funcional entre banco principal e banco do motor

### `rhlinkcon`

- melhor para provar cadastro funcional, carteira individual de verbas e existência de folha por competência;
- folha resultante simplificada nesta massa.

### `rhlinkcon_motor`

- melhor para provar a decomposição do resultado por múltiplas verbas;
- materializa a ligação entre tipo de folha e verbas mais claramente.

## Conclusão operacional

O encadeamento realmente provado pelos dumps é:

`funcionario -> funcionario_verba / cargo_verba -> folha_competencia -> folha_pagamento -> folha_pagamento_funcionario_verba`

Com apoio de:

- `verba`
- `verba_formula`
- `atributo_formula`
- `tipo_processamento`
- `tipo_folha_verbas` no banco do motor

O que esta massa não prova nessa cadeia:

- contracheque persistido em tabela
- ficha financeira persistida em tabela própria
- memória de cálculo completa com valores finais em todas as verbas esperadas
- fechamento legal de folha com saídas oficiais emitidas
