# Domínio Folha de Pagamento: mapa fino do legado

## Escopo e fontes

Este documento aprofunda exclusivamente o domínio **Folha de Pagamento** do legado, com foco em intenção funcional, jornadas operacionais, filtros, estados, saídas documentais e dependências de negócio.

Fontes priorizadas nesta leitura:

- `docs/01-visao-geral-legado.md`
- `docs/02-inventario-rotas-front.csv`
- `docs/03-inventario-endpoints-backend.csv`
- `rhClient/client/app/page/folhaPagamento/**/*`
- controllers backend de folha, competência, contracheque, lançamentos, importadores, consignado e relatórios correlatos

## Visão funcional do domínio

O domínio `folhaPagamento` opera o ciclo mensal de processamento remuneratório, desde a **abertura de competência** até o **fechamento**, passando por:

- criação e manutenção de folhas por competência, filial e tipo de processamento;
- inclusão tardia de servidor em folha;
- inclusão manual de verbas e importação de lançamentos;
- cálculo, recálculo e reprocessamento de contracheques;
- processamento individual e em lote;
- impressão e download de contracheques;
- geração de resumo e relatórios gerenciais;
- importações relacionadas a verbas e consignado;
- consulta histórica de competências fechadas.

O legado separa claramente dois níveis:

- **gestão da folha**: competência, folha, lote, histórico e fechamento;
- **detalhamento da folha**: contracheques, lançamentos, inclusão de servidor e reprocessamento fino.

## Atores operacionais detectados

- **Gestor de folha**: abre competência, cria folha, executa lote, fecha competência, reprocessa folha e acompanha progresso.
- **Analista de folha**: consulta detalhamento, inclui servidor, remove contracheque, adiciona lançamento e imprime contracheques.
- **Analista de verbas**: importa verbas de servidor e pensionista, valida layout e substitui cargas existentes.
- **Analista de consignado**: mantém convênios consignáveis e importa movimentos de consignado por competência.
- **Controle interno / financeiro**: consome resumo da folha, relatório de folha, relatório financeiro e batimento.
- **Servidor ou pensionista**: aparece como beneficiário do contracheque, não como ator operacional do fluxo.

## Rotas, telas e subáreas funcionais

### Núcleo de folha

- `/folhaPagamento/gestao`
  A tela central do domínio. Reúne três jornadas em abas: processamento de competência, processamento em lote e histórico de competências.
- `/folhaPagamento/detalhamento/:id`
  Detalha uma folha específica e sua população de contracheques.
- `/folhaPagamento/detalhamento/:id/:detalhes`
  A mesma visão em modo histórico/consulta, sem vocação transacional.
- `/folhaPagamento/adicionar/funcionario/:id`
  Inclusão de servidor ainda não calculado naquela folha.
- `/folhaPagamento/adicionar/lancamento/:id`
  Inclusão manual de verbas em massa sobre servidores da folha.
- `/folhaPagamento/adicionar/lancamento/manual/:folhaPagamentoId`
  Importador de planilha de lançamentos manuais vinculado à folha.

### Subáreas correlatas do mesmo ecossistema

- `/importadorVerbaFuncionario/gestao`
  Importação em massa de verbas de servidor.
- `/importadorVerbasServidor/gestao`
  Alias funcional apontando para a mesma área de importação de verbas de servidor.
- `/importadorVerbaPensionista/gestao`
  Importação em massa de verbas de pensionista.
- `/consignado/gestao`
  Cadastro mestre de consignados.
- rotas de `importacaoConsignado`
  Pré-visualização, gravação de rascunho, importação e histórico de arquivos consignados.
- `/relatorioFolhaPagamento/gestao`
  Relatório gerencial de folha em PDF/Excel.
- `/relatorio/financeiro/gestao`
  Relatório financeiro da folha com status de trabalho.
- `/batimentoFolhaPagamento/relatorio`
  Conferência comparativa e batimento analítico da folha.

## Entidades funcionais principais

- **Competência**: mês/ano de processamento, com estados de abertura, programação de fechamento e fechamento.
- **Folha de pagamento**: combinação operacional de competência, filial, tipo de processamento, período de processamento, status e situação.
- **Contracheque**: resultado individual do cálculo para servidor ou pensionista.
- **Lançamento**: verba aplicada ao contracheque, classificada em vantagens, descontos e verbas de apoio ao cálculo.
- **Verba**: rubrica remuneratória ou de desconto, manual ou importada.
- **Consignado**: convênio/contrato descontável, com vínculo bancário e utilização em importações.
- **Importação**: artefato operacional com arquivo, validação, histórico, erros e confirmação.
- **Relatório**: saída documental ou registro salvo de conferência e consolidação.

