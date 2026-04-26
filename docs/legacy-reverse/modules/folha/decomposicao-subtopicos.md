# Folha de Pagamento: decomposição em sub-tópicos funcionais

## Objetivo desta onda

Este documento reorganiza o domínio `folhaPagamento` em camadas menores de operação. A meta é separar aquilo que, no legado, aparece junto na tela de folha, mas cumpre papéis de negócio diferentes: governança de competência, composição da população, incidências, cálculo, conferência e entrega do contracheque.

## Árvore funcional do domínio

1. Governança da competência
2. Formação da folha da filial
3. Composição da população pagável
4. Lançamentos e incidências
5. Cálculo, reprocessamento e acompanhamento
6. Contracheque e entrega do resultado
7. Conferência, resumo e transparência

## 1. Governança da competência

### Papel funcional

É a camada que define quando a folha pode existir. A competência aberta organiza o calendário da rotina mensal, o agendamento de fechamento e a janela de processamento.

### Blocos da jornada

- Seleção de `Competência(s) Aberta(s)`.
- Abertura de competência.
- Programação de fechamento.
- Remoção da programação.
- Fechamento imediato da competência.

### Regras funcionais percebidas

- A folha depende de uma competência previamente aberta.
- O fechamento pode ser agendado ou executado manualmente.
- O estado de encerramento da competência condiciona novas ações operacionais.

## 2. Formação da folha da filial

### Papel funcional

Transforma a competência aberta em uma folha concreta, vinculada a empresa, filial, tipo de processamento e período de cálculo.

### Blocos da jornada

- Seleção de empresa matriz.
- Seleção de filial.
- Seleção de tipo de processamento.
- Definição de período inicial e final do processamento.
- Definição do status da folha.
- Salvamento da folha.

### APIs principais

- `POST /api/folhaPagamento`
- `PUT /api/folhaPagamento`
- `GET /api/folhaPagamento/{id}`
- `DELETE /api/folhaPagamento/{id}`
- `GET /api/folhaPagamento/filter`
- `GET /api/folhaPagamento/porCompetencia`

## 3. Composição da população pagável

### Papel funcional

Determina quem entra na folha daquela competência e daquele processamento.

### Blocos da jornada

- Tela `Adicionar servidor à folha`.
- Filtros de busca por servidor.
- Seleção individual ou em massa.
- Inclusão na folha da filial.
- Revisão posterior no detalhamento.

### Regras funcionais percebidas

- A massa pagável não é automaticamente fechada no momento da abertura da folha.
- O produto admite seleção manual e coletiva.
- Dados funcionais, como admissão e lotação, ajudam a recortar a população.

### APIs mais ligadas

- `GET /api/folhaPagamento/funcionarios`
- `GET /api/contracheque/funcionario/no/leaf/`

## 4. Lançamentos e incidências

### Papel funcional

É a camada em que verbas e lançamentos são aplicados à massa ou ao indivíduo. O domínio distingue lançamento manual operacional, importação em lote e reaproveitamento de verbas parametrizadas.

### Sub-blocos internos

#### 4.1 Lançamento orientado por verba

- Seleção de código e descrição da verba.
- Filtragem da população por servidor e lotação.
- Aplicação de verbas ao servidor dentro da folha.

#### 4.2 Importador de lançamento manual

- Download ou exibição do layout de entrada.
- Validação do arquivo.
- Upload do arquivo.
- Consolidação e exclusão de cargas importadas.

### APIs mais ligadas

- `GET /api/folhaPagamento/verbas`
- `POST /api/importadorLancamentoManual/validacao/arquivo/{folhaPagamentoId}`

## 5. Cálculo, reprocessamento e acompanhamento

### Papel funcional

É a parte em que a folha sai do estado de preparação e passa a produzir resultados. O operador acompanha se a folha concluiu, se há pendências e se é preciso recalcular.

### Blocos da jornada

- Tela de detalhamento da folha.
- Visualização de situação e status por servidor.
- `Reprocessar tudo`.
- `Reprocessar pendentes`.
- Consulta de folhas concluídas e situação de lote.

### APIs principais

- `GET /api/folhaPagamento/concluidos/{id}`
- `PUT /api/folhaPagamento/reprocessar/{folhaPagamentoId}`
- `PUT /api/folhaPagamento/reprocessarNaoConcluido/{folhaPagamentoId}`
- `POST /api/folhaPagamento/lote`
- `GET /api/folhaPagamento/lote/concluidos`
- `GET /api/folhaPagamento/lote/filial/{filialId}/{competenciaId}`

## 6. Contracheque e entrega do resultado

### Papel funcional

É a camada de materialização do pagamento. O contracheque aparece tanto como consulta individual quanto como emissão em massa por filial.

### Blocos da jornada

- Visualização do contracheque do servidor.
- Download do contracheque individual.
- Download em massa dos contracheques da filial.
- Tratamento específico para pensionista em template próprio.

### APIs mais ligadas

- `GET /api/folhaPagamento/resumo/{id}`
- dependências do `ContrachequeController`.

## 7. Conferência, resumo e transparência

### Papel funcional

Esta camada atende conferência interna, auditoria e eventualmente prestação pública de informações.

### Blocos da jornada

- Resumo da folha.
- Situação por servidor no detalhamento.
- Filtros por lotação, situação funcional e situação de processamento.
- Lista de folhas para transparência.

### APIs associadas

- `GET /api/folhaPagamento/lista/folha/transparencia`
- `GET /api/folhaPagamento/resumo/{id}`

## Diagnóstico funcional desta decomposição

- O legado agrupa em `folhaPagamento` pelo menos sete capacidades diferentes, que o usuário percebe como uma cadeia única de fechamento mensal.
- A fronteira mais crítica para futura refatoração é separar governança da competência, motor de processamento e experiência de conferência/entrega.
