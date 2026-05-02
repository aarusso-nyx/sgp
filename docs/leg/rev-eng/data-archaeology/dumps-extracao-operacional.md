# Extração operacional dos dumps SQL Server

Este artefato registra a primeira extração operacional feita diretamente dos arquivos `db/*.bak`, já restaurados em instância temporária de SQL Server para leitura estruturada.

## Escopo desta extração

- Fonte: `db/20190701.bak`, `db/20190718.bak`, `db/20190723.bak`
- Forma de leitura: restauração controlada em container temporário SQL Server compatível com `arm64`
- Natureza da evidência: leitura de `dump cru`, sem aplicar `populate.sql`

## Bancos efetivamente restaurados

- `20190701.bak` -> `rhlinkcon_20190701`
- `20190718.bak` -> `rhlinkcon_motor`
- `20190723.bak` -> `rhlinkcon`

## Confirmações objetivas

- Os 3 arquivos são backups válidos de Microsoft SQL Server.
- Os 3 arquivos puderam ser lidos por `RESTORE HEADERONLY` e `RESTORE FILELISTONLY`.
- Os 3 arquivos puderam ser restaurados com sucesso em banco consultável.
- Todos os bancos restaurados ficaram com `compatibility_level = 130`.
- Cada base restaurada possui `151 tabelas`.

## Leitura estrutural já provada

- Existe catálogo real de `menu`, `usuario`, `papel` e `usuario_papel`.
- Existe superfície real de `funcionario`, `folha_competencia`, `folha_pagamento`, `folha_pagamento_funcionario_verba`, `verba`, `cargo`, `funcao`, `vinculo` e `empresa_filial`.
- Existe superfície estrutural para `licenca_medica`, `afastamento`, `regra_aposentadoria` e `requisicao_pessoal`, mas sem dados relevantes neste snapshot.

## Modelo de autorização realmente presente no dump

O desenho encontrado nesta base restaurada é mais antigo e mais enxuto do que o modelo descrito no checkout atual.

- Tabelas presentes: `usuario`, `papel`, `usuario_papel`, `menu`
- Tabelas ausentes: `perfil`, `parametro_global`, `parametro_sistema`
- Vínculos efetivos encontrados:
  - `usuario_papel.usuario_id -> usuario.id`
  - `usuario_papel.papel_id -> papel.id`
  - `papel.id_menu -> menu.id`

## Evidência funcional de autorização

- Há `1 usuário` ativo no dump.
- Há `1 papel`, com nome `ROLE_ADMIN`.
- Há `99 menus`.
- O único papel encontrado está sem vínculo direto com menu (`id_menu` nulo).
- Todos os `99 menus` estão sem papel vinculado na própria base.

Inferência: nesta fotografia, a exposição funcional da navegação não pode ser provada por matriz real `perfil -> papel -> menu`, porque o dump contém apenas um usuário administrador e não contém a camada de perfil presente no legado mais novo.

## Evidência funcional por domínio

### Funcionário

- `16` registros em `funcionario`
- `1` cargo
- `1` função
- `1` vínculo
- `0` lotações na massa restaurada crua
- `0` dependentes
- `0` processos
- `0` tempos de serviço

Inferência: a base serve para provar a estrutura do cadastro funcional e alguns relacionamentos principais, mas não cobre a vida funcional completa.

### Folha de pagamento

- `3` competências de folha
- `1` folha processada em `rhlinkcon_20190701`
- `2` folhas processadas em `rhlinkcon`
- `2` folhas processadas em `rhlinkcon_motor`
- Lançamentos por competência:
  - `rhlinkcon_20190701`: junho/2019 com `10` lançamentos; julho/2019 ainda vazio
  - `rhlinkcon`: junho/2019 com `10` lançamentos e julho/2019 com `10` lançamentos
  - `rhlinkcon_motor`: junho/2019 sem lançamento e julho/2019 com `30` lançamentos

Inferência: os dumps são úteis para reconstruir a evolução da folha entre snapshots e para provar o desenho de competência, folha e lançamentos, mas não representam uma operação plena de produção.

### Perícia médica, previdenciário e requisição

- `licenca_medica`: `0`
- `afastamento`: `0`
- `regra_aposentadoria`: `0`
- `requisicao_pessoal`: `0`
- `requisicao_pessoal_candidato`: `0`
- `requisicao_pessoal_funcao`: `0`

Conclusão funcional: nesses domínios, o dump prova a existência da superfície de dados, mas não prova jornadas reais executadas.

## Qualidade da massa restaurada

- O dump contém sinais fortes de massa de desenvolvimento ou demonstração.
- Em `funcionario`, há `16` registros, mas apenas `7 CPFs distintos`.
- O CPF mais repetido aparece `10 vezes`.
- Também foram observados nomes e descrições com aparência de dados sintéticos e não institucionais.

Inferência: esta massa é adequada para leitura estrutural e para provar alguns encadeamentos funcionais, mas não pode ser tratada como fotografia fiel de operação real de um órgão público em produção.

## Limites que continuam abertos

- Não foi provada matriz real de perfis, porque `perfil` não existe neste dump.
- Não foram provados parâmetros vivos, porque tabelas `parametro_*` não existem nesta base.
- Não foram provadas saídas oficiais reais emitidas a partir desta massa.
- Não foram provadas jornadas completas de recadastramento, perícia e requisição por falta de dados operacionais nessas tabelas.

## Resultado desta onda

Esta extração já permite sair de hipótese para evidência em três frentes:

- prova de leitura real dos `.bak`
- prova do desenho real de navegação e autorização presente no dump
- prova de que a massa disponível é parcial, antiga e com forte característica de desenvolvimento

O próximo passo operacional recomendado é extrair o máximo do que esta massa realmente suporta:

- inventário real de menus
- matriz real `usuario -> papel -> menu` desta foto
- comparativo temporal entre os três dumps
- inventário de superfícies com e sem dados por domínio