## Jornada de gestão da folha

### Mapa progressivo

1. O operador entra em `Folha de Pagamento`.
2. Seleciona uma **competência aberta**.
3. O sistema preenche o intervalo de processamento a partir da competência.
4. O operador informa **filial**, **tipo de processamento** e **status da folha**.
5. Salva a folha individual.
6. A tela passa a listar as folhas da competência selecionada, com filtros e progresso.
7. O operador pode editar, detalhar, excluir e baixar resumo, conforme a situação operacional.

### Gatilhos

- seleção da competência aberta;
- ação `Salvar`;
- ação `Editar`;
- ação `Remover Folha`;
- ação `Resumo`;
- navegação para `Detalhes da Folha`.

### Filtros da listagem de folhas

- tipo de processamento;
- filial;
- situação operacional da folha.

### Campos operacionais observados

- empresa matriz;
- filial;
- tipo de processamento;
- período inicial de processamento;
- período final de processamento;
- status da folha;
- competência vinculada.

### Estados e sinais operacionais detectados

- a folha possui **status** configurável por enum;
- o front trata explicitamente o status **`Bloqueado`** como impeditivo de ações transacionais no detalhamento;
- a folha possui também uma **situação** de processamento acompanhada na listagem;
- a situação trata explicitamente valores como **`PENDENTE`** e **`Excluindo`**;
- o sistema calcula e exibe **percentual de progresso** da folha com base em contracheques concluídos sobre processamentos previstos.

### Ações disponíveis por folha

- editar folha;
- excluir folha;
- abrir detalhamento;
- baixar resumo em Excel;
- acompanhar progresso de cálculo.

### Regras funcionais detectadas

- a competência precisa estar selecionada antes da criação da folha;
- filial e tipo de processamento são travados na edição de folha já existente;
- folha em situação `PENDENTE` não expõe as mesmas ações de edição/remoção da folha já processada;
- a gestão é orientada por competência aberta, e não por competência livre.

## Jornada de detalhamento da folha

### Objetivo funcional

Permitir a conferência e manutenção da população da folha, em nível individual de contracheque, sem perder o contexto da folha mãe.

### Passos finos

1. O operador abre uma folha específica.
2. O sistema carrega os contracheques daquela folha.
3. O operador filtra a população.
4. Pode remover contracheque, consultar contracheque, baixar contracheque, incluir servidor e lançar verbas.
5. Pode ainda recalcular itens selecionados ou reprocessar a folha inteira.

### Filtros do detalhamento

- nome, com indício de busca por nome, matrícula ou CPF;
- lotação;
- situação funcional;
- situação do contracheque.

### Colunas funcionais da população

- matrícula;
- nome;
- situação funcional;
- órgão pagador/filial;
- lotação;
- situação;
- ações.

### Ações por indivíduo

- remover da folha;
- visualizar contracheque;
- baixar contracheque em PDF.

### Regras funcionais detectadas

- se a folha estiver `Bloqueado`, a inclusão de servidor, adição de lançamento e remoção de contracheque ficam bloqueadas;
- se a situação da folha estiver `PENDENTE`, o botão de recalcular também é restringido;
- a visão histórica reutiliza a mesma tela, mas em modo apenas consulta.

## Jornada de contracheque

### Abrangência

O contracheque é tratado como produto final do cálculo e também como tela de auditoria de composição salarial.

### Entradas de navegação

- visualização individual a partir do detalhamento;
- download individual em PDF;
- impressão em lote por folha/filial;
- download consolidado dos contracheques filtrados da folha.

### Conteúdo funcional exibido

#### Para servidor

- matrícula com dígito;
- cargo efetivo e referência;
- cargo comissionado e referência;
- banco, agência, operação e conta bancária;
- referência da folha;
- competência;
- vantagens;
- descontos;
- líquido;
- base previdenciária;
- base IRRF;
- alíquota IRRF;
- salário-base;
- verbas de apoio ao cálculo;
- feedback de cálculo por verba.

#### Para pensionista

