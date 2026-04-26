# Mapa fino do domínio FUNCIONARIO

## 1. Escopo e fontes

Este documento aprofunda exclusivamente o domínio **FUNCIONARIO / SERVIDOR** do legado, tratando `funcionário` e `servidor` como sinônimos funcionais, já que a terminologia é parametrizável na aplicação.

Fontes priorizadas nesta leitura:

- `docs/01-visao-geral-legado.md`
- `docs/02-inventario-rotas-front.csv`
- `docs/03-inventario-endpoints-backend.csv`
- `rhClient/client/app/page/funcionario/*`
- `FuncionarioController`
- `FuncionarioObservacaoGeralController`
- `FuncionarioVerbasController`
- `HistoricoSituacaoFuncionalController`
- `PosseController`
- `LotacaoController`
- `TransferenciaFuncionarioController`

## 2. Papel do domínio no produto

O domínio `FUNCIONARIO` é o **cadastro mestre da vida funcional**. Ele concentra:

- identificação civil e documental;
- lotação e vinculação organizacional;
- dados de admissão, posse, cargo, função e enquadramento remuneratório;
- situação funcional corrente;
- dependências imediatas com folha, contracheque, transferências, posse, lotação, férias, licenças e dossiê documental;
- emissão de ficha funcional consolidada.

Na prática, quase todo o ERP de RH depende deste cadastro para localizar a pessoa, o vínculo, a unidade de exercício e a situação funcional vigente.

## 3. Atores funcionais detectados

- **Analista de cadastro funcional**: abre cadastro, edita dados pessoais, documentos, endereço e vínculo.
- **Analista de movimentação de pessoal**: mantém posse, lotação, situação funcional e transferência.
- **Operador de folha**: consulta contracheques, prévias e verbas associadas ao servidor.
- **Gestor de arquivo/dossiê**: anexa documentos, classifica tipo documental e mantém observações gerais.
- **Gestor de RH**: exclui cadastro, emite ficha funcional e executa importação em lote.

## 4. Mapa de navegação do domínio

### 4.1 Núcleo do cadastro

| Jornada | Estados/rotas detectados | Finalidade funcional |
|---|---|---|
| Gestão de servidores | `/funcionario/gestao`, `/servidor/gestao` | Listagem principal, filtros, emissão de ficha e manutenção |
| Novo cadastro | `/funcionario/formulario`, `/servidor/formulario` | Inclusão de novo servidor |
| Edição | `/funcionario/formulario/:id`, `/servidor/formulario/:id` | Manutenção completa do cadastro |
| Detalhes | `/funcionario/detalhes/:id/:detalhes`, `/servidor/detalhes/:id/:detalhes` | Consulta sem edição |

### 4.2 Módulos satélite diretamente acoplados

| Subdomínio | Estados/rotas detectados | Papel no domínio funcionário |
|---|---|---|
| Dossiê legado | `/observacaoDoc/gestao`, `/observacaoDoc/list/:funcionarioId`, `/observacaoDoc/formulario/:funcionarioId`, `/observacaoDoc/editar/:funcionarioId/:anexoId/:editar`, `/observacaoDoc/detalhes/:funcionarioId/:anexoId/:detalhes` | Gestão documental por servidor fora do formulário principal |
| Verbas do servidor | `/verbasFuncionario/gestao`, `/verbasFuncionario/formulario/:funcionarioId` e aliases `verbasServidor/*` | Cadastro e consulta de verbas vinculadas ao servidor |
| Posse | `/posse/gestao`, buscas e formulários `e/c/o/t` | Formalização de ingresso por tipo de vínculo |
| Lotação | `/lotacao/gestao`, `/lotacao/formulario`, `/lotacao/formulario/:id` | Cadastro da estrutura de exercício usada no servidor |
| Transferência | `/transferenciaFuncionario/gestao`, `/transferenciaFuncionario/formulario/:id`, aliases `transferenciaServidor/*` | Movimentação interna e entre órgãos |

