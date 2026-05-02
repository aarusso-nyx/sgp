# Mapa fino do domínio Perícia Médica / Saúde Ocupacional

## Recorte e leitura funcional

Este domínio concentra a operação de **saúde ocupacional**, **agenda médica**, **agendamento pericial**, **prontuário pericial**, **fila de validação** e **licença médica**.

A leitura funcional do legado indica duas linhas operacionais parcialmente sobrepostas:

1. **Linha agenda ocupacional**
   Agenda médica do perito, reserva de horário, painel de agendados e abertura de prontuário/laudo de licença.
2. **Linha prontuário pericial clássico**
   Atendimento pericial, preenchimento de laudo, envio para validação, aprovação/reprovação e emissão do laudo.

Na prática, o domínio se comporta como uma esteira de junta médica:

1. parametrizar especialidade, médico e agenda;
2. reservar vaga por especialidade e servidor;
3. realizar atendimento/perícia;
4. deliberar afastamento, readaptação, restrição ou aposentadoria;
5. validar tecnicamente o laudo;
6. emitir documentos e manter o histórico ocupacional.

## Posição na navegação do legado

Pelo [docs/01-visao-geral-legado.md](/Users/aarusso/Downloads/interno-rh/docs/01-visao-geral-legado.md), o domínio fica sob **Area de Saúde**.

Submenus e entradas de navegação detectados:

| Entrada funcional | Rotas principais | Papel funcional percebido |
| --- | --- | --- |
| Especialidade Médica | `/especialidadeMedica/gestao`, `/formulario`, `/detalhes/:id/:detalhes` | Parametrizar catálogo clínico |
| Médicos | `/medico/gestao`, `/formulario`, `/detalhes/:id/:detalhes` | Parametrizar corpo médico/pericial |
| Agenda Médica | `/agendaMedica/gestao`, `/formulario`, `/detalhes/:id/:detalhes`, `/relatorio` | Montar agenda de atendimentos por médico e especialidade |
| Agenda de Perícia Médica | `/periciaMedica/agendamento/gestao`, `/formulario`, `/detalhes/:id/:detalhes` | Reservar vagas periciais |
| Atendimento de Agendados | `/periciaMedica/atendimentoAgendados/gestao` | Painel diário do médico/gestor |
| Prontuário Perícia Médica | `/periciaMedica/atendimento/gestao`, `/formulario/:id`, `/detalhes/:id/:detalhes` | Atendimento pericial, laudo e validação |
| Licença Médica | `/licencaMedica/gestao`, `/formulario/:funcionarioId/:licencaMedicaId/:detalhes`, `/detalhes/:id/:detalhes`, `/renovacao/:licencaMedicaId`, `/procurarPessoa` | Registro do prontuário/laudo ocupacional e afastamento |

## Atores do domínio

| Ator | Atuação funcional |
| --- | --- |
| Servidor periciado | Sujeito da perícia, licença ou readaptação |
| Equipe administrativa da saúde | Agenda vagas, filtra agendas, acompanha filas e abre fluxos |
| Médico perito clínico geral | Executa perícia, delibera conduta, propõe reagendamento ou especialista |
| Médico especialista | Atende casos especializados e pode devolver/encaminhar para nova especialidade |
| Médico coordenador | Atua na validação de laudos pendentes |
| Profissional de saúde externo | Identificado por CRM/CRO/CRP no prontuário/laudo |
| Equipe multiprofissional | Médicos envolvidos na construção do parecer ocupacional |
| RH/gestão de pessoas | Consome laudo, licença, readaptação, aposentadoria e efeitos na vida funcional |

## Dependências centrais

| Dependência | Uso no fluxo |
| --- | --- |
| Servidor/funcionário | Busca por nome, matrícula, CPF, situação funcional, filial, lotação e cargo |
| Especialidade médica | Organiza agenda, filtragem e encaminhamento da próxima perícia |
| Médico | Define agenda, executa atendimento, filtra painéis e compõe equipe pericial |
| Agenda médica | Gera janelas de atendimento e suporta reserva por data e horário |
| Janela/slot de agenda | Unidade mínima de agendamento |
| Profissional de saúde com conselho | Referência formal do prontuário/laudo |
| Motivo de afastamento | Define enquadramento ocupacional do afastamento |
| CID | Fundamenta diagnóstico e histórico clínico |
| Dependente | Necessário na licença para tratamento de pessoa da família |

