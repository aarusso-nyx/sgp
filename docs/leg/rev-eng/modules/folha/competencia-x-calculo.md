# Folha de Pagamento: decomposição focal em Competência x Cálculo

## Objetivo

Este artefato separa `folhaPagamento` em duas metades funcionais que o legado opera em sequência, mas mistura na mesma área: `Competência` e `Cálculo`.

## Leitura executiva

No produto legado, a folha mensal só existe porque uma competência foi aberta, programada e eventualmente fechada. Depois disso, entra a camada de cálculo, que monta a massa, aplica incidências, reprocessa pendências e materializa contracheques. A fronteira funcional mais útil é:

- `Competência`: calendário, janela de processamento, abertura, fechamento e disponibilidade para processamentos.
- `Cálculo`: formação da folha concreta, composição da massa, incidências, processamento, conferência e entrega do resultado.

## 1. Camada Competência

### Pergunta de negócio que esta camada responde

Em que período oficial a administração está autorizada a processar folha e qual é o estado desse ciclo?

### Jornadas e ações que pertencem mais claramente a Competência

- Listar competências abertas e fechadas.
- Abrir competência.
- Abrir competência anterior.
- Programar fechamento.
- Cancelar programação de fechamento.
- Fechar competência.
- Consultar última competência.
- Verificar existência de competência do mês.
- Navegar por competências de um ano.

### Sinais fortes no legado

- A tela de gestão inicia pela escolha de `Competência(s) Aberta(s)`.
- O fechamento da competência aparece como decisão de calendário, não como efeito colateral do cálculo.
- Existem endpoints próprios para existência, abertura, fechamento, programação e estado da competência.
- A competência também serve como filtro histórico para contracheque e ficha financeira do servidor.

### APIs mais aderentes à camada Competência

- `GET /api/competencia`
- `GET /api/competencia/abertas`
- `GET /api/competencia/fechadas`
- `PUT /api/competencia/abrir`
- `PUT /api/competencia/abriranterior/{id}`
- `PUT /api/competencia/programar/fechar/{id}`
- `PUT /api/competencia/cancelar/programar/fechar/{id}`
- `PUT /api/competencia/fechar/{id}`
- `GET /api/competencia/ultima`
- `GET /api/competencia/existe`
- `GET /api/competencia/porAno/{ano}`

### Objetos funcionais implícitos

- Competência
- Calendário de fechamento
- Janela de processamento
- Situação de competência

## 2. Camada Cálculo

### Pergunta de negócio que esta camada responde

Dada uma competência válida, como a folha é montada, calculada, reprocessada, conferida e entregue?

### Jornadas e ações que pertencem mais claramente a Cálculo

- Criar a folha da filial por tipo de processamento.
- Selecionar a massa de servidores.
- Aplicar lançamentos e verbas.
- Importar lançamentos manuais.
- Processar lote.
- Reprocessar toda a folha.
- Reprocessar pendências.
- Consultar situação por servidor.
- Gerar contracheque, resumo e relatórios financeiros.

### Sinais fortes no legado

- A folha concreta é criada com filial, tipo de processamento e período de cálculo.
- O cálculo admite pendência parcial e reprocessamento seletivo.
- O detalhamento por servidor mostra matrícula, lotação, situação funcional e situação do contracheque.
- O produto distingue cálculo da folha e governança da competência, ainda que ambos convivam na mesma área.

### APIs mais aderentes à camada Cálculo

- `POST /api/folhaPagamento`
- `PUT /api/folhaPagamento`
- `GET /api/folhaPagamento/{id}`
- `GET /api/folhaPagamento/filter`
- `GET /api/folhaPagamento/porCompetencia`
- `GET /api/folhaPagamento/funcionarios`
- `GET /api/folhaPagamento/verbas`
- `POST /api/folhaPagamento/lote`
- `GET /api/folhaPagamento/lote/concluidos`
- `GET /api/folhaPagamento/lote/filial/{filialId}/{competenciaId}`
- `PUT /api/folhaPagamento/reprocessar/{folhaPagamentoId}`
- `PUT /api/folhaPagamento/reprocessarNaoConcluido/{folhaPagamentoId}`
- `GET /api/folhaPagamento/resumo/{id}`
- `POST /api/importadorLancamentoManual/validacao/arquivo/{folhaPagamentoId}`
- `GET /api/contracheque/porFolha`
- `POST /api/contracheque/recalcular`
- `GET /api/contracheque/downloadFile`

### Objetos funcionais implícitos

- Folha da filial
- Tipo de processamento
- Massa pagável
- Lançamento/Incidência
- Contracheque
- Resultado do cálculo
- Pendência de processamento

## 3. Zonas de mistura no legado

### Tela única de gestão

A área de `folhaPagamento` combina atos de competência e atos de cálculo na mesma experiência do usuário. Isso aproxima operações que, funcionalmente, têm responsáveis e ciclos diferentes.

### Competência como filtro financeiro

A competência também serve de chave para consultar contracheque do servidor, o que reforça sua centralidade e ao mesmo tempo mistura calendário com resultado financeiro.

### Lote

O processamento em lote usa a competência como recorte, mas já pertence claramente ao cálculo. É um ponto de contato intenso entre as duas camadas.

## 4. Fronteira funcional recomendada para leitura do legado

### O que tende a permanecer em Competência

- Abertura
- Fechamento
- Programação
- Verificação de existência
- Linha temporal anual e mensal

### O que tende a permanecer em Cálculo

- Folha concreta
- Tipo de processamento
- Seleção de servidores
- Verbas e lançamentos
- Reprocessamento
- Contracheque e resumo
- Situação por servidor

### O principal elo entre as duas camadas

- A competência habilita ou bloqueia o cálculo.
- O cálculo devolve sinais que influenciam o fechamento da competência.

## 5. Diagnóstico funcional

- A clivagem `competência x cálculo` é a mais útil para compreender a folha do legado sem cair em detalhe técnico.
- `Competência` funciona como governança temporal; `Cálculo` funciona como execução financeira-operacional.
- Essa separação também explica por que certas telas parecem administrativas e outras parecem estritamente de conferência e processamento.
