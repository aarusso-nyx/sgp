# Mapa fino do domínio Requisição de Pessoal / Recrutamento

## Escopo

Este documento aprofunda exclusivamente o domínio de **requisição de pessoal e recrutamento** do legado, incluindo:

- requisição de pessoal pelo solicitante;
- gestão de requisições pelo RH;
- composição da vaga por função;
- vinculação de candidatos e currículos;
- análise curricular;
- banco de talentos como frente correlata de recrutamento;
- estágio como trilha correlata de captação e contratação de estagiários.

O objetivo é descrever a **intenção funcional** do legado, as jornadas operacionais e as regras de negócio detectadas, sem discutir tecnologia alvo de refatoração.

## Fontes priorizadas

- `docs/01-visao-geral-legado.md`
- `docs/02-inventario-rotas-front.csv`
- `docs/03-inventario-endpoints-backend.csv`
- `rhClient/client/app/page/requisicaoPessoal/*`
- `rhClient/client/app/page/requisicaoPessoalGestao/*`
- `rhClient/client/app/page/bancoTalentos/*`
- `RequisicaoPessoalController`
- `RequisicaoPessoalGestaoController`
- `RequisicaoPessoalFuncaoController`
- `EstagioController`
- `ProgramaEstagioController`
- `EstagiarioController`
- `ProrrogacaoEstagioController`
- `RecessoEstagioController`
- `RelatorioRequisicaoPessoalController`

## Visão funcional do subdomínio

O legado modela recrutamento em duas camadas principais:

- **Camada de demanda interna**: abertura, tramitação e conclusão de requisições de pessoal.
- **Camada de atendimento pelo RH**: avaliação da requisição, definição de vaga/função, vinculação de candidatos, análise curricular e fechamento do processo.

Ao redor desse núcleo aparecem duas frentes correlatas:

- **Banco de Talentos**: catálogo de vagas e candidatos, com intenção de funcionar como reserva técnica ou funil contínuo.
- **Estágio**: trilha própria de captação/contratação de estagiários, ligada ao mesmo macrodomínio de recrutamento e seleção, mas com regras e cadastros específicos.

## Menu, submenus e navegação funcional

Categoria funcional detectada: **Recrutamento e Seleção**.

Submenus e telas identificados:

- `Requisições de Pessoal`
  - `/requisicaoPessoal/gestao`
  - `/requisicaoPessoal/formulario`
  - `/requisicaoPessoal/formulario/:id`
  - `/requisicaoPessoal/detalhes/:id/:detalhes`
  - `/requisicaoPessoal/analiseCurriculo/:id`
- `Gestão de Requisições`
  - `/requisicaoPessoalGestao/gestao`
  - `/requisicaoPessoalGestao/formulario`
  - `/requisicaoPessoalGestao/formulario/:id`
  - `/requisicaoPessoalGestao/detalhes/:id/:detalhes`
  - `/requisicaoPessoalGestao/cadastrarCurriculo/:id`
- `Banco de Talentos`
  - `/bancoTalentos`
  - `/bancoTalentos/formulario`
- trilha correlata de estágio
  - `/convenios/estagiario`
  - `/estagiario/procurarPessoa`
  - `/estagiario/formulario/:cpf`
  - `/estagiario/formulario/:matricula`
  - `/convenios/programa`
  - `/programa/formulario`
  - `/programa/formulario/:id`
  - `/relatorios/estagio`

## Atores do processo

### Solicitante

Gestor ou área demandante que abre a requisição, informa motivo, prazo e perfil da vaga, e acompanha o andamento do processo que ele próprio originou.

### RH / Recrutamento e Seleção

Equipe responsável por:

- receber requisições em processamento;
- aprovar ou rejeitar a demanda;
- ajustar dados da vaga durante a análise;
- vincular candidatos;
- conduzir análise curricular;
- concluir o atendimento da requisição.

### Candidato

