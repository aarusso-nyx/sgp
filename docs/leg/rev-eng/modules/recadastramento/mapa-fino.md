# Recadastramento / Prova de Vida: mapa funcional fino

## Escopo e fontes

Este documento aprofunda exclusivamente o domínio de **recadastramento / prova de vida** do legado, com foco em aposentados e pensionistas.

Fontes priorizadas nesta leitura:

- `docs/01-visao-geral-legado.md`
- `docs/02-inventario-rotas-front.csv`
- `docs/03-inventario-endpoints-backend.csv`
- `rhClient/client/app/page/recadastramento/*`
- serviços, modelos e repositórios correlatos de recadastramento
- controladores correlatos de previdência e integrações públicas:
  - `ApiController`
  - `PensionistaController`
  - `DeclaracaoAposentadoriaController`
  - `DeclaracaoExServidorController`
  - `RegraAposentadoriaController`
  - `PensaoAlimenticiaController`
  - `CertidaoCompensacaoController`
  - `RelatorioDadosAposentadoPensionistaController`

## Finalidade funcional do domínio

A prova de vida opera como rotina periódica de **confirmação de existência, atualização cadastral e saneamento de dados previdenciários** de beneficiários vinculados ao módulo previdenciário.

No legado, o domínio acumula seis funções operacionais:

- identificar beneficiários com prova de vida em dia, vencida ou prestes a vencer;
- iniciar nova rodada de recadastramento a partir de uma gestão central;
- consolidar dados pessoais, endereço, contato e documentos comprobatórios;
- registrar tentativas de contato telefônico e observações operacionais;
- emitir comprovante individual e relatório consolidado;
- alimentar ou dialogar com integração pública voltada à prefeitura/portal externo.

## Atores envolvidos

- **Operador de prova de vida**: consulta a gestão, filtra beneficiários, inicia recadastramento, registra contato e emite relatórios.
- **Analista previdenciário**: atua na conferência do histórico, documentos e coerência cadastral de aposentados e pensionistas.
- **Aposentado**: beneficiário recadastrado pela jornada própria de aposentado.
- **Pensionista**: beneficiário recadastrado pela jornada própria de pensionista.
- **Pensionista universitário**: subtipo com regra específica de enquadramento e filtragem.
- **Usuário do sistema**: aparece como responsável por registros históricos e ligações.
- **Portal/integração pública da prefeitura**: consome autenticação, dados cadastrais, dependentes, endereço, imagem e apontamento de dados incorretos.

## Rotas, telas e pontos de entrada

Rotas funcionais detectadas:

- `/provaDeVida/gestao`
- `/provaDeVida/pensionista/formulario/:id`
- `/provaDeVida/pensionista/detalhes/:id/:detalhes`
- `/provaDeVida/aposentado/formulario/:id`
- `/provaDeVida/aposentado/detalhes/:id/:detalhes`
- `/provaDeVida/formulario/:id`
- `/provaDeVida/visualizar/:idFuncionario/:visualizar`

Leitura funcional do menu:

- o módulo aparece para o usuário como **Prova de Vida**;
- internamente, o domínio continua nomeado como **recadastramento**;
- a permissão de gestão identificada é `ROLE_RECADASTRAMENTO_GESTAO`, descrita como **Gerenciar Prova de Vida**.

## Filtros, estados e visão de gestão

### Filtros operacionais da listagem

Na gestão central, a tela trabalha com:

- busca por **recadastrante** com orientação de pesquisa por nome;
- filtro por **tipo**;
- filtro por **situação**;
- intervalo de **próximo recadastramento** inicial e final.

Valores de situação explicitamente oferecidos:

- `Recadastrado`
- `Não Recadastrado`
- `Perto de Vencer`

Tipos detectados no legado:

- `PENSIONISTA`
- `APOSENTADO`
- `PENSIONISTAUNIVERSITARIO`

Comportamento funcional relevante:

- a tela inicia com **Pensionista** como tipo pré-selecionado;
- a gestão separa pensionista universitário dos demais pensionistas;
- a listagem apresenta matrícula, nome, fundo/filial, último recadastramento, próximo recadastramento e situação.