- dados do beneficiário;
- matrícula com dígito;
- centro de custo;
- tipo de benefício;
- cota-parte;
- forma de reajuste;
- natureza do benefício;
- dados bancários do pensionista;
- referência da folha e competência;
- dados do instituidor;
- vantagens, descontos, líquido e bases;
- verbas de apoio ao cálculo;
- feedback de cálculo.

### Tipos de lançamentos mostrados no contracheque

- `lancamentosVantagens`;
- `lancamentosDescontos`;
- `lancamentosOutros`, identificados no front como **verbas de apoio ao cálculo**.

### Regras funcionais detectadas

- o contracheque tem template distinto para **servidor** e **pensionista**;
- existe também template com **marca d’água**, indicando uso em contexto de prévia, conferência ou emissão controlada;
- as verbas são ordenadas por código para leitura operacional;
- o feedback de cálculo explicita, por verba, resultado e fórmula, reforçando vocação de auditoria.

## Jornada de inclusão de servidor na folha

### Objetivo funcional

Incluir servidor ainda não calculado na folha selecionada e disparar cálculo individual com atualização da folha.

### Passos finos

1. O operador entra na ação `Adicionar Servidor`.
2. O sistema carrega a folha e a lista de lotações.
3. O operador filtra os elegíveis.
4. Seleciona um ou mais servidores.
5. Confirma a inclusão.
6. O backend adiciona os servidores à folha e recalcula seus contracheques.

### Filtros disponíveis

- nome;
- lotação;
- data de admissão;
- filial da própria folha, aplicada automaticamente.

### Critério de elegibilidade inferido

O endpoint consultado é `/api/contracheque/funcionario/no/leaf/`, indicando seleção de **servidores fora da folha**.

### Regra funcional central

Adicionar servidor à folha não é mero vínculo cadastral; a ação já implica **cálculo de contracheque** e **atualização da folha**.

## Jornada de lançamentos

### Lançamento manual direto

O fluxo `Adicionar Lançamento` atua como lançamento em massa por seleção simultânea de verbas e servidores.

#### Passos finos

1. Selecionar a folha.
2. Carregar verbas disponíveis.
3. Informar valor em cada verba escolhida.
4. Selecionar servidores destinatários.
5. Salvar.

#### Filtros de verbas

- código;
- descrição.

#### Filtros de servidores

- nome, matrícula ou CPF;
- lotação;
- filial da folha já aplicada como restrição.

#### Regras funcionais detectadas

- é obrigatório selecionar pelo menos um servidor;
- é obrigatório selecionar pelo menos uma verba;
- verba sem valor ou com valor zero impede a gravação;
- a ação atualiza a folha, e não apenas o cadastro da verba;
- a inclusão é coletiva: uma cesta de verbas pode ser distribuída a uma cesta de servidores.

### Importação de lançamento manual dentro da folha

Esse fluxo é distinto da inclusão direta. Ele usa planilha `.xlsx` vinculada a uma folha específica.

#### Passos finos

1. Selecionar arquivo.
2. Validar arquivo contra a folha informada.
3. Se houver erros, o sistema apresenta lista por linha e descrição.
4. Se validado, grava o histórico da importação.
5. O operador pode consultar ou excluir importações vinculadas àquela folha.

#### Regras funcionais detectadas

- a validação já depende do `folhaPagamentoId`;
- o layout é parte explícita da operação, com tela própria para consulta;
- o histórico é mantido por folha;
- a importação pode acusar sucesso técnico com lista de erros funcionais por linha.

## Jornada de lote e processamento

### Objetivo funcional

Processar folhas em massa para várias filiais na mesma competência e mesmo tipo de processamento.

### Passos finos

1. Selecionar competência aberta.
2. Informar tipo de processamento, período e status.
3. Selecionar as filiais.
4. Disparar processamento em lote.
5. Acompanhar dois progressos em paralelo:
   - folhas processadas;
   - contracheques gerados.

### Sinais operacionais do lote

- percentual global de contracheques gerados;
- percentual médio por filiais selecionadas;
- percentual individual por filial;
- atualização periódica por polling.

### Regras funcionais detectadas

- o lote exige ao menos uma filial selecionada;
- o lote herda a competência selecionada no topo da aba;
- a empresa matriz é fixa, e o recorte operacional real é por filiais;
- o processamento em lote usa o mesmo conceito de folha, mas desloca a criação para execução massiva.

## Jornada de reprocessamento

### Recalcular itens selecionados