Pessoa associada a uma requisição aprovada, com nome, comentário inicial, currículo em anexo e parecer curricular posterior.

### Gestor requisitante após atendimento

Recebe a devolutiva implícita do fechamento da análise curricular e acompanha o resultado do processo.

### Gestão de estágio

Equipe que opera programas de estágio, contratação, prorrogação, recesso, desligamento e relatórios, em uma trilha próxima ao recrutamento, porém separada.

## Objetos funcionais centrais

### Requisição de pessoal

Representa a demanda de provimento de vaga. Campos funcionais detectados:

- solicitante;
- situação;
- justificativa;
- data de entrada;
- data limite;
- motivo da solicitação;
- colaborador substituído, quando aplicável;
- data prevista de admissão;
- lista de funções/vagas associadas;
- lista de candidatos vinculados.

### Função requisitada

Cada requisição pode conter uma ou mais funções. Para cada função, o legado associa:

- função;
- tipo de contratação;
- quantidade de vagas;
- custo por vaga;
- turno;
- requisitos;
- cursos;
- habilidades;
- atividades.

### Candidato da requisição

Cada candidato vinculado a uma requisição possui:

- nome;
- comentário inicial;
- comentário da análise curricular;
- situação da análise;
- currículo em anexo;
- vínculo com a requisição.

### Programa de estágio

Objeto estruturante da trilha de estágio. Campos funcionais detectados:

- nome do programa;
- vigência;
- período máximo;
- número de renovações;
- número de candidatos por vaga;
- idade mínima;
- valor de bolsa;
- carga horária;
- relação de trabalho;
- anexo normativo.

## Estados e situações detectados

### Situação da requisição

Estados enumerados no legado:

- `Rascunho`
- `Aberto`
- `Em Processo`
- `Aprovado`
- `Rejeitado`
- `Cancelada`
- `Concluido`

Leitura funcional mais provável:

- `Aberto` parece existir como estado catalogado, mas a jornada efetiva do front opera principalmente com `Rascunho`, `Em Processo`, `Aprovado`, `Rejeitado`, `Cancelada` e `Concluido`.
- `Em Processo` representa a entrada formal na fila do RH.
- `Aprovado` habilita captação e vinculação de candidatos.
- `Concluido` representa encerramento após análise curricular.

### Situação da análise curricular do candidato

Estados enumerados:

- `Pendente`
- `Aprovado`
- `Reprovado`

## Filtros e critérios de triagem

### Lista do solicitante

Filtros detectados:

- processo ou situação;
- situação.

Critério adicional de negócio:

- usuário comum enxerga apenas requisições criadas por ele;
- administrador enxerga todas.

### Lista da gestão de RH

Intenção de filtro na tela:

- processo ou situação;
- situação.

Critério funcional real do backend:

- a fila de gestão traz apenas requisições nas situações:
  - `Em Processo`
  - `Aprovado`
  - `Rejeitado`

Isso indica uma **fila operacional do RH**, distinta da visão do solicitante.

### Banco de Talentos

Filtros de intenção funcional detectados:

- vaga;
- status;
- data de criação;
- nome, matrícula, vínculo ou CPF do candidato;
- situação funcional;
- vínculo.

### Relatórios gerenciais de recrutamento e seleção

Filtros detectados:

- tipo de saída: relatório ou gráfico;
- tipo de relatório: sintético ou analítico;
- período inicial;
- período final;
- processo ou termo;
- concluído antes;
- concluído no limite;
- concluído depois;
- todos os processos;
- tempo de atendimento da vaga;
- vagas abertas;
- efetivos após contrato de experiência.

### Relatórios de estágio

Filtros detectados:

- tipo de relatório;
- período;
- estagiário;
- programa de estágio;
- situação funcional;
- filial;
- instituição de ensino;
- nome do curso.

## Dependências funcionais com cargo, função e turno

### Função

A requisição depende fortemente do cadastro de função. A função carrega o perfil objetivo da vaga, incluindo:

- requisitos comparativos;
- cursos exigidos ou desejáveis;
- habilidades;
- atividades.

Isso mostra que o legado trata a **função** como espinha dorsal do alinhamento entre demanda interna e triagem de candidatos.

### Tipo de contratação

Cada função da requisição exige classificação do vínculo pretendido:

- estagiário;
- funcionário;
- temporário;
- terceirizado.

O tipo de contratação participa da definição da vaga e da estratégia de recrutamento.

### Turno

Cada função vinculada à requisição exige um turno. O turno é exibido com:

- jornada;
- faixa horária;
- intervalo.

No domínio, o turno funciona como restrição operacional da vaga e critério de aderência do candidato.

### Cargo e vínculo no estágio

Na trilha de estágio, o legado força enquadramentos funcionais específicos:

- vínculo de estágio;
- cargo de estagiário;
- situação funcional ativa na contratação;
- situação funcional de desligamento ao encerrar o estágio.

## Jornada do solicitante

### 1. Abertura da requisição

O solicitante inicia em `Requisições de Pessoal` e abre uma nova requisição.

Dados principais informados:

- nome do solicitante;
- data de entrada;
- data limite;
- justificativa;
- data prevista de admissão;
- motivo da solicitação.

O motivo da solicitação possui dois caminhos:

- `Aumento de Quadro`
- `Substituição`

Quando a solicitação é por substituição, passa a ser exigida a indicação do colaborador substituído.

### 2. Composição da vaga

Na mesma jornada, o solicitante detalha a demanda por função.

Para cada função, informa:

- função;
- tipo de contratação;
- custo por vaga;
- quantidade de vagas;
- turno.

Ao selecionar a função, o sistema expõe o perfil da vaga já parametrizado:

- requisitos;
- cursos;
- habilidades;
- atividades.

Isso sugere que o solicitante não desenha o perfil do zero; ele **seleciona uma função parametrizada** e a usa como base da vaga.

### 3. Salvamento e manutenção

Após montar a requisição, o solicitante pode:

- salvar;
- editar enquanto estiver em `Rascunho`;
- excluir enquanto estiver em `Rascunho`.

### 4. Encaminhamento para aprovação

Da listagem, o solicitante pode encaminhar a requisição para aprovação.

Efeito funcional:

- a situação é alterada para `Em Processo`;
- a demanda entra na fila operacional do RH;
- há notificação por e-mail ao solicitante nas transições relevantes detectadas no backend.

### 5. Acompanhamento

Na listagem do solicitante, ele acompanha:

- número do processo;
- situação;
- requisitante;
- data limite.

O legado destaca visualmente requisições cuja data limite esteja a menos de 10 dias do vencimento.

### 6. Pós-decisão

Conforme a atuação do RH, a requisição pode:

- ser rejeitada;
- ser aprovada e seguir para captação de candidatos;
- ser concluída após análise curricular;
- ser cancelada enquanto em processo.

## Jornada da gestão de RH

### 1. Recebimento da fila de trabalho

O RH acessa `Gestão de Requisições`, que opera como uma esteira de atendimento.

A fila concentra, no mínimo:

- requisições em análise;
- requisições aprovadas;
- requisições rejeitadas.

### 2. Consulta do pedido

Na visão de detalhes para aprovação, o RH consulta:

- responsável do RH logado;
- situação;
- processo;
- nome do solicitante;
- filial;
- lotação;
- datas do processo;
- justificativa;
- funções requisitadas e seus perfis.

### 3. Validação do perfil requisitado

O RH analisa por função:

- quantidade de vagas;
- custo por vaga;
- turno;
- tipo de contratação;
- requisitos;
- cursos;
- habilidades;
- atividades.

Há sinais de que o RH pode ajustar campos da função antes da decisão final, especialmente em `Em Processo`.

### 4. Deliberação