## 5. Jornada de cadastro

### 5.1 Objetivo

Criar um cadastro funcional completo, com dados pessoais, documentação, dados de contato, enquadramento funcional, pagamento e base documental.

### 5.2 Entradas principais

O formulário principal está organizado em abas:

- `Dados Cadastrais`
- `Documentação`
- `Contato & Endereço`
- `Dados do Pagamento`
- `Contracheque` (somente quando aplicável)
- `Dossiê do Servidor`
- `Observações Gerais`

Principais grupos de entrada detectados:

- identificação: CPF, matrícula, nome, foto, nome social;
- vínculo organizacional: filial, lotação, centro de custo;
- dados pessoais: sexo, data de nascimento, estado civil, naturalidade, nacionalidade, cor da pele, filiação;
- documentação civil e trabalhista: RG, órgão expedidor, CTPS, PIS/PASEP, SUS, título eleitoral, CNH, alistamento, dados de nomeação, conselho profissional;
- estrangeiro/naturalização: naturalizado, casamento com brasileiro, filho brasileiro, registro e data de chegada;
- contato e endereço: CEP, logradouro, número, complemento, UF, município, bairro, e-mails e telefones;
- dados funcionais e financeiros: jornada, carga horária, vínculo, tipo de ingresso, posse, admissão/exercício, dependentes IR/SF, sindicato, cargo, função, remuneração, FGTS, ATS, probatório, banco, agência, conta, operação;
- situação funcional corrente: tipo de situação, início e fim;
- benefícios relacionados: vale-transporte;
- observação geral e dossiê documental.

### 5.3 Decisões funcionais na abertura do cadastro

- O CPF é o identificador inicial do processo de cadastro.
- Ao informar CPF, o sistema permite **buscar vínculos anteriores** e reaproveitar dados pessoais/documentais do vínculo mais recente.
- Se o CPF já teve vínculos, o usuário recebe alerta com quantidade de vínculos, matrícula, vínculo e secretaria/filial, podendo decidir reutilizar o histórico.
- A matrícula pode ser manual ou automática, conforme parâmetro sistêmico.
- Há indício de um modo de **cadastro em duas etapas**: quando o parâmetro `funcionarioEtapas` está ativo, campos como filial/lotação/centro de custo ficam bloqueados no formulário.
- O cadastro pode nascer como **servidor cedido**, o que desloca a jornada para regras documentais e funcionais específicas.

### 5.4 Regras de validação observadas nesta jornada

- CPF é obrigatório.
- Nome é obrigatório.
- Grau de instrução, sexo, estado civil, cor da pele, nome da mãe e vários documentos-chave são obrigatórios na UI.
- Idade menor ou igual a 14 anos bloqueia o cadastro.
- PIS/PASEP não pode estar associado a outro CPF.
- Matrícula segue formato parametrizado e pode ficar bloqueada quando já gerada ou quando a matrícula é automática.
- Filial determina as opções de lotação; se não houver lotações para a filial, o formulário explicita isso.
- Centro de custo depende do encadeamento organizacional carregado.

### 5.5 Saídas do cadastro

- novo servidor cadastrado;
- matrícula atribuída ou consolidada;
- foto funcional associada;
- observação geral gravada;
- anexos de dossiê já preparados no fluxo de criação;
- possibilidade de continuidade para manutenção, contracheque e jornadas satélite.

### 5.6 APIs centrais da jornada

- `GET /api/funcionario/form`
- `POST /api/funcionario`
- `GET /api/funcionario/cpf/info`
- `GET /api/funcionario/searchPisAndAnotherCpf`
- `POST /api/funcionario/cedido`
- `PUT /api/funcionarioAnexo`
- `PUT /api/funcionarios/{funcionarioId}/observacao-geral`

## 6. Jornada de manutenção