## Estados funcionais detectados

### Agendamento pericial da linha agenda ocupacional

| Estado | Sentido funcional |
| --- | --- |
| `PENDENTE` | Agendamento reservado e ainda pendente de desfecho ocupacional |
| `CANCELADO` | Agendamento cancelado/inutilizado |
| `CONCLUIDO` | Agendamento encerrado após atendimento/validação/licença |

### Prontuário pericial da linha clássica

| Estado | Sentido funcional |
| --- | --- |
| `AGENDADO` | Perícia marcada e ainda não atendida |
| `COMPARECEU` | Atendimento realizado e prontuário preenchível/visualizável |
| `NAO_COMPARECEU` | Atendimento cancelado por ausência |

### Situação do laudo pericial

| Estado | Sentido funcional |
| --- | --- |
| `PENDENTE_ENVIO` | Laudo preenchido, ainda não remetido ao coordenador |
| `PENDENTE_VALIDACAO` | Aguardando chancela do coordenador |
| `APROVADO` | Validado e passível de emissão documental |
| `REPROVADO` | Não validado, com necessidade de retrabalho |

### Situação do paciente para nova convocação

| Estado | Sentido funcional |
| --- | --- |
| `AGENDADO` | Paciente já comprometido com uma perícia |
| `NAO_AGENDADO` | Paciente apto a novo agendamento |

## APIs nucleares do domínio

### Parametrização clínica e agenda

| Endpoint | Ação funcional |
| --- | --- |
| `GET /api/especialidadeMedica` | Listar especialidades com paginação |
| `GET /api/especialidadeMedica/all` | Carregar catálogo completo para seleção |
| `POST/PUT/DELETE /api/especialidadeMedica` | Manter especialidades |
| `GET /api/medico` | Listar médicos |
| `GET /api/medico/search` | Autocomplete e filtragem de médicos |
| `GET /api/medico/especialidades/{idMedico}` | Ver especialidades vinculadas ao médico |
| `GET /api/medico/empresas/matrizes` e `/naoMatrizes` | Relacionar médico a unidades/empresas |
| `GET /api/agendaMedica` | Gestão de agendas médicas cadastradas |
| `POST/PUT/DELETE /api/agendaMedica` | Manter agenda médica |
| `GET /api/agendaMedica/calendario/search` | Simular/calcular agenda antes de salvar |
| `GET /api/agendaMedica/relatorio/search` | Consultar agenda para emissão/visão consolidada |
| `GET /api/agendaMedica/agenda/filtro` | Filtrar dados de agenda por especialidade e data |

### Agendamento, atendimento e validação

| Endpoint | Ação funcional |
| --- | --- |
| `GET /api/periciaMedica/agendamento` | Listar agendamentos periciais |
| `GET /api/periciaMedica/agendamento/especialidade` | Consolidar agenda por especialidade e mês |
| `GET /api/periciaMedica/agendamento/{id}` | Consultar um agendamento |
| `POST /api/periciaMedica/agendamento` | Criar agendamento pericial |
| `DELETE /api/periciaMedica/agendamento/{id}` | Excluir agendamento |
| `GET /api/periciaMedica/agendamento/datas-disponiveis` | Expor datas com vaga para uma especialidade |
| `GET /api/periciaMedica/agendamento/horarios-disponiveis` | Expor horários vagos em data/especialidade |
| `GET /api/periciaMedica/agendamento/all-horarios` | Painel diário de todos os horários/agendados |
| `GET /api/periciaMedica/atendimento` | Carregar fila de atendimentos |
| `GET /api/periciaMedica/atendimento/validacao/pendente` | Carregar fila de laudos pendentes de validação |
| `PUT /api/periciaMedica/atendimento/cancelar/{id}` | Cancelar atendimento |
| `PUT /api/periciaMedica/atendimento/enviar/validacao/{id}` | Encaminhar laudo para coordenador |
| `PUT /api/periciaMedica/atendimento/validar/{id}` | Validar laudo/atendimento |
| `PUT /api/periciaMedica/atendimento/nao/validar/{id}` | Rejeitar validação e devolver para ajuste |

### Licença médica e emissão documental