Enquanto a requisição estiver em `Em Processo`, a gestão pode:

- aprovar;
- rejeitar;
- entrar em modo de edição.

Efeito funcional da aprovação:

- a requisição passa a `Aprovado`;
- a jornada de vinculação de candidatos fica disponível.

Efeito funcional da rejeição:

- a requisição passa a `Rejeitado`;
- o processo é devolvido sem abertura de captação.

### 5. Encaminhamento para captação

Somente requisições aprovadas expõem a ação de **vincular candidatos**.

Isso mostra um gate funcional claro:

- primeiro aprova a demanda;
- depois se inicia o funil de candidatos.

## Jornada de cadastro de candidato e currículo

### 1. Acesso à requisição aprovada

O RH entra na tela `Vincular Currículo de Candidatos ao Processo` a partir de uma requisição `Aprovado`.

### 2. Inclusão de candidato

Para cada candidato, o RH informa:

- nome do candidato;
- comentário inicial;
- currículo em anexo.

O currículo é tratado como documento obrigatório do processo.

### 3. Registro do currículo

O anexo é associado à pasta de requisição de pessoal e depois vinculado ao candidato da requisição.

Estado inicial detectado do candidato:

- `Pendente`

### 4. Manutenção da lista

Na mesma tela, o RH consulta os candidatos já vinculados ao processo, com:

- nome;
- comentário;
- situação;
- download do currículo;
- remoção do candidato.

### 5. Papel funcional do comentário inicial

O comentário inicial parece funcionar como contextualização de sourcing, triagem prévia ou observação operacional do RH antes da análise curricular formal.

## Jornada de análise curricular

### 1. Acesso à análise

A ação de `Analisar Currículos` aparece para requisições:

- `Aprovado`
- `Concluido`

O acesso é feito pelo número do processo.

### 2. Lista de candidatos selecionados pelo RH

A tela apresenta os candidatos já vinculados à requisição com:

- nome;
- download do currículo;
- ação de aprovar;
- ação de reprovar.

### 3. Parecer individual

Ao aprovar ou reprovar, o avaliador informa um comentário sobre a decisão curricular.

O parecer individual altera a situação do candidato para:

- `Aprovado`
- `Reprovado`

### 4. Fechamento da análise

A intenção funcional do legado é concluir a análise curricular e devolver a requisição para o RH/solicitante como processo encerrado.

Resultado esperado:

- a requisição passa para `Concluido`;
- o solicitante recebe notificação de que a análise curricular foi realizada.

### 5. Critérios de decisão identificáveis

Os critérios não aparecem como motor automatizado. O legado sugere decisão humana orientada por:

- aderência aos requisitos da função;
- formação;
- experiência;
- habilidades;
- comentário do avaliador;
- compatibilidade com a vaga/turno.

Não há evidência, nesse fluxo, de score automático obrigatório.

## Jornada de banco de talentos

### Papel funcional pretendido

O Banco de Talentos parece desenhado para servir como:

- vitrine de vagas abertas;
- consulta de candidatos já conhecidos;
- reserva de perfis para futuras vagas.

### Aba de vagas

Aba com intenção de listar:

- vaga;
- data de criação;
- status;
- quantidade de vagas.

Há ação para detalhar a vaga e visualizar candidatos associados.

### Aba de candidatos

Aba com intenção de listar:

- matrícula;
- nome;
- vaga;
- vínculo;
- filial.

Há acesso ao formulário do candidato.

### Detalhamento do candidato

O formulário do candidato indica intenção de manter um dossiê ampliado, incluindo:

- dados pessoais e contatos;
- histórico profissional;
- educação e qualificações;
- habilidades;
- idiomas;
- certificações;
- cursos adicionais;
- portfólio ou links;
- currículo.

Também há intenção de decidir:

- selecionar;
- reprovar.

### Leitura funcional do legado