### 6.1 Porta de entrada

A manutenção começa na listagem principal:

- `GET /api/funcionarios/lista`
- rotas `/funcionario/gestao` e `/servidor/gestao`

### 6.2 Filtros e recortes disponíveis

Na gestão principal, o operador filtra por:

- nome, matrícula ou CPF;
- situação funcional;
- vínculo;
- sigla da filial.

Na tela de transferência, o filtro textual distingue automaticamente:

- CPF quando o texto é numérico longo;
- matrícula quando o texto é numérico curto;
- nome quando o texto é alfanumérico.

### 6.3 Ações disponíveis por registro

- emitir ficha funcional em PDF;
- abrir detalhes cadastrais;
- editar cadastro;
- excluir cadastro.

### 6.4 Regras de manutenção percebidas

- edição e exclusão dependem de permissão específica do módulo `FUNCIONARIO`;
- o formulário de detalhes abre em modo somente leitura;
- em edição, o sistema recarrega foto, vales, observação geral, última transferência, dossiê e dados do documento de amparo quando o servidor é cedido;
- alteração de CPF/dados de situação pode disparar lógica de readmissão/reintegração;
- exclusão pede confirmação explícita.

### 6.5 APIs centrais

- `GET /api/funcionario/{funcionarioId}`
- `GET /api/funcionario/{funcionarioId}/form`
- `PUT /api/funcionario`
- `DELETE /api/funcionario/{id}`
- `GET /api/funcionario/{id}/detalhes-para-tabela`
- `GET /api/funcionario/status/desligado`

## 7. Jornada documental e anexos

### 7.1 Camadas documentais existentes

O legado trata documentação do servidor em quatro camadas distintas:

1. **dados documentais estruturados** na aba `Documentação`;
2. **documento de amparo ao fato** para servidor cedido;
3. **dossiê do servidor** com anexos classificados;
4. **observações gerais** exibidas na ficha funcional.

### 7.2 Documentação estruturada

A aba `Documentação` reúne:

- RG, UF e data de expedição;
- CTPS e UF da CTPS;
- PIS/PASEP, data de emissão e agência;
- SUS;
- título eleitoral, seção, zona, UF e município;
- CNH, validade e categoria;
- registro de alistamento;
- portaria/decreto, processo, ato, nomeação e diário oficial;
- conselho profissional, número, registro, UF, município e data de expedição;
- condições de estrangeiro/naturalização.

O objetivo funcional é manter o **cadastro documental auditável** do servidor para uso em posse, folha, relatórios e exigências legais.

### 7.3 Dossiê do servidor no formulário principal

A aba `Dossiê do Servidor` permite:

- escolher tipo documental;
- anexar arquivo;
- registrar observação;
- inserir o documento no dossiê;
- consultar, editar metadados, excluir e baixar anexos.

Regras funcionais visíveis:

- inserir documento exige simultaneamente: arquivo enviado, tipo documental e observação;
- em novo cadastro, os anexos podem ser acumulados antes da criação definitiva do servidor;
- em servidor já existente, o vínculo do anexo é gravado imediatamente;
- há diferenciação entre modo detalhe, edição e inclusão;
- o dossiê mostra matrícula e nome do servidor para contexto.

### 7.4 Módulo legado `observacaoDoc`

Além do dossiê embutido no formulário, existe um fluxo legado paralelo:

- gestão por funcionário;
- listagem de documentos do servidor;
- inclusão/edição/detalhe de anexo.

Esse fluxo usa o módulo `DOSSIE_DO_SERVIDOR` e indica coexistência de duas experiências para o mesmo propósito funcional.

### 7.5 Documento de amparo ao fato para cedidos

Quando o servidor é marcado como `cedido`, surgem entradas específicas:

- órgão de origem;
- cargo de origem;
- data, número e tipo do documento de amparo;
- observações;
- número, data e página da publicação;
- tipo e meio de publicação;
- outros meios de publicação;
- tipo de documento;
- marcação de sigilo;
- anexo e descrição do anexo.