- permite recálculo dirigido apenas para contracheques marcados;
- usa a lista de `contrachequeIds` como entrada.

### Reprocessar tudo

- reinicia o recálculo da folha inteira;
- é oferecido quando nenhum contracheque foi selecionado antes da ação `Recalcular`.

### Reprocessar pendentes

- recálculo focado em itens não concluídos da folha;
- explicitamente separado do reprocessamento integral.

### Regra funcional detectada

O legado distingue:

- **recálculo seletivo de contracheques**;
- **reprocessamento total da folha**;
- **reprocessamento apenas do que ficou pendente**.

Essa separação indica preocupação com volume, tempo de execução e recuperação operacional.

## Jornada de importação

### Importador de verbas de servidor

#### Etapas

1. Validar arquivo.
2. Receber prévia de dados importáveis.
3. Confirmar importação com substituição dos existentes.
4. Registrar histórico.
5. Consultar erros e verbas importadas.

#### Conteúdo consultável do histórico

- erros de importação;
- vínculo servidor-verba;
- tipo de valor;
- recorrência;
- valor;
- parcelas;
- parcelas pagas;
- tipo de folha.

#### Regra funcional detectada

A confirmação avisa explicitamente que a carga **substitui os existentes**, o que caracteriza importação de natureza saneadora ou sincronizadora, não apenas aditiva.

### Importador de verbas de pensionista

Espelha o fluxo de servidor, trocando o beneficiário de destino.

#### Regra funcional detectada

O domínio diferencia o tratamento de verbas de **servidor** e **pensionista**, inclusive na trilha de histórico.

### Importação de consignado

#### Etapas

1. Informar competência no formato mensal.
2. Selecionar arquivo.
3. Gerar pré-visualização.
4. Salvar como rascunho `NAO_IMPORTADO` ou confirmar `IMPORTADO`.
5. Em caso de retorno parcial, reabrir o item e executar `Importar pendentes`.
6. Consultar histórico e detalhes.

#### Conteúdo funcional da prévia/detalhe

- competência da folha;
- matrícula e dígito;
- CPF;
- código da rubrica;
- valor da parcela;
- parcelas pagas e total de parcelas;
- observação;
- status do movimento.

#### Estados observados

- `NAO_IMPORTADO`;
- `IMPORTADO`;
- `IMPORTADO_PARCIALMENTE`.

#### Dependência funcional

A importação de consignado depende de **competência**, **rubrica/verba**, **beneficiário** e **controle parcelado**, o que a posiciona como alimentadora direta de descontos de folha.

## Jornada de fechamento de competência

### Passos finos

1. O operador visualiza a lista de competências abertas.
2. Pode abrir nova competência informando mês e ano.
3. Pode programar fechamento futuro.
4. Pode remover a programação.
5. Pode fechar imediatamente a competência atual.
6. Pode consultar histórico por ano e competência.

### Regras funcionais detectadas

- o sistema mantém múltiplas competências abertas em lista;
- existe verificação especial para dezembro e inclusão do ano subsequente na seleção;
- a programação de fechamento não pode ser definida no passado;
- o cancelamento da programação pode ser negado quando a competência já está fechada;
- o histórico de competências usa competências por ano, separadas da gestão corrente;
- há suporte backend para reabertura da competência anterior, ainda que a ação não apareça de forma explícita na tela principal observada.

## Dependências funcionais com servidor, verbas e consignado

### Servidor

- compõe a população elegível da folha;
- pode ser incluído tardiamente quando ainda não possui contracheque na folha;
- é filtrado por nome, matrícula, CPF, lotação, filial e data de admissão;
- carrega dados funcionais usados no contracheque, como vínculo, cargo, referência, órgão pagador e lotação.

### Verbas

- são base do lançamento manual e das importações;
- aparecem segregadas em vantagens, descontos e verbas de apoio ao cálculo;
- sustentam bases previdenciárias e tributárias;
- podem ter recorrência, parcelas e parcelas pagas;
- são chave de leitura dos relatórios, do contracheque e das importações.

### Consignado

- possui cadastro mestre próprio, com descrição, contrato e eventual vínculo bancário;
- valida consistência de banco e agência;
- é consumido na importação de consignado por rubrica, parcela e status;
- funciona como origem externa ou semiexterna de descontos parcelados da folha.

## Saídas documentais e artefatos operacionais