| Endpoint | Ação funcional |
| --- | --- |
| `GET /api/licencas-medicas` | Gestão do histórico de licenças |
| `GET /api/licencas-medicas/{id}` | Consultar prontuário/laudo |
| `POST /api/licencas-medicas` | Registrar licença e laudo ocupacional |
| `PUT /api/licencas-medicas/{id}` | Atualizar licença/laudo |
| `DELETE /api/licencas-medicas/{id}` | Excluir licença |
| `PUT /api/licencas-medicas/{id}/renovar` | Renovar vigência da licença |
| `GET /api/licencas-medicas/{id}/pdf` | Emitir prontuário/laudo em PDF |
| `GET /api/licencas-medicas/{id}/pdf-aposentadoria` | Emitir laudo pericial para aposentadoria |
| `GET /api/licencas-medicas/funcionario/{id}/dias-concedidos` | Somar dias de licença já concedidos |
| `GET /api/licencas-medicas/tipos-restricao-medica` | Carregar catálogo de restrições ocupacionais |

### Dependências satélite consumidas pela jornada

| Endpoint | Finalidade |
| --- | --- |
| `GET /funcionario/searchAutoCompleteNomeOrMatriculaOrCpf` | Localizar servidor para agendamento |
| `GET /funcionario/{id}` | Carregar dados funcionais do servidor |
| `GET /funcionario/cpf/matriculasLicencaMedica` | Identificar outras matrículas para réplica da licença |
| `GET /dependentes/pessoa/FUNCIONARIO/{id}` | Carregar dependentes do servidor |
| `GET /dependente/{id}` | Obter dependente selecionado |
| `GET /crmCreas` e `GET /crmCrea/{id}` | Localizar profissional de saúde externo |
| `GET /classificacaoInternacionalDoencas` | Catálogo CID |
| `GET listaMotivosAfastamentosByPericia` | Catálogo de motivos de afastamento |
| `GET /usuario/logado` e `GET /usuario/{id}` | Identificar médico do usuário logado |

## Jornada de parametrização clínica

### 1. Especialidade médica

Objetivo:
manter o catálogo assistencial usado na agenda, no agendamento e no encaminhamento para próxima perícia.

Entradas:
`código` e `nome`.

Saídas:
especialidade apta para compor agendas médicas, filtros e reagendamentos.

Regras detectadas:

- o catálogo é reutilizado em toda a cadeia de agenda e perícia;
- há indício de unicidade por código;
- exclusão tende a ser bloqueada quando a especialidade já está em uso em outra funcionalidade.

### 2. Médico

Objetivo:
manter o cadastro do corpo médico pericial.

Entradas percebidas:
identificação do médico, especialidades vinculadas, UF e vínculos com empresas/unidades.

Saídas:
médico apto a:

- compor agenda médica;
- ser filtro operacional;
- executar atendimento;
- integrar equipe do parecer ocupacional.

Regras detectadas:

- o painel diário tenta reconhecer automaticamente o médico logado pelo CPF do usuário;
- médicos e gestores compartilham a mesma tela, mas com liberdade de filtro diferente.

### 3. Agenda médica

Objetivo:
gerar a malha de horários utilizável pelo agendamento pericial.

Entradas:

- médico;
- uma ou mais especialidades;
- data inicial e final;
- hora inicial e final;
- intervalo;
- periodicidade/semanalização por dia da semana.

Saídas:

- agenda cadastrada;
- grade de janelas por data e hora;
- relatório operacional de agenda.

Regras detectadas:

- médico é obrigatório;
- ao menos uma especialidade é obrigatória;
- intervalo, período e janelas são calculados antes do salvamento;
- agenda em uso não deve ser excluída livremente.

## Jornada de agenda

### Finalidade operacional

A jornada de agenda serve para transformar o cadastro do médico em **capacidade assistencial disponível**.

Fluxo funcional:

1. selecionar médico e especialidades;
2. informar período de vigência da agenda;
3. definir janela horária e intervalo entre atendimentos;
4. opcionalmente distribuir recorrência semanal;
5. visualizar a grade calculada;
6. confirmar a agenda;
7. consultar relatório de agendas por médico/especialidade/período.

Entradas:

- médico;
- especialidade;
- intervalo;
- dias da semana;
- data de agenda.

Saídas:

- disponibilidade por data;
- horários livres para futura reserva pericial.

## Jornada de agendamento pericial

### Tela de gestão

A rota `/periciaMedica/agendamento/gestao` opera como calendário de marcações.

Filtros detectados:

- matrícula;
- CPF;
- especialidade;
- status.

Visões detectadas:

- visão mensal consolidada por especialidade e quantidade;
- visão diária com horário, especialidade, servidor, matrícula, médico e status.

### Formulário de agendamento

A rota `/periciaMedica/agendamento/formulario` materializa a reserva da vaga.

Entradas principais:

- servidor;
- telefone;
- especialidade médica;
- data;
- horário;
- observação;
- anexo e descrição do anexo.

Dependências explícitas:

- o servidor precisa existir e estar **em exercício/ativo**;
- a especialidade precisa ter agenda disponível;
- a data só aparece após a escolha da especialidade;
- o horário só aparece após a escolha da data;
- o horário mostra o médico responsável.

Saídas:

- agendamento pericial reservado;
- status inicial `PENDENTE`;
- visualização posterior em calendário e painel de agendados.

Validações detectadas:

- servidor é obrigatório;
- especialidade é obrigatória;
- data é obrigatória;
- horário é obrigatório;
- anexos aceitam somente um conjunto restrito de formatos;
- se a data escolhida não tiver horários, o usuário é informado imediatamente;
- servidor fora de exercício não pode ser agendado.

Regras funcionais detectadas:

- a intenção do fluxo é reservar uma janela de agenda médica compatível com a especialidade;
- o filtro mensal consolida os agendamentos por especialidade e dia;
- o detalhe do calendário expõe o médico perito designado;
- existe intenção de edição de agendamento no front, mas ela não aparece de forma consistente na API principal priorizada.

## Jornada de atendimento

### 1. Painel “Atendimento de Agendados”

A rota `/periciaMedica/atendimentoAgendados/gestao` é a visão operacional diária da equipe.

Filtros detectados:

- médico;
- data;
- status;
- especialidade.

Comportamento por perfil:

- gestor pode escolher qualquer médico;
- médico logado é identificado automaticamente e, sem permissão de gestão, fica restrito aos próprios agendados.

Colunas exibidas:

- médico;
- horário;
- nome do servidor;
- contato;
- especialidade;
- status.

Ação codificada:

- clicar em linha `PENDENTE` redireciona para a abertura de **Licença Médica/Prontuário-Laudo** do servidor.

Leitura funcional:
esta tela é um quadro de chamadas do dia e um ponto de entrada para registrar o desfecho ocupacional.

### 2. Prontuário pericial clássico

A rota `/periciaMedica/atendimento/gestao` representa um fluxo pericial mais formal de prontuário e validação.

Filtros detectados:

- data de agendamento;
- nome do paciente;
- médico.

Colunas exibidas:

- horário;
- nome;
- tipo de perícia;
- tipo de análise;
- status;
- situação do laudo.

Ações disponíveis conforme estado:

- **Iniciar atendimento** quando a perícia está `AGENDADO`;
- **Cancelar atendimento** quando a perícia está `AGENDADO`;
- **Editar perícia** quando o paciente `COMPARECEU` e o laudo ainda está em `PENDENTE_ENVIO`;
- **Visualizar perícia** quando já existe atendimento;
- **Enviar para validação** quando o laudo está pronto para submissão;
- **Emitir laudo** quando o laudo está `APROVADO`.

### 3. Formulário de atendimento pericial

A rota `/periciaMedica/atendimento/formulario/:id` exibe:

- aba **Perícia**;
- aba **Histórico de Perícia**.

Entradas clínicas principais:

- motivo da perícia;
- CID;
- HDA;
- exame físico;
- diagnóstico;
- observação do médico;
- ação pericial;
- tipo de laudo, quando cabível;
- dados de reagendamento.

Dados somente leitura relevantes:

- nome do paciente;
- sexo;
- data de nascimento;
- nome da mãe;
- número da perícia;
- data de validação, quando já aprovada.

Regras funcionais detectadas:

- apenas o médico designado deve manipular a perícia;
- perícia cancelada por não comparecimento não pode ser manipulada;
- perícia com laudo já finalizado não pode continuar sendo editada;
- ações `Aposentar`, `Não aposentar` e `Desaposentar` exigem tipo de laudo;
- quando o servidor comparece, o contador de faltas do paciente é zerado;
- após comparecimento, o paciente volta para condição de `Não Agendado` para futuras convocações.

### Regras de reagendamento e conduta

Condutas identificadas no legado:

- aposentar;
- não aposentar;
- desaposentar;
- remarcar clínico geral presencial;
- remarcar clínico geral não presencial;
- retorno clínico geral presencial;
- retorno clínico geral não presencial;
- agendar especialista não presencial;
- remarcar especialista presencial;
- remarcar especialista não presencial;
- retorno especialista presencial;
- retorno especialista não presencial;
- agendar coordenador não presencial.

Regras associadas:

- ações de aposentadoria habilitam seleção de tipo de laudo e, no caso de `Aposentar`, podem exigir período da próxima perícia;
- a próxima perícia por aposentadoria pode ser calculada em `6 meses`, `1 ano`, `2 anos`, `3 anos`, `4 anos` ou `5 anos`;
- reagendamentos definem se a próxima perícia será presencial ou não presencial;
- parte das ações exige indicar especialidade da próxima perícia;
- quando informados, os dias até a próxima perícia geram uma data futura.

Tipos de laudo explicitamente detectados:

- aposentadoria por invalidez integral;
- aposentadoria por invalidez integral por CAT;
- aposentadoria proporcional;
- revisão de aposentadoria proporcional para integral;
- revisão de reversão de aposentadoria por invalidez;
- aposentadoria negada com inserção em reabilitação;
- revisões negadas de aposentadoria ou reversão.

## Jornada de validação

### Fila de validação

O legado codifica uma fila de **pendentes de validação** para atuação do coordenador.

Objetivo:
separar o fechamento clínico feito pelo médico executor da chancela final do coordenador.

Operações detectadas:

- enviar para validação;
- validar;
- não validar.

Entradas de triagem:

- data;
- nome do paciente;
- médico executor.

Saídas possíveis:

- laudo aprovado;
- laudo reprovado/devolvido;
- agendamento/prontuário concluído.

Regras funcionais detectadas:

- somente laudos em `PENDENTE_ENVIO` podem ser enviados ao coordenador;
- laudo enviado passa para `PENDENTE_VALIDACAO`;
- validação positiva produz `APROVADO`;
- não validação produz devolução para ajuste.

Observação importante:
na linha de agenda ocupacional, a não validação devolve o agendamento para `PENDENTE`; na linha clássica, a não validação marca o laudo como `REPROVADO`. O legado parece sustentar duas semânticas de devolução.

## Jornada de licença médica

### Papel funcional

A licença médica é o ponto em que a perícia ocupacional deixa de ser apenas agenda/atendimento e passa a produzir:

- afastamento;
- readaptação;
- restrição;
- aposentadoria por invalidez;
- histórico clínico-ocupacional documentado.

### Estrutura da tela

A rota `/licencaMedica/formulario/...` possui duas abas:

1. **Informações principais e do laudo**
2. **Parecer**

### Aba “Informações principais e do laudo”

Blocos funcionais detectados:

- identificação do servidor;
- réplica da perícia para outras matrículas do mesmo CPF;
- data da perícia;
- tipo de avaliação/solicitação;
- finalidade;
- benefícios parciais ou previdenciários;
- motivo do afastamento remunerado;
- bloco específico de aposentadoria por invalidez;
- concessão/negação de afastamento;
- profissional de saúde externo;
- data do prontuário/laudo;
- dias concedidos;
- observação;
- justificativa.

### Aba “Parecer”

Blocos funcionais detectados:

- equipe de profissionais da saúde envolvidos;
- tipo de perícia;
- restrições ocupacionais, quando o benefício é `Restrição`;
- HMP/HDA;
- hábitos de vida e situação laboral;
- exame físico;
- exames complementares/documentos médicos;
- data do parecer;
- dias concedidos do parecer;
- data de início e fim;
- CID principal/secundário;
- motivo do afastamento;
- decisão pericial;
- situação do laudo.

### Entradas e saídas principais

Entradas:

- dados do servidor;
- tipo de avaliação;
- benefício ou motivo de afastamento;
- profissional de saúde externo;
- equipe médica do parecer;
- CID;
- datas de parecer e vigência;
- dias concedidos;
- motivo de afastamento;
- decisão pericial;
- observações.

Saídas:

- licença médica ativa;
- prontuário/laudo em PDF;
- laudo pericial para aposentadoria em PDF;
- atualização do histórico do servidor;
- possível réplica da licença para outras matrículas;
- encerramento do agendamento do dia.

### Regras funcionais detectadas