Na criação de cedido, este documento compõe a formalização funcional do afastamento/cessão.

### 7.6 Observações gerais

As observações gerais são tratadas como **texto histórico livre** e, pelo próprio formulário, devem aparecer na ficha funcional. O uso sugerido pelo legado inclui:

- ocorrências comportamentais;
- registros de saúde;
- histórico relevante não modelado em campos estruturados.

### 7.7 APIs documentais mais relevantes

- `GET /api/funcionario/{funcionarioId}/anexos`
- `DELETE /api/funcionario/{funcionarioId}/anexo/{anexoId}`
- `PUT /api/funcionarioAnexo`
- `GET /api/funcionarios/{funcionarioId}/observacao-geral`
- `PUT /api/funcionarios/{funcionarioId}/observacao-geral`
- `DELETE /api/funcionarios/{funcionarioId}/observacao-geral`

## 8. Jornada de ficha funcional

### 8.1 Acesso

A ficha funcional é acionada diretamente na listagem principal pela ação `Ficha`.

### 8.2 Conteúdo consolidado

O backend monta a ficha funcional a partir de várias consultas:

- ficha base do servidor;
- férias;
- licenças/atestados;
- transferências;
- licença-prêmio;
- vencimentos;
- desligamentos;
- observação geral.

### 8.3 Saídas

- visualização consolidada em API;
- emissão de PDF da ficha funcional.

### 8.4 APIs da ficha

- `GET /api/funcionario/{funcionarioId}/ficha`
- `GET /api/funcionario/{funcionarioId}/ficha/ferias`
- `GET /api/funcionario/{funcionarioId}/ficha/licencas`
- `GET /api/funcionario/{funcionarioId}/ficha/transferencias`
- `GET /api/funcionario/{funcionarioId}/ficha/licenca-premio`
- `GET /api/funcionario/{funcionarioId}/ficha/vencimentos`
- `GET /api/funcionario/{funcionarioId}/ficha/desligamentos`
- `GET /api/funcionario/{funcionarioId}/ficha/pdf`

## 9. Jornada de importação

### 9.1 Importação cadastral de servidores

A gestão principal possui ação direta de **importar funcionários por CSV**.

Comportamento funcional detectado:

- operador dispara a importação pela listagem principal;
- seleciona arquivo `.csv`;
- o sistema processa o lote;
- ao final, apresenta mensagem de sucesso/erro e recarrega a listagem.

API central:

- `POST /api/funcionarios/importar`

Regra explícita no backend:

- arquivo vazio é rejeitado.

### 9.2 Reaproveitamento de dados por CPF

Embora não seja importação em lote, existe uma segunda jornada de reaproveitamento:

- consulta por CPF;
- detecção de vínculos anteriores;
- reaproveitamento dos dados pessoais/documentais do vínculo mais recente.

Funcionalmente, isso opera como uma **importação pontual de histórico cadastral**.

## 10. Jornadas satélite do domínio

## 10.1 Posse

### Papel funcional

Formaliza o ingresso e o enquadramento inicial do servidor, com variantes por tipo de vínculo:

- efetivo;
- comissionado;
- contratado;
- prestador/terceirizado.

### Navegação detectada

- gestão: `/posse/gestao`
- busca por tipo: `/posse/e/busca`, `/posse/c/busca`, `/posse/o/busca`, `/posse/t/busca`
- formulários correspondentes por tipo e modo detalhe/edição

### Entradas e decisões

- seleção do servidor para iniciar a posse;
- composição do enquadramento: cargo ou função, nível salarial e referência salarial;
- filial, lotação e centro de custo de exercício;
- banco, agência, tipo de conta e conta;
- carga horária, turno, opção de remuneração;
- bens declarados e documentos de posse;
- no contratado/prestador, datas de fim de exercício/contrato;
- histórico de posse e dados de exoneracão como consultas de apoio.