- **resumo da folha em Excel**: `/api/folhaPagamento/resumo/{id}`;
- **contracheque individual em PDF**: gerado a partir do detalhamento do contracheque;
- **contracheques da folha em PDF**: `/api/contracheque/downloadFile`;
- **relatório de folha em PDF**: `/api/relatorioFolhaPagamento/relatorio/pdf`;
- **relatório de folha em Excel**: `/api/relatorioFolhaPagamento/relatorio/excel`;
- **batimento de folha em PDF**: `/api/batimentoFolhaPagamento/relatorio/pdf`;
- **histórico de importações**: verbas de servidor, verbas de pensionista, lançamento manual e consignado;
- **relatório financeiro salvo/não salvo**: artefato operacional com status próprio, voltado a trabalho interno e consolidação.

## API funcional agrupada por jornada

### Competência

- `GET /api/competencia`
  Recupera a competência atual.
- `GET /api/competencia/abertas`
  Lista competências abertas para operação corrente.
- `GET /api/competencia/fechadas`
  Lista competências fechadas.
- `PUT /api/competencia/abrir`
  Abre competência por mês e ano.
- `PUT /api/competencia/fechar/{id}`
  Fecha competência.
- `PUT /api/competencia/programar/fechar/{id}`
  Agenda fechamento.
- `PUT /api/competencia/cancelar/programar/fechar/{id}`
  Remove agenda de fechamento.
- `GET /api/competencia/porAno/{ano}`
  Consulta histórico por ano.
- `GET /api/competencia/porAno/folhaBloqueadaConcluida/{ano}`
  Seleção de competências aptas a relatório de folha.
- `GET /api/competencia/porAno/todaFolha/{ano}`
  Seleção ampla para batimento e conferência.

### Folha

- `POST /api/folhaPagamento`
  Cria folha.
- `PUT /api/folhaPagamento`
  Atualiza folha.
- `DELETE /api/folhaPagamento/{id}`
  Exclui folha.
- `GET /api/folhaPagamento/porCompetencia`
  Lista folhas da competência.
- `GET /api/folhaPagamento/concluidos/{id}`
  Retorna situação/progresso da folha.
- `PUT /api/folhaPagamento/reprocessar/{folhaPagamentoId}`
  Reprocessa toda a folha.
- `PUT /api/folhaPagamento/reprocessarNaoConcluido/{folhaPagamentoId}`
  Reprocessa pendências.
- `POST /api/folhaPagamento/lote`
  Executa processamento em lote.
- `GET /api/folhaPagamento/lote/concluidos`
  Retorna progresso global do lote.
- `GET /api/folhaPagamento/lote/filial/{filialId}/{competenciaId}`
  Retorna progresso por filial.
- `GET /api/folhaPagamento/resumo/{id}`
  Baixa resumo em Excel.

### Contracheque

- `GET /api/contracheque/porFolha`
  Lista contracheques da folha com paginação e filtros.
- `GET /api/contracheque/listaSituacoesFuncionais/porFolha/{folhaId}`
  Retorna situações funcionais presentes na folha.
- `DELETE /api/contracheque/{id}`
  Remove contracheque da folha.
- `POST /api/contracheque/adicionarFuncionario`
  Inclui servidor na folha e recalcula.
- `POST /api/contracheque/recalcular`
  Recalcula contracheques selecionados.
- `GET /api/contracheque/downloadFile`
  Emite PDF consolidado dos contracheques filtrados.

### Lançamentos e verbas

- `GET /api/folhaPagamento/verbas`
  Lista verbas elegíveis para lançamento.
- `GET /api/folhaPagamento/funcionarios`
  Lista servidores elegíveis ao lançamento.
- `POST /api/lancamento/adicionarVerbaAoFuncionario`
  Aplica verbas manuais a servidores.
- `GET /api/lancamento/showDetalheContracheque/{contrachequeId}`
  Busca o espelho analítico do contracheque.

### Importações

- `POST /api/importadorLancamentoManual/validacao/arquivo/{folhaPagamentoId}`
  Valida planilha de lançamento manual na folha.
- `GET /api/importadorLancamentoManuais`
  Lista histórico de importações manuais por folha.
- `DELETE /api/importadorLancamentoManual/{id}`
  Exclui importação manual.
- `POST /api/importadorVerbasFuncionario/validacao/arquivo`
  Valida planilha de verbas de servidor.