- benefício previdenciário e motivo de afastamento remunerado são **mutuamente excludentes**;
- para salvar, é obrigatório selecionar ao menos um desses dois eixos;
- se o motivo for **licença para tratamento de pessoa da família**, é obrigatório informar dependente:
  nome e parentesco manualmente, ou dependente cadastrado;
- quando há motivo de afastamento remunerado, passam a ser exigidos:
  profissional de saúde, data do prontuário/laudo e dias concedidos;
- o parecer exige ao menos **um profissional de saúde da equipe**;
- o parecer exige **CID** e **motivo de afastamento**;
- os dias do parecer devem ser positivos e não podem ultrapassar o limite acumulado permitido;
- o limite acumulado é tratado como **24 meses / 720 dias**;
- servidor com licença médica ativa não pode receber nova licença;
- é possível **replicar a licença** para outras matrículas do mesmo servidor;
- ao salvar nova licença, o sistema oferece **impressão imediata**;
- há emissão separada de:
  prontuário/laudo padrão e laudo pericial para aposentadoria.

### Regras por finalidade

#### Readaptação

Exige:

- atividades compatíveis com a condição de saúde;
- data de início;
- quantidade de dias;
- data de fim.

#### Restrição

Exige:

- tipos de restrição médica;
- possibilidade de detalhar “outros”;
- datas e período da restrição;
- atividades compatíveis.

#### Considerado definitivamente inválido

Exige:

- decisão de aposentadoria;
- se houver doença grave, seleção do grupo de doença grave;
- data de enquadramento da invalidez;
- data final do enquadramento;
- número do processo.

Decisões textuais detectadas:

- faz jus à aposentadoria por invalidez permanente com doença grave;
- faz jus à aposentadoria por invalidez permanente sem doença grave;
- faz jus à aposentadoria por invalidez permanente por sequela de acidente/moléstia profissional;
- não faz jus à aposentadoria permanente.

### Renovação da licença

A rota `/licencaMedica/renovacao/:licencaMedicaId` trata prorrogação de vigência.

Fluxo:

1. carregar laudo original;
2. exibir período atual e parecer anterior;
3. informar nova data fim;
4. informar observação;
5. salvar renovação.

Regra central:

- a nova data fim deve ser **posterior** à data fim atual.

Saída:

- recálculo dos dias concedidos com base na nova data final.

## Regras funcionais consolidadas

- servidor precisa estar ativo/em exercício para ser agendado;
- agenda médica é pré-requisito do agendamento pericial;
- especialidade é elo obrigatório entre agenda, vaga e encaminhamento;
- médico logado sem perfil de gestão vê prioritariamente sua própria pauta;
- equipe multiprofissional é requisito de formalização do parecer;
- laudo de aposentadoria possui emissão documental própria;
- licença médica interfere na vida funcional do servidor e tende a atualizar motivo/situação funcional;
- ao salvar licença do dia, os agendamentos periciais do servidor na data corrente são encerrados como concluídos;
- o domínio lida com dois relógios simultâneos:
  agenda operacional do dia e vigência do afastamento.

## Lacunas e Ambiguidades do Legado

- O legado aparenta manter **duas trilhas de perícia** com semânticas próximas, mas não idênticas:
  uma centrada em `PENDENTE/CANCELADO/CONCLUIDO` e outra em `AGENDADO/COMPARECEU/NAO_COMPARECEU` com laudo validável.
- O front de prontuário consome operações de atendimento detalhado, atualização e PDF que **não aparecem de forma clara** no controlador prioritário lido para `PericiaMedicaController`.
- Existe rota de **edição de agendamento** no front, mas a API principal priorizada expõe com clareza apenas `POST`, `GET` e `DELETE` para agendamento.
- A fila de **pendente de validação** está fortemente codificada em controller/template, mas a aba correspondente parece estar parcialmente desconectada da lista de abas ativa.
- O backend expõe `ProfissionalSaudeController`, porém a jornada de licença usa majoritariamente buscas em `crmCrea` e também composição de equipe via cadastro de `medico`, sugerindo coexistência de conceitos de “profissional de saúde”.
- No painel “Atendimento de Agendados”, o clique em linha `PENDENTE` abre diretamente a licença médica, o que sugere um fluxo ocupacional mais novo e simplificado em paralelo ao prontuário pericial clássico.
- Há indícios de que o termo exibido ao usuário para “funcionário/servidor” é configurável; em refatoração funcional, convém preservar esse vocabulário parametrizável.