O Banco de Talentos existe como conceito de produto dentro de recrutamento, mas os indícios apontam baixa integração operacional com a esteira principal de requisição de pessoal. Ele parece mais próximo de uma **frente planejada ou parcialmente prototipada** do que de uma operação plenamente conectada ao processo formal da requisição.

## Jornada de estágio associada ao recrutamento

### 1. Estruturação do programa

Antes da contratação de estagiários, o legado prevê cadastro e manutenção de programa de estágio com regras como:

- vigência;
- duração máxima;
- número de renovações;
- número de candidatos por vaga;
- idade mínima;
- bolsa;
- carga horária;
- relação de trabalho.

### 2. Captação e identificação do estagiário

Há jornada específica para localizar a pessoa e abrir o cadastro de estágio por:

- CPF;
- matrícula;
- busca de pessoa.

Isso sugere que o estágio parte de uma pessoa previamente localizada e depois é formalizado como vínculo funcional.

### 3. Contratação do estágio

Na contratação do estágio, o legado exige dependências estruturais:

- funcionário/pessoa base;
- programa de estágio;
- filial;
- lotação;
- instituição de ensino;
- curso;
- turno/jornada;
- centro de custo;
- dados bancários;
- relação de trabalho;
- carga horária;
- indicação de PNE;
- observações.

### 4. Controle da vida do estágio

Após contratado, o estágio possui trilhas próprias de:

- prorrogação;
- recesso;
- desligamento.

### 5. Relatórios de estágio

O domínio possui relatórios específicos para:

- contratação;
- prorrogação;
- desligamento;
- recesso;
- situação;
- valores;
- filial.

Esses relatórios podem ser visualizados em tela e exportados em Excel ou PDF.

### 6. Relação com recrutamento

Funcionalmente, o estágio atua como uma trilha paralela de provimento de pessoal com regras próprias. O ponto de interseção com recrutamento está em:

- captação de candidatos;
- definição de programa/vaga;
- triagem de perfil;
- formalização de ingresso.

## Saídas e artefatos gerados pelo domínio

### Operacionais

- processo de requisição de pessoal;
- lista de funções por requisição;
- lista de candidatos por requisição;
- comentários de triagem e de análise curricular;
- currículos anexados ao processo;
- notificações por e-mail em eventos da requisição.

### Gerenciais

- relatório de recrutamento e seleção;
- gráficos de desempenho da fila;
- métricas de atendimento da vaga;
- relatórios de estágio por contratação, prorrogação, desligamento, recesso, situação, valores e filial.

## APIs e ações de negócio mapeadas

### Requisição de pessoal

- `GET /api/requisicoesDePessoal`
  - listar requisições do solicitante ou de toda a base, conforme perfil
- `POST /api/requisicaoPessoal`
  - criar requisição
- `PUT /api/requisicaoPessoal`
  - atualizar requisição
- `GET /api/requisicaoPessoal/{id}`
  - consultar requisição
- `DELETE /api/requisicaoPessoal/{id}`
  - excluir requisição
- `PUT /api/requisicaoPessoal/alterar/{id}`
  - alterar situação da requisição

### Funções da requisição

- `GET /api/requisicoesDePessoalFuncoes/{requisicaoPessoalId}`
  - listar funções da requisição
- `DELETE /api/requisicaoDePessoalFuncao/{id}`
  - remover função da requisição

### Gestão de requisições

- `GET /api/requisicoesDePessoalGestao`
  - listar fila de gestão do RH
- `GET /api/requisicaoPessoalGestao/{id}`
  - consultar requisição na visão da gestão
- `PUT /api/requisicaoPessoalGestao`
  - atualizar requisição na visão do RH
- `PUT /api/requisicaoPessoalGestao/alterar/{id}`
  - alterar situação na fila de gestão

### Candidatos e currículos

- `GET /api/requisicaoPessoalGestao/candidatos/{id}`
  - listar candidatos vinculados à requisição
- `POST /api/requisicaoPessoalGestao/candidato`
  - cadastrar candidato da requisição