- `POST /api/importadorVerbasFuncionario/arquivo`
  Armazena arquivo de verbas de servidor.
- `POST /api/importadorVerbasFuncionario/importar`
  Confirma a importação de verbas de servidor.
- `GET /api/importadorVerbasFuncionario/template`
  Baixa layout de importação.
- `POST /api/importadorVerbasPensionistas/validacao/arquivo`
  Valida planilha de verbas de pensionista.
- `POST /api/importadorVerbasPensionistas/arquivo`
  Armazena arquivo de verbas de pensionista.
- `POST /api/importadorVerbasPensionistas/importar`
  Confirma a importação de verbas de pensionista.
- `POST /api/importacaoConsignado/upload`
  Gera pré-visualização do consignado por competência.
- `POST /api/importacaoConsignado/confirm`
  Salva rascunho ou efetiva importação consignada.
- `GET /api/importacaoConsignado`
  Lista histórico.
- `GET /api/importacaoConsignado/{id}`
  Consulta detalhe da importação.

### Relatórios e conferência

- `GET /api/relatorioFolhaPagamento/relatorio/pdf`
  Relatório gerencial da folha em PDF.
- `GET /api/relatorioFolhaPagamento/relatorio/excel`
  Relatório gerencial da folha em Excel.
- `GET /api/relatorio/financeiro/naoSalvo`
  Lista relatórios financeiros ainda não consolidados.
- `GET /api/relatorio/financeiro/salvo/{competenciaId}`
  Lista relatórios financeiros consolidados por competência.
- `POST /api/relatorio/financeiro/`
  Cria relatório financeiro.
- `PUT /api/relatorio/financeiro/{id}/alterar/{status}`
  Altera situação do relatório financeiro.
- `PUT /api/relatorio/financeiro/salvar/{id}`
  Consolida o relatório financeiro como salvo.
- `GET /api/batimentoFolhaPagamento`
  Executa consulta de batimento.
- `GET /api/batimentoFolhaPagamento/orgao`
  Consolida batimento por órgão.
- `GET /api/batimentoFolhaPagamento/relatorio/pdf`
  Emite PDF do batimento.

## Regras funcionais detectadas

- a operação diária da folha é ancorada em **competências abertas**;
- abrir competência é ato explícito, não implícito;
- o fechamento pode ser imediato ou programado;
- programação de fechamento não aceita data pretérita;
- uma folha é sempre recortada por **filial** e **tipo de processamento**;
- incluir servidor em folha dispara recálculo, não apenas associação;
- lançar verba manual exige valor positivo/informado;
- o legado diferencia **status cadastral/administrativo** da folha e **situação operacional de processamento**;
- `Bloqueado` atua como trava de manutenção;
- `PENDENTE` atua como indício de processamento incompleto;
- o processamento em lote separa progresso de **folhas** e de **contracheques**;
- existe recuperação operacional por **reprocessamento total** e por **reprocessamento de pendentes**;
- o contracheque é também ferramenta de auditoria, com bases e feedback de fórmula;
- as importações de verbas possuem caráter potencialmente substitutivo;
- a importação de consignado suporta retomada de cargas parcialmente concluídas;
- servidor e pensionista compartilham o conceito de contracheque, mas possuem apresentação e importação distintas;
- o histórico de competências e o histórico de importações são partes estruturais do domínio, não apenas logs técnicos.

## Lacunas e Ambiguidades do Legado

- o enum completo de **status da folha** não foi identificado textualmente nas fontes lidas; apenas o valor `Bloqueado` aparece com efeito funcional explícito;
- a enumeração completa de **situações de processamento da folha** não está exposta integralmente, embora `PENDENTE` e `Excluindo` apareçam de forma inequívoca;
- o backend expõe `abriranterior/{id}`, mas a jornada de reabertura da competência anterior não apareceu de forma explícita na tela principal observada;
- o controller de `ImportadorLancamentoManual` contém uma ação chamada `/importadorConsignados`, sugerindo sobreposição histórica entre importação manual e consignado;
- o fluxo de **relatório financeiro** é claramente operacional, mas as saídas documentais finais dele não ficaram explícitas nas fontes inspecionadas;
- a semântica exata de `status` versus `situacao` da folha exige leitura adicional de serviços e enums para eliminação de ambiguidade;
- o contracheque com marca d’água indica cenário especial de emissão, mas o gatilho funcional preciso desse formato não ficou totalmente exposto na camada analisada.