### Ações e saídas

- criar posse;
- atualizar posse;
- remover anexo da posse;
- imprimir documentos/termos de posse;
- consultar histórico de posse do servidor.

### APIs mais relevantes

- `GET /api/posse/funcionario/{funcionarioId}`
- `GET /api/posse/{id}/form`
- `POST /api/posse/form`
- `PUT /api/posse/form`
- `DELETE /api/posse/funcionario/{funcionarioId}/anexo/{anexoId}`
- `GET /api/posse/historico/{funcionarioId}`
- `GET /api/posse/{posseId}/dados-exoneracao`
- `GET /api/posse/funcionario/{funcionarioId}/cargo/{cargoId}/nivelSalarial`
- `GET /api/posse/funcionario/{funcionarioId}/funcao/{funcaoId}/nivelSalarial`
- `GET /api/posse/funcionario/{funcionarioId}/nivelSalarial/{nivelSalarialId}/referenciaSalarial`
- `GET /api/posse/funcionario/{funcionarioId}/filial/{filialId}/lotacao`
- `POST /api/posse/centroCusto`

## 10.2 Lotação

### Papel funcional

`Lotação` é cadastro estrutural, mas opera como dependência direta do servidor porque define:

- unidade de exercício;
- difícil acesso;
- nível organizacional;
- efetivo previsto;
- centro de custo associado;
- vigência;
- dados contábeis relacionados.

### Navegação detectada

- `/lotacao/gestao`
- `/lotacao/formulario`
- `/lotacao/formulario/:id`
- `/lotacao/detalhes/:id/:detalhes`

### Regras e saídas

- descrição resumida e completa são obrigatórias;
- nível varia entre 1 e 4;
- tipo de lotação é obrigatório;
- centro de custo influencia tipo e número de conta;
- vigência inicial é obrigatória;
- lotação alimenta seletores do cadastro do servidor, posse e transferência.

### APIs mais relevantes

- `GET /api/lotacoes`
- `GET /api/lotacao/{lotacaoId}`
- `GET /api/listaLotacoes`
- `GET /api/listaLotacoes/{empresaFilialId}`
- `POST /api/lotacao`
- `PUT /api/lotacao`
- `DELETE /api/lotacao/{id}`
- `GET /api/lotacao/searchComplete`

## 10.3 Situação funcional

### Papel funcional

A situação funcional corrente é mantida dentro da aba `Dados do Pagamento`, mas o backend expõe um subdomínio completo de histórico.

O legado diferencia pelo menos:

- ativo;
- afastamento;
- desligamento;
- sustado;
- demais tipos parametrizados de situação funcional.

### Entradas e decisões no cadastro do servidor

- seleção da situação funcional atual;
- data de início;
- data final, retorno ou desligamento, com rótulo dinâmico conforme o tipo selecionado.

### Regras detectadas no backend

- ao criar situação não desligamento, o sistema valida se o servidor pode ser afastado novamente no ano pelo mesmo motivo;
- afastamento superior ao limite anual para o mesmo motivo é rejeitado;
- se o afastamento não tiver retorno adequado, o servidor pode ser colocado em situação `SUSTADO`;
- quando a situação é do tipo desligamento, a mensagem de negócio muda para desligamento realizado.

### APIs mais relevantes

- `GET /api/historicoSituacoesFuncionais`
- `GET /api/historicoSituacoesFuncionais/lista`
- `GET /api/listaHistoricoSituacoesFuncionais`
- `GET /api/getPrimeiraSituacaoFuncionalByFuncionario`
- `GET /api/historicoSituacaoFuncional/{id}`
- `POST /api/historicoSituacaoFuncional`
- `PUT /api/historicoSituacaoFuncional`
- `DELETE /api/historicoSituacaoFuncional/{id}`
- `GET /api/historicoSituacaoFuncional/afastamentosVencidos`