### Regras de composição do estado

A situação funcional da prova de vida é derivada de `proximaData`:

- **Recadastrado**: quando a data atual ainda está antes da próxima prova de vida;
- **Perto de vencer**: quando faltam menos de 30 dias para a próxima prova de vida;
- **Não recadastrado**: quando a data atual ultrapassou a próxima prova de vida.

### Ações expostas na gestão

Para cada beneficiário, a gestão pode disponibilizar:

- **Detalhes**;
- **Recadastrar**;
- **Histórico de ligações**;
- **Comprovante**.

Regras de exposição detectadas:

- `Recadastrar` e `Histórico de ligações` dependem de permissão gerencial;
- `Comprovante` só aparece quando a situação exibida é **Recadastrado**;
- o detalhamento escolhe a jornada certa conforme exista `pensionista` ou `funcionario`.

## Jornada de gestão / listagem

### Fluxo operacional

1. O operador entra em **Prova de Vida > Gestão**.
2. Filtra por tipo de beneficiário, situação e janela de vencimento.
3. Analisa a fila de trabalho por matrícula, nome, fundo e datas.
4. Decide entre quatro ações principais:
   - consultar detalhes;
   - iniciar nova prova de vida;
   - registrar/consultar histórico de ligações;
   - emitir comprovante.
5. Se necessário, emite relatório consolidado em planilha.

### Sinais de intenção do legado

- a gestão foi desenhada como **fila operacional de campanha de prova de vida**;
- a classificação `Perto de Vencer` sugere uso preventivo para contato ativo;
- a presença do histórico de ligações evidencia trabalho de **busca ativa do beneficiário**;
- o recorte por pensionista universitário indica regra previdenciária própria, não apenas distinção cadastral.

## Jornada do aposentado

### Quando a jornada é aberta

A jornada é acionada pela gestão quando o item não possui pensionista associado e o sistema redireciona para:

- `/provaDeVida/aposentado/formulario/:id`

ou, em leitura:

- `/provaDeVida/aposentado/detalhes/:id/:detalhes`

### Blocos funcionais do formulário

O formulário do aposentado está organizado em três frentes:

- **Cadastro Atual / Recadastramento**
- **Anexos**
- **Histórico de recadastramento**

Dentro da aba principal, os blocos de informação são:

- **Dados Pessoais**
- **Endereço**
- **Contato**

Campos funcionais detectados:

- matrícula;
- nome;
- data de nascimento;
- filiação;
- UF e município de nascimento;
- gênero;
- estado civil;
- nacionalidade;
- raça/cor;
- tipo sanguíneo;
- escolaridade;
- CEP, UF, município, logradouro, bairro, número e complemento;
- e-mail e observação do endereço;
- telefones de endereço;
- nome, e-mail, observação e telefones de contato.

### Regras funcionais do aposentado

- no primeiro ciclo sem recadastramento anterior, a primeira prova de vida é posicionada em **6 meses após o início da situação funcional de aposentadoria**;
- após novo recadastramento, a próxima prova de vida passa a seguir a **anualidade pelo aniversário do beneficiário**;
- a gravação de um novo recadastramento **inativa os registros anteriores** do mesmo aposentado;
- o recadastramento atualiza também o cadastro-base do beneficiário, especialmente nome, filiação, endereço, e-mail e atributos pessoais.

### Intenção previdenciária detectada

O aposentado segue uma rotina de prova de vida com cadência anual, associada à data de nascimento, precedida por uma primeira janela semestral a partir da aposentadoria.

## Jornada do pensionista

### Quando a jornada é aberta

A jornada é acionada pela gestão quando o item possui pensionista associado e o sistema redireciona para:

- `/provaDeVida/pensionista/formulario/:id`

ou, em leitura:

- `/provaDeVida/pensionista/detalhes/:id/:detalhes`

### Blocos funcionais do formulário

A estrutura é equivalente à do aposentado, com a diferença de uma marcação adicional em dados pessoais:

- **Pensionista Universitário**

Além disso, o histórico final identifica explicitamente o beneficiário como pensionista.

### Regras funcionais do pensionista