- `DELETE /api/requisicaoPessoalGestao/candidato/delete/{id}`
  - remover candidato
- `POST /api/anexo/requisicaoPessoalCurriculo`
  - subir currículo para o processo
- `PUT /api/anexo`
  - atualizar metadado do anexo

### Análise curricular

- `GET /api/requisicaoPessoal/analiseCurriculo/candidatos/{id}`
  - carregar candidatos da análise
- `PUT /api/requisicaoPessoal/analiseCurriculo/aprovar`
  - aprovar candidato
- `PUT /api/requisicaoPessoal/analiseCurriculo/reprovar`
  - reprovar candidato
- `PUT /api/requisicaoPessoal/analiseCurriculo/concluir`
  - concluir análise curricular e encerrar a requisição

### Cadastros de apoio usados pelo recrutamento

- `GET /api/funcionario/searchNomeOrMatricula`
  - localizar solicitante ou substituído
- `GET /api/listaFuncoes`
  - listar funções parametrizadas
- `GET /api/listaTurnos`
  - listar turnos disponíveis
- `GET /api/lotacao/{lotacaoId}`
  - consultar lotação do solicitante

### Relatórios de recrutamento

- `POST /api/relatorio/requisicaoPessoal`
  - gerar dados do relatório
- `POST /api/relatorio/requisicaoPessoal/grafico`
  - gerar dados para gráfico

### Trilhas de estágio correlatas

- `GET /api/estagiarios`
  - listar estagiários
- `GET /api/estagiarios/{cpf}`
  - consultar estagiário
- `POST /api/estagios`
  - contratar estágio
- `GET /api/estagios/{funcionarioId}`
  - consultar estágio
- `PUT /api/estagios/{id}`
  - atualizar estágio
- `PUT /api/estagios/desligamento/{id}`
  - desligar estágio
- `GET /api/estagios/busca-rapida`
  - localizar estagiário
- `POST /api/prorrogacoes`
  - registrar prorrogação
- `GET /api/prorrogacoes/{estagioId}`
  - listar prorrogações
- `DELETE /api/prorrogacoes/{id}`
  - excluir prorrogação
- `POST /api/recessos`
  - registrar recesso
- `GET /api/recessos/{estagioId}`
  - listar recessos
- `DELETE /api/recessos/{id}`
  - excluir recesso
- `GET /api/programas`
  - listar programas de estágio
- `POST /api/programas`
  - criar programa
- `PUT /api/programas/{id}`
  - atualizar programa
- `DELETE /api/programas/{id}`
  - excluir programa
- `GET /api/programas/listProgramasDto`
  - listar programas em formato reduzido

## Regras funcionais detectadas

### Regras da requisição

- o solicitante é obrigatório;
- justificativa é obrigatória;
- data de entrada é obrigatória;
- data limite é obrigatória;
- motivo da solicitação é obrigatório;
- data prevista de admissão é obrigatória;
- a requisição deve possuir ao menos uma função para ser salva de forma útil na jornada do front;
- não é permitido repetir a mesma função dentro da mesma requisição na montagem em tela;
- substituição exige indicação do colaborador substituído;
- somente requisições em `Rascunho` podem ser editadas ou excluídas pelo solicitante;
- somente requisições em `Em Processo` podem ser canceladas pelo solicitante;
- o RH trabalha prioritariamente com requisições em `Em Processo`, `Aprovado` e `Rejeitado`;
- o envio para aprovação altera a situação da requisição para `Em Processo`;
- alterações de situação disparam comunicação por e-mail ao solicitante.

### Regras das funções da vaga

- cada função exige tipo de contratação;
- cada função exige quantidade de vagas;
- cada função exige custo por vaga;
- cada função exige turno;
- o perfil da função reutiliza parametrizações de requisitos, cursos, habilidades e atividades.

### Regras dos candidatos

