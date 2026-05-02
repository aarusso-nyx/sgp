# Funcionário, cargo, função, vínculo e elegibilidade de verbas

Este artefato aprofunda a trilha `funcionario -> cargo/funcao/vinculo -> elegibilidade de verbas` com base nos dumps restaurados.

## Estrutura funcional realmente observada

Tabelas centrais:

- `funcionario`
- `cargo`
- `funcao`
- `vinculo`
- `funcionario_verba`
- `cargo_verba`
- `funcao_verba`
- `vinculo_verba`
- `categoria_profissional_verba`

## Como a matrícula aparece na massa

Em `rhlinkcon`:

- `16` funcionários
- `1` cargo
- `1` função
- `1` vínculo

Campos funcionais relevantes em `funcionario`:

- `matricula`
- `nome`
- `cpf`
- `dt_admissao`
- `cargo_id`
- `funcao_id`
- `vinculo_id`
- `lotacao_id`

Achados relevantes:

- todos os `16` registros têm função preenchida
- todos os `16` registros compartilham o mesmo vínculo
- `10` dos `16` estão sem cargo
- todos estão sem lotação materializada na massa crua

Leitura funcional:

- a função está mais consistente que o cargo nesta foto;
- o vínculo é praticamente único na massa;
- a lotação não participa de forma comprovável desta cadeia no dump atual.

## Valores reais encontrados para cargo, função e vínculo

Valores observados:

- vínculo: `Vínculo Criminal de Gothan`
- cargo: `Assistente Técnico Administrativo`
- função: `Ajuda a polícia.`

Leitura funcional:

- a massa é claramente de demonstração ou homologação, mas ainda serve para provar a modelagem;
- o produto separa vínculo, cargo e função como dimensões distintas da matrícula.

## Carteira individual de verbas por matrícula

Tabela:

- `funcionario_verba`

Evidência observada em `rhlinkcon`:

- `16` linhas
- `16` funcionários distintos com pelo menos uma verba individual
- a única verba individual materializada nesta foto é:
  - `1000 | Salário`

Leitura funcional:

- existe uma carteira individual mínima de rubricas por matrícula;
- nesta massa, cada funcionário tem essencialmente uma verba-base individual.

## Elegibilidade de verbas por cargo, função e vínculo

### Cargo

Tabela:

- `cargo_verba`

Evidência observada:

- `2` associações

Associações reais:

- `Assistente Técnico Administrativo -> 1101 | Vencimento`
- `Assistente Técnico Administrativo -> 1107 | Adicional de Titulação e Aperfeiçoamento`

Leitura funcional:

- o cargo não serve só para classificação funcional;
- ele também determina verbas elegíveis, especialmente base salarial e adicional por titulação.

### Função

Tabela:

- `funcao_verba`

Evidência observada:

- `0` associações

Leitura funcional:

- a estrutura existe;
- nesta massa, não há prova de verba determinada pela função.

### Vínculo

Tabela:

- `vinculo_verba`

Evidência observada:

- `0` associações

Leitura funcional:

- a estrutura existe;
- nesta massa, não há prova de verba vinculada diretamente ao tipo de vínculo.

### Categoria profissional

Tabela:

- `categoria_profissional_verba`

Evidência observada:

- `0` associações

Leitura funcional:

- a estrutura existe;
- nesta massa, não há prova de elegibilidade por categoria profissional.

## Encadeamento funcional que já pode ser inferido com segurança

Com base nos dados existentes, o desenho mínimo provado é:

1. a matrícula recebe uma verba individual básica em `funcionario_verba`
2. o cargo pode complementar a elegibilidade de verbas em `cargo_verba`
3. essas verbas entram no universo de cálculo da folha
4. o resultado final aparece em `folha_pagamento_funcionario_verba`

Exemplo funcional observado:

- todos os `16` funcionários têm `1000 | Salário` em `funcionario_verba`
- o único cargo povoado carrega `1101 | Vencimento` e `1107 | Adicional de Titulação e Aperfeiçoamento`
- no `rhlinkcon_motor`, a materialização final de julho/2019 mostra `Salário`, `Vencimento` e `INSS`

Leitura funcional:

- a verba individual define o núcleo mínimo por matrícula;
- o cargo amplia a cesta elegível;
- o motor de folha transforma essa elegibilidade em resultado por competência.

## O que esta massa permite inferir sobre o legado

- o legado separa claramente pessoa/matrícula de dimensões funcionais
- elegibilidade de verbas não depende apenas da matrícula
- cargo é um eixo funcional mais forte que função e vínculo nesta fotografia
- o banco do motor preserva uma visão mais fiel da transformação entre elegibilidade e resultado

## O que esta massa não permite provar

- regras reais de elegibilidade por função
- regras reais de elegibilidade por vínculo
- regras reais por categoria profissional
- efeito de lotação na composição de folha
- cenários com múltiplos vínculos, múltiplos cargos ou múltiplas funções

## Conclusão funcional

Nesta fotografia do SGP, a elegibilidade de verbas está distribuída em camadas:

- individual por matrícula
- estrutural por cargo
- estrutural potencial por função, vínculo e categoria profissional

A única camada estrutural realmente provada com dados é a de `cargo`. As demais existem no desenho, mas permanecem sem evidência operacional na massa restaurada.