## 10.4 Transferência

### Papel funcional

Transferência movimenta o servidor:

- internamente, dentro da mesma filial;
- entre órgãos/unidades, com tratamento de designação e ônus.

### Navegação detectada

- `/transferenciaFuncionario/gestao`
- `/transferenciaFuncionario/formulario/:id`
- `/transferenciaFuncionario/detalhes/:id/:detalhes`
- aliases `transferenciaServidor/*`

### Entradas e filtros

Na gestão:

- busca por nome, matrícula ou CPF;
- filtro por sigla da filial.

No formulário:

- dados atuais do servidor: matrícula, nome, filial, lotação, centro de custo;
- transferência interna: lotação destino e centro de custo;
- transferência entre órgãos: designado, com/sem ônus, filial destino, lotação destino e centro de custo.

### Regras detectadas

- designado faz a origem continuar responsável pelos custos;
- se marcado `sem ônus`, o centro de custo pode deixar de ser exigido;
- na transferência interna, a filial destino é a mesma filial atual;
- a última transferência é consultada para reaproveitar o status de designação;
- o detalhe da transferência exibe histórico comparando origem e destino.

### APIs mais relevantes

- `GET /api/transferencias/{funcionarioId}`
- `GET /api/transferencias/ultimaTransferencia/{funcionarioId}`
- `POST /api/transferenciaFuncionario`

## 10.5 Verbas relacionadas

### Papel funcional

O subdomínio `Verbas do Funcionário` permite associar lançamentos fixos ou recorrentes ao cadastro do servidor, antes ou além do processamento mensal da folha.

### Navegação detectada

- `/verbasFuncionario/gestao`
- `/verbasFuncionario/formulario/:funcionarioId`
- aliases `verbasServidor/*`
- atalho de importação para `/importadorVerbaFuncionario/gestao`

### Filtros e listagem

Na gestão de verbas:

- busca por nome, matrícula ou CPF;
- filtro por filial;
- filtro por situação `com verbas` ou `sem verbas`.

Cada servidor pode expandir um acordeão com as verbas já vinculadas.

### Entradas do formulário

- verba;
- tipo de valor;
- recorrência;
- valor;
- parcelas e parcelas pagas;
- tipo de folha;
- competência inicial;
- observação.

### Regras detectadas

- verba, tipo, recorrência e tipo de folha são obrigatórios para inclusão;
- valor default pode cair para zero;
- recorrência `em parcela` exige quantidade de parcelas;
- se mês for informado, o ano torna-se obrigatório;
- ano da competência deve ficar entre 1999 e 9999;
- o lote de verbas é salvo em conjunto;
- a saída sem salvar avisa perda de alterações.

### APIs mais relevantes

- `GET /api/funcionariosVerbas`
- `GET /api/funcionarioVerbas/{funcionarioId}`
- `POST /api/funcionarioVerbas/`

### Importação satélite de verbas

Há um fluxo satélite próprio para carga em lote de verbas do servidor:

- `/importadorVerbaFuncionario/gestao`
- `POST /api/importadorVerbasFuncionario/validacao/arquivo`
- `POST /api/importadorVerbaFuncionario/arquivo`
- `POST /api/importadorVerbaFuncionario/importar`
- `GET /api/importadorVerbaFuncionario/template`

## 11. Dependências com outros domínios

O domínio `FUNCIONARIO` depende ou é consumido diretamente por:

- **Folha/Contracheque**: consulta de competências, tipos de processamento, contracheques processados e prévias.
- **Verbas**: verbas fixas/recorrentes vinculadas ao servidor.
- **Posse**: formalização do ingresso e enquadramento inicial.
- **Lotação**: estrutura organizacional e centro de custo.
- **Situação funcional / afastamentos**: estado vigente e histórico.
- **Transferência**: histórico de movimentação interna e entre órgãos.
- **Férias e licença-prêmio**: compõem a ficha funcional e usam buscas de servidor.
- **Licenças médicas**: há endpoints específicos por CPF/matrícula em torno do servidor.
- **Reembolso e certidões**: reaproveitam recortes específicos do cadastro do servidor.
- **Estágio/pensão/previdência**: o backend expõe buscas derivadas do cadastro funcional para outros fluxos.

