# Documentos e tabelas relacionadas ao eixo da folha

Este artefato separa as tabelas que participam diretamente da cadeia de folha daquelas que apenas tangenciam o tema documental ou de suporte.

## Tabelas que participam diretamente da cadeia

- `funcionario`
- `funcionario_verba`
- `cargo_verba`
- `folha_competencia`
- `folha_pagamento`
- `folha_pagamento_funcionario_verba`
- `verba`
- `verba_formula`
- `atributo_formula`
- `tipo_processamento`
- `tipo_folha_verbas` no banco do motor

Leitura funcional:

- essas tabelas explicam quem entra na folha, com quais verbas, em qual competência e com qual resultado materializado.

## Tabelas documentais e genéricas encontradas

### `modelo_documento`

Evidência:

- `1` registro em `rhlinkcon`
- conteúdo observado com texto HTML genérico de teste

Leitura funcional:

- a tabela existe como repositório genérico de modelos textuais;
- nesta massa, ela não prova documento oficial de folha, contracheque ou ficha financeira persistidos.

### `anexo`

Evidência:

- `1` registro em `rhlinkcon`
- arquivo observado:
  - PDF genérico com rota de download pública de anexo

Leitura funcional:

- a tabela funciona como repositório genérico de arquivos;
- nesta massa, o anexo não aparece conectado ao eixo da folha.

### `funcionario_anexo`

Evidência:

- `0` registros

Leitura funcional:

- a estrutura existe para vincular anexo à matrícula;
- o dump não prova uso efetivo.

### `anexo_processo`

Evidência:

- `0` registros

Leitura funcional:

- a estrutura existe para anexos do processo funcional;
- não há materialização nesta massa.

## Tabelas nominais que não comprovam documento de folha

### `recisao_contrato`

Evidência:

- tabela existe
- `0` registros

Leitura funcional:

- nesta massa, não há evidência de documento ou processamento de rescisão executado.

### Ausências relevantes

Não foi encontrada tabela persistida que materialize explicitamente:

- contracheque
- holerite
- ficha financeira em tabela própria
- PDF de folha
- relatório de folha persistido

Inferência:

- as saídas de folha deste produto tendem a ser geradas em runtime por serviço/relatório, e não armazenadas como documento persistido em tabela específica, pelo menos nesta fotografia do banco.

## Leitura consolidada

Para o eixo `funcionário -> verba -> folha -> competência`, os dumps provam muito melhor o encadeamento transacional e de cálculo do que o lado documental.

O que está provado:

- cadastro funcional
- atribuição de verba
- competência
- folha
- resultado por verba e matrícula
- fórmulas de cálculo

O que não está provado:

- emissão persistida de contracheque
- ficha financeira persistida
- anexo funcional conectado à folha
- lastro documental de fechamento