- o candidato da requisição nasce com situação `Pendente`;
- o currículo é vinculado como anexo do processo;
- o RH pode remover candidato da requisição;
- ao remover candidato, o anexo do currículo também é removido.

### Regras da análise curricular

- a análise é feita candidato a candidato;
- cada decisão pode receber comentário;
- a situação do candidato passa para `Aprovado` ou `Reprovado`;
- a conclusão da análise encerra a requisição como `Concluido`;
- após a conclusão, há comunicação ao solicitante de que a análise curricular foi realizada.

### Regras do estágio correlato

- a contratação de estágio depende de programa de estágio válido;
- o vínculo acumulado do estagiário no mesmo programa não pode ultrapassar dois anos;
- o estágio depende de filial, lotação, jornada, centro de custo, agência e dados bancários;
- o desligamento do estágio troca a situação funcional para desligamento;
- no desligamento, verbas ativas do estagiário são inativadas;
- há automação para desligar estágios ao chegar à data final;
- relatórios de estágio têm limite máximo de registros para exportação;
- relatório de recesso utiliza fonte de dados específica, distinta dos demais relatórios de estágio.

## Diagnóstico funcional do domínio

O domínio de requisição de pessoal está relativamente bem delimitado como um fluxo de **demanda interna -> validação do RH -> captação -> análise curricular -> encerramento**.

Os elementos mais maduros do legado são:

- abertura e tramitação da requisição;
- modelagem da vaga por função;
- fila de gestão do RH;
- vinculação manual de candidatos com currículo;
- análise curricular com parecer individual;
- relatórios gerenciais de recrutamento;
- trilha de estágio com regras próprias de contratação e permanência.

Os elementos menos maduros, ou menos integrados, são:

- Banco de Talentos como estoque vivo de candidatos;
- conexão explícita entre banco de talentos e requisição aprovada;
- automatização de ranking ou aderência curricular;
- rastreabilidade clara entre candidato aprovado e admissão efetiva.

## Lacunas e Ambiguidades do Legado

- A tela de análise curricular indica conclusão com texto "Concluir e enviar para o RH", mas o backend modela a conclusão como encerramento da requisição em `Concluido`, sem um estágio intermediário explícito.
- O front de análise curricular chama `'/requisicaoPessoal/analisarCurriculo'`, enquanto o backend expõe `PUT /api/requisicaoPessoal/analiseCurriculo/concluir`. A intenção funcional é clara, mas o contrato legado aparece inconsistente.
- A tela de gestão do RH envia filtros de processo e situação, porém o endpoint de gestão identificado não recebe esses filtros. Funcionalmente, a fila existe, mas o refinamento de busca parece incompleto ou inconsistente.
- O Banco de Talentos aparenta operar com dados demonstrativos/estáticos e não mostra integração inequívoca com as requisições aprovadas. A intenção funcional existe, mas sua operacionalização no legado é ambígua.
- O formulário detalhado do candidato no Banco de Talentos sugere um cadastro curricular robusto, porém não foram detectados endpoints equivalentes que sustentem todo esse dossiê no mesmo subdomínio.
- O enum de situação da requisição contém `Aberto`, mas a jornada principal do front trabalha sobretudo com `Rascunho`, `Em Processo`, `Aprovado`, `Rejeitado`, `Cancelada` e `Concluido`. O papel operacional de `Aberto` permanece indefinido.
- O módulo `Gestão de Requisições` usa, em vários pontos, a mesma permissão-base de `REQUISICAO_DE_PESSOAL`, embora existam papéis nominais distintos para gestão. Isso dificulta distinguir, só pelo legado, a fronteira exata entre visão do solicitante e visão do RH.
- Os relatórios de recrutamento trazem indicadores como tempo de atendimento da vaga, vagas abertas e efetivação após contrato de experiência, mas a ligação completa entre essas métricas e eventos transacionais do funil não fica totalmente transparente apenas pelos artefatos analisados.