## 12. Regras funcionais detectadas no front

- O módulo respeita permissão fina por ação: visualizar, cadastrar, atualizar e excluir.
- O cadastro admite reaproveitamento de dados a partir de CPF com vínculos anteriores.
- O servidor não pode ser cadastrado com 14 anos ou menos.
- PIS/PASEP não pode estar compartilhado entre CPFs diferentes.
- Matrícula pode ser automática ou parametrizada manualmente.
- Filial dirige a seleção de lotação e, por consequência, o centro de custo.
- O modo `cedido` altera a jornada e exige formalização documental específica.
- Para novo cedido, o sistema força vínculo `A DISPOSIÇÃO / EFETIVO`.
- A aba de contracheque só aparece quando existem tipos de processamento de prévia aplicáveis ao vínculo.
- Dossiê exige arquivo + tipo documental + observação antes da inserção.
- Observações gerais são tratadas como histórico livre e persistidas por servidor.
- Transferência interna mantém a filial e altera lotação/centro de custo.
- Transferência entre órgãos considera `designado` e `com ônus/sem ônus`.
- Em verbas, a competência inicial tem consistência temporal mínima.

## 13. Regras funcionais detectadas no backend

- A criação padrão de servidor pode retornar conflito quando já existe cadastro do mesmo CPF com matrícula vazia.
- O cadastro de servidor cedido é tratado como fluxo próprio.
- A ficha funcional em PDF agrega ficha base, férias, licenças, transferências, licença-prêmio, vencimentos, desligamentos e observação geral.
- A importação de servidores rejeita arquivo vazio.
- O histórico de situação funcional impede novo afastamento anual acima do limite para o mesmo motivo.
- O histórico de situação funcional pode sustar automaticamente o servidor quando não há retorno adequado do afastamento.
- O desligamento é tratado como caso distinto na atribuição de situação funcional.
- Transferência possui conceito explícito de `designado`, em que a origem segue responsável pelos custos.
- Posse fornece derivação dinâmica de lotação, nível salarial, referência salarial, município e centro de custo conforme o contexto do servidor.

## 14. Lacunas e Ambiguidades do Legado

- Há coexistência de dois fluxos para dossiê documental: o módulo `observacaoDoc` e a aba `Dossiê do Servidor` no formulário principal. O papel oficial de cada um não está claramente separado.
- O campo `Matricula Oficial` no HTML está ligado a `categoriaAlistamento`, o que sugere possível reaproveitamento indevido de campo ou nomenclatura ambígua.
- O modo `funcionarioEtapas` bloqueia parte do enquadramento organizacional, mas a segunda etapa não aparece nas fontes analisadas.
- O fluxo de atualização de servidor cedido, no controlador, não deixa claro se o documento de amparo ao fato é integralmente atualizado junto com o cadastro.
- O front trata `funcionário` e `servidor` como aliases de navegação; falta confirmação se existe alguma distinção funcional real entre os termos em regras de negócio.
- A aba `Contracheque` depende da existência de tipos de processamento de prévia, mas o critério funcional completo para sua exibição não está descrito no legado.
- O backend de transferência usa permissões associadas a `REGRAS_DE_APOSENTADORIA` em parte do controlador, o que indica possível herança indevida de autorização ou nomenclatura inconsistente.
- O módulo `observacaoDoc` mantém nomes e mensagens herdadas de outros contextos em alguns trechos, o que dificulta afirmar se ele foi integralmente consolidado como dossiê de servidor.
