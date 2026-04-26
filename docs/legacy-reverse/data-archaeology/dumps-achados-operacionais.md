# Achados operacionais da massa restaurada

Este artefato traduz a leitura direta dos dumps restaurados em achados funcionais úteis para reconstrução e homologação.

## Síntese executiva

- A massa restaurada comprova a navegação funcional do produto em `99 menus`.
- A massa restaurada comprova parte do eixo `funcionário -> verba -> folha -> competência`.
- A massa restaurada não comprova operação real de perícia, previdência/recadastramento e requisição de pessoal.
- A massa restaurada não comprova autorização por perfil, nem parametrização viva por ambiente.

## Autorização realmente provada

### Estrutura

- `usuario`
- `papel`
- `usuario_papel`
- `menu`

### Dados efetivos

- `1` usuário ativo
- `1` papel
- `99` menus
- `99` menus sem papel explicitamente vinculado
- `1` papel sem vínculo direto com menu

Leitura funcional:

- a base prova a existência do catálogo de menus;
- a base não prova segmentação real de acesso por área, papel operacional ou perfil de negócio;
- a fotografia disponível é essencialmente administrativa.

Inferência:

- como o único papel encontrado é `ROLE_ADMIN`, a navegação real desta massa representa cobertura ampla de menus, não segregação operacional entre RH, folha, perícia, previdência e recrutamento.

## Navegação realmente materializada

### Categoria `GESTAO`

- `68` menus
- `67` ativos
- cobre cadastros estruturantes como `empresa filial`, `vínculos`, `verbas`, `tipo de folha`, `tipo de processamento`, `SEFIP`, `eSocial`, `usuários`, `lotação`, `cargo`, `função`, `regras de aposentadoria`

### Categoria `MODULO_RH`

- `20` menus
- cobre `funcionário`, `dependentes`, `dados cadastrais`, `licença médica`, `licença prêmio`, `pensão alimentícia`, `situação funcional`, `transferência`, `tempo de serviço`, `dossiê`, `frequência`, `férias`

### Categoria `FOLHA_PAGAMENTO`

- `7` menus
- cobre `folha de pgt`, `ficha financeira`, `verbas do funcionário`, `adiantamento salarial`, `rescisão contrato` e programação de adiantamento

### Categoria `RECRUTAMENTO_SELECAO`

- `2` menus
- cobre `requisição de pessoal` e `gestão de requisições`

### Categorias residuais

- `MODULO_AVALIACAO`: `1` menu
- `RELATORIO`: `1` menu

## Cobertura real por domínio

### Funcionário

Evidência provada:

- `16` funcionários
- `1` vínculo
- `1` cargo
- `1` função
- `0` lotações na restauração crua
- `0` dependentes
- `0` processos
- `0` tempos de serviço

Leitura funcional:

- o dump prova cadastro pessoal e funcional básico;
- também prova associação a vínculo, cargo e função;
- não prova a vida funcional completa nem o dossiê documental pleno.

Achado relevante:

- todos os `16` funcionários estão sem lotação na massa restaurada crua;
- `10` dos `16` funcionários estão sem cargo;
- nenhum está sem função.

### Folha de pagamento

Evidência provada em `rhlinkcon_20190701`:

- competências: maio/2019, junho/2019 e julho/2019
- junho/2019 com `1` folha e `10` lançamentos
- julho/2019 ainda sem lançamentos

Evidência provada em `rhlinkcon`:

- junho/2019 com `1` folha e `10` lançamentos
- julho/2019 com `1` folha e `10` lançamentos
- status observado: `DESBLOQUEADO`
- filial observada na folha: `F112`
- tipo de processamento observado: `Processamento Padrão`

Evidência provada em `rhlinkcon_motor`:

- junho/2019 com `1` folha sem lançamentos
- julho/2019 com `1` folha e `30` lançamentos

Leitura funcional:

- a sequência dos dumps mostra evolução real de carga da folha entre as datas;
- a competência é o eixo temporal;
- a folha é o agrupador de processamento;
- `folha_pagamento_funcionario_verba` é a materialização do resultado por matrícula e verba.

### Perícia médica e afastamentos

Evidência provada:

- superfície estrutural presente
- `licenca_medica = 0`
- `afastamento = 0`
- `causa_afastamento = 0`
- `motivo_afastamento = 0`

Leitura funcional:

- o domínio existe no esquema;
- a massa não prova atendimento, licença ou regulação executada.

### Previdenciário e aposentadoria

Evidência provada:

- `regra_aposentadoria = 0`
- não foram identificadas tabelas populadas de recadastramento no dump restaurado

Leitura funcional:

- o dump não sustenta prova operacional de recadastramento nem de previdência ativa;
- apenas a superfície estrutural pode ser confirmada parcialmente.

### Requisição de pessoal

Evidência provada:

- `requisicao_pessoal = 0`
- `requisicao_pessoal_candidato = 0`
- `requisicao_pessoal_funcao = 0`

Leitura funcional:

- a navegação existe;
- a massa não comprova pipeline real de seleção, candidatos nem banco de talentos.

## Qualidade e representatividade da massa

- `16` funcionários com apenas `7` CPFs distintos
- um mesmo CPF aparece `10` vezes
- foram observadas descrições e nomes com traço de massa sintética

Inferência:

- trata-se de base adequada para prova estrutural, smoke test funcional e comparação de evolução entre snapshots;
- não é base adequada para homologação final de paridade legal, previdenciária ou documental.

## O que esta massa já permite fazer

- provar rotas e categorias de menu realmente existentes no banco
- provar o desenho real de autorização disponível neste snapshot
- provar o encadeamento mínimo `funcionário -> verba -> folha -> competência`
- comparar evolução de carga entre `2019-07-01`, `2019-07-18` e `2019-07-23`

## O que esta massa ainda não permite fazer

- fechar matriz real de perfis e capacidades por área
- provar parâmetros vivos por ambiente
- provar saídas oficiais com valor jurídico-contábil
- homologar recadastramento, perícia e recrutamento com casos reais