- no primeiro ciclo sem recadastramento anterior, a primeira prova de vida é posicionada em **6 meses após a data do primeiro pagamento da pensão**;
- após cada novo recadastramento, a próxima prova de vida passa a vencer em **6 meses**;
- a gravação de um novo recadastramento **inativa os registros anteriores** do mesmo pensionista;
- o recadastramento atualiza dados do cadastro-base do pensionista, inclusive nome, filiação, gênero, nacionalidade, estado civil, endereço e marcação de universitário.

### Regra específica de pensionista universitário

O legado diferencia o pensionista universitário em consultas, filtros e composição de listas.

Regras detectadas:

- existe enumeração própria de resposta `Sim/Não` para universitário;
- pensionistas universitários entram em fila própria de gestão;
- há verificação de idade com mensagem: ao completar **25 anos**, o pensionista “não pode ser universitário”.

Observação funcional importante:

- a tela emite a advertência, mas o fluxo ainda prossegue para gravação; isso sugere **regra sinalizada, porém não necessariamente bloqueante** no legado.

## Jornada de contato e histórico de ligações

### Objetivo operacional

Esta jornada atende ao trabalho de **localização, cobrança e registro de tentativa de contato** com o beneficiário.

### Fluxo detectado

1. O operador aciona **Histórico de ligações** na gestão.
2. O sistema abre diálogo modal com:
   - matrícula;
   - nome do beneficiário;
   - telefones consolidados.
3. O operador registra uma **observação** da ligação.
4. O histórico é salvo e passa a compor a trilha operacional.

### Conteúdo do histórico

Cada ligação guarda:

- data da ligação;
- usuário do sistema;
- observação.

Regras funcionais detectadas:

- para pensionista, o histórico guarda pensionista e também vincula o funcionário originário da pensão;
- para aposentado, o histórico é vinculado ao funcionário, sem pensionista;
- a observação é obrigatória para inclusão;
- quando não há telefones, a tela devolve mensagem equivalente a **telefones não disponíveis**.

## Jornada documental

### Anexos da prova de vida

Cada recadastramento admite dossiê documental simples.

Ações detectadas:

- anexar documento;
- enviar upload;
- cancelar upload;
- remover arquivo da fila;
- baixar anexo já vinculado;
- remover anexo já gravado.

Regras documentais detectadas:

- o legado aceita **somente PDF**;
- não foi identificada classificação documental por espécie;
- os anexos aparecem com descrição, tamanho e ação de download/remoção;
- o dossiê é vinculado ao recadastramento, não a uma tabela documental temática por tipo de prova.

### Comprovante individual

A gestão permite emissão de **comprovante individual em PDF**.

Leitura funcional:

- o comprovante serve como recibo formal da prova de vida concluída;
- sua disponibilidade está condicionada a recadastramento considerado **válido/em dia**.

### Histórico formal do recadastramento

Na aba **Histórico de recadastramento**, o legado oferece:

- identificação do beneficiário;
- filtro por data do recadastramento;
- listagem de ocorrências;
- consulta de detalhes.

Campos exibidos no histórico:

- nome;
- usuário do sistema;
- data;
- ação de detalhes.

## Jornada de integração pública

### Escopo da integração

Existe API pública própria da prefeitura que reaproveita a base previdenciária para autenticação e atualização cadastral.

Famílias de ação públicas detectadas:

- **autenticação por CPF** do aposentado ou pensionista;
- consulta de **dependentes**;
- **alteração de endereço**;
- envio de **dados incorretos**;
- envio de **imagem/foto**.

### Ações públicas identificadas

`/api/publico/prefeitura/autenticacao`

- localiza o CPF informado;
- classifica o beneficiário como aposentado (`A`) ou pensionista (`P`);
- devolve dados gerais para abertura da jornada pública.

`/api/publico/prefeitura/dependente`

- devolve composição de dependentes do instituidor/beneficiário, com nome, CPF, sexo, nascimento, identidade e período.

`/api/publico/prefeitura/endereco`

- atualiza endereço e contato do aposentado ou pensionista na base principal;
- para aposentado, repercute também no portal do colaborador.

