# Superfícies provadas vs não provadas nos dumps restaurados

Este artefato separa, de forma operacional, o que os dumps já comprovam e o que continua dependendo de base mais representativa, documentos emitidos ou ambiente vivo.

## Superfícies já provadas

### Navegação e catálogo funcional

- catálogo real de `99 menus`
- categorias funcionais reais:
  - `GESTAO`
  - `MODULO_RH`
  - `FOLHA_PAGAMENTO`
  - `RECRUTAMENTO_SELECAO`
  - `MODULO_AVALIACAO`
  - `RELATORIO`
- rotas reais de telas em banco, incluindo:
  - `funcionario`
  - `folhaPagamento`
  - `verbasFuncionario`
  - `licencaMedica`
  - `situacaoFuncional`
  - `transferenciaFuncionario`
  - `requisicaoPessoal`
  - `requisicaoPessoalGestao`
  - `esocial`

### Autorização mínima desta fotografia

- estrutura real `usuario -> usuario_papel -> papel`
- papel encontrado: `ROLE_ADMIN`
- ausência de `perfil`
- ausência de vínculo direto `papel -> menu` para os menus populados

Conclusão:

- a base prova cobertura administrativa ampla;
- não prova segregação real por perfil de negócio.

### Cadastro funcional básico

- existência real de `funcionario`
- vínculo com `cargo`, `funcao`, `vinculo`, `empresa_filial`
- massa mínima de `16` matrículas/servidores
- presença de dados de admissão, CPF, matrícula, filiação e vínculo funcional

### Folha e lançamentos

- existência real de `folha_competencia`
- existência real de `folha_pagamento`
- existência real de `folha_pagamento_funcionario_verba`
- existência real de `funcionario_verba`
- evolução entre snapshots:
  - `2019-07-01`: junho preenchido; julho vazio
  - `2019-07-23`: junho e julho preenchidos
  - `rhlinkcon_motor`: julho mais carregado que o banco principal

### Cadastros mestres mínimos

- `empresa_filial`
- `tipo_folha`
- `tipo_processamento`
- `cargo`
- `funcao`
- `vinculo`
- `verba`

## Superfícies só parcialmente provadas

### Funcionário

O dump prova:

- identidade cadastral básica
- vínculo, cargo e função
- alguma massa de verbas e folha por matrícula

O dump não prova:

- lotação real em uso
- dependentes
- processo funcional
- tempo de serviço
- dossiê documental completo

### Folha de pagamento

O dump prova:

- competência
- folha
- lançamentos por verba
- progressão temporal entre snapshots

O dump não prova:

- fechamento completo de competência
- relatórios oficiais emitidos
- memória de cálculo completa
- diversidade de tipos de folha e de processamento

### Navegação autorizada

O dump prova:

- menus cadastrados
- usuário administrativo
- papel administrativo

O dump não prova:

- papel por área
- perfil por unidade de negócio
- restrição de menu por função organizacional

## Superfícies não provadas por falta de dados

### Perícia médica e afastamentos

- `licenca_medica`
- `afastamento`
- `causa_afastamento`
- `motivo_afastamento`

Situação:

- estrutura existe;
- não há casos executados nesta massa.

### Previdenciário e recadastramento

- `regra_aposentadoria` sem dados
- não foram encontrados conjuntos populados que comprovem prova de vida, pensionista ou aposentado

Situação:

- domínio aparece mais no catálogo funcional do que em evidência operacional desta base.

### Requisição de pessoal

- `requisicao_pessoal`
- `requisicao_pessoal_candidato`
- `requisicao_pessoal_funcao`

Situação:

- menus existem;
- o processo seletivo não está materializado nos dumps.

## Restrições de representatividade

- só existe `1` usuário na massa
- só existe `1` papel na massa
- todos os menus ficam sem papel explicitamente associado
- `16` funcionários compartilham apenas `7` CPFs distintos
- um CPF aparece `10` vezes

Conclusão:

- a base é boa para leitura estrutural e para smoke test funcional;
- a base é fraca para homologação de paridade jurídica, previdenciária e documental.

## Uso recomendado desta evidência

- usar os dumps para provar estrutura, menu, encadeamento de folha e relacionamentos principais
- usar os dumps para comparar evolução entre snapshots
- não usar os dumps como única base de homologação final
- exigir uma base mais próxima de produção para fechar:
  - perfis reais
  - parâmetros vivos
  - saídas oficiais
  - jornadas completas de perícia, previdência e recrutamento