`/api/publico/prefeitura/incorretos`

- registra apontamento de dados incorretos informados pelo usuário externo.

`/api/publico/prefeitura/imagem`

- indica captura e anexação de imagem/foto para o processo de prova de vida.

### Leitura funcional da integração

O legado sinaliza uma segunda frente de prova de vida:

- **frente interna**, conduzida por operador na tela de gestão;
- **frente pública**, na qual o próprio beneficiário ou canal externo informa/atualiza dados.

## Relatórios e saídas gerenciais

### Relatório consolidado da prova de vida

Foi identificado relatório em planilha com título funcional de **Relatório de Prova de Vida**.

Filtros reproduzidos no relatório:

- nome;
- tipo;
- situação;
- período de próxima prova de vida.

Colunas consolidadas detectadas:

- nome;
- matrícula;
- situação;
- data de nascimento;
- data de concessão;
- próximo recadastramento;
- telefones.

### Relatórios previdenciários correlatos

O ecossistema previdenciário relacionado ao domínio também expõe:

- relatório de dados de aposentado e pensionista;
- declarações para aposentadoria;
- declaração de ex-servidor;
- certidão de compensação;
- regras de aposentadoria;
- pensão previdenciária e pensão alimentícia.

Esses módulos não executam a prova de vida, mas formam o **contexto documental e previdenciário** do mesmo público-alvo.

## Regras funcionais consolidadas detectadas

- a prova de vida distingue aposentado, pensionista e pensionista universitário;
- a gestão trabalha com fila por situação: recadastrado, não recadastrado e perto de vencer;
- `Perto de vencer` representa janela inferior a 30 dias;
- o primeiro recadastramento do aposentado nasce 6 meses após a aposentadoria;
- o primeiro recadastramento do pensionista nasce 6 meses após o primeiro pagamento da pensão;
- o aposentado, após recadastrado, entra em ciclo anual por aniversário;
- o pensionista, após recadastrado, entra em ciclo semestral;
- cada novo recadastramento substitui o anterior como registro ativo;
- o histórico de ligações é uma trilha operacional independente do histórico formal do recadastramento;
- a observação da ligação é obrigatória;
- anexos aceitos na jornada interna são somente PDF;
- o comprovante individual só é exposto para beneficiário considerado recadastrado;
- o recadastramento não é apenas declaratório: ele **retroalimenta o cadastro-base** de aposentado ou pensionista;
- o domínio admite integração pública para autenticação, revisão cadastral, dependentes e imagem;
- o legado prevê impacto potencial em bloqueio de pagamento por `RECADASTRAMENTO_PENDENTE`, mas a validação operacional foi neutralizada para permitir processamento da folha.

## Lacunas e Ambiguidades do Legado

- não foi localizado de forma explícita, nas fontes abertas nesta onda, o controlador Spring específico que publica a família `/recadastramento`; a existência funcional dos endpoints é inequívoca pelo front e pelos serviços, mas a camada REST concreta não apareceu neste recorte;
- a rota publicada no front usa `provaDeVida`, enquanto os serviços e APIs usam `recadastramento`;
- a jornada de histórico lista ocorrências antigas, porém a ação **Detalhes** reaponta para a tela do beneficiário por `id`, o que sugere possível abertura do **cadastro ativo atual**, e não necessariamente do snapshot histórico selecionado;
- o pensionista universitário recebe alerta de idade a partir de 25 anos, mas a rotina aparenta continuar para gravação, sem bloqueio inequívoco;
- não foi identificada taxonomia documental por tipo de comprovante ou exigência distinta por espécie de beneficiário;
- a integração pública de imagem sugere prova de vida com envio de foto, mas o tratamento encontrado é insuficiente para esclarecer o fluxo completo;
- existe indício de bloqueio previdenciário/financeiro por pendência de recadastramento, porém a checagem foi deliberadamente desativada “para que a folha rode”, o que enfraquece a leitura do comportamento real em produção;
- as rotas `/provaDeVida/formulario/:id` e `/provaDeVida/visualizar/:idFuncionario/:visualizar` aparecem publicadas, mas não ficou claro o papel delas na jornada principal de prova de vida.
