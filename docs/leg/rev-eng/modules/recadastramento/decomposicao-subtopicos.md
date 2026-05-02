# Recadastramento / Prova de Vida: decomposição em sub-tópicos funcionais

## Objetivo desta onda

Este documento quebra `recadastramento` em partes operacionais menores. A área, no legado, não é apenas um formulário anual: ela combina carteira de convocação, execução da prova de vida, comunicação ativa, anexação de evidências e trilha histórica previdenciária.

## Árvore funcional do domínio

1. Carteira de convocação e gestão
2. Prova de vida do aposentado
3. Prova de vida do pensionista
4. Endereço, contato e telefone para localização
5. Anexos, comprovantes e histórico formal
6. Histórico de ligações e cobrança ativa
7. Integração pública e autoatendimento externo

## 1. Carteira de convocação e gestão

### Papel funcional

É o painel de trabalho da unidade previdenciária. Organiza quem precisa recadastrar, quando precisa fazê-lo e qual é a situação corrente.

### Blocos da jornada

- Listagem por nome do recadastrante.
- Filtro por tipo.
- Filtro por situação.
- Faixa de próximo recadastramento.
- Ação de `Recadastrar`.
- Ação de abrir `Histórico ligações`.
- Ação de emitir `Comprovante`.
- Geração de relatório em Excel.

### Regras funcionais percebidas

- O domínio trabalha com fila de vencimento.
- O próximo recadastramento é atributo central da gestão.
- Apenas registros já recadastrados parecem liberar comprovante.

## 2. Prova de vida do aposentado

### Papel funcional

É a jornada de atualização cadastral e validação de existência para beneficiário aposentado.

### Blocos da jornada

- Atualização de nascimento, UF de nascimento, gênero, estado civil, nacionalidade, raça e escolaridade.
- Revisão de endereço e contatos.
- Salvamento do recadastramento.
- Consulta do histórico de recadastramentos anteriores.

### Rotas principais

- `recadastramentoAposentadoFormulario`
- `recadastramentoAposentadoFormularioDetalhes`

## 3. Prova de vida do pensionista

### Papel funcional

É a variação previdenciária da prova de vida para beneficiário de pensão, com campos e alertas próprios.

### Blocos da jornada

- Atualização dos mesmos dados civis básicos da prova de vida.
- Tratamento da condição `Pensionista Universitário`.
- Revisão de endereço, contato e anexos.
- Acompanhamento do histórico de recadastramento.

### Rotas principais

- `recadastramentoPensionistaFormulario`
- `recadastramentoPensionistaFormularioDetalhes`
- `recadastramentoFormularioVisualizar`

## 4. Endereço, contato e telefone para localização

### Papel funcional

É o bloco de atualização cadastral que sustenta a efetividade da prova de vida e da convocação futura.

### Blocos da jornada

- Telefones principais e alternativos.
- Tipificação do telefone.
- Campos de endereço com UF e município.
- Observações de contato.

### Regras funcionais percebidas

- O legado diferencia ao menos dois grupos de telefones.
- O dado de contato é suficientemente importante para ter inserção e remoção dinâmicas.

## 5. Anexos, comprovantes e histórico formal

### Papel funcional

É a trilha probatória do recadastramento. Reúne anexos de prova de vida, histórico de execuções e comprovante do atendimento concluído.

### Blocos da jornada

- Aba `Anexos`.
- Upload, cancelamento, remoção e download.
- Aba `Histórico de recadastramento`.
- Emissão de comprovante individual.

## 6. Histórico de ligações e cobrança ativa

### Papel funcional

Registra tentativas de localização e interação com o beneficiário.

### Blocos da jornada

- Abertura do diálogo `Histórico de ligações`.
- Registro de observação.
- Inclusão sucessiva de apontamentos.
- Consulta das ligações anteriores.

## 7. Integração pública e autoatendimento externo

### Papel funcional

Expõe serviços do domínio para consulta ou interação fora do painel interno, especialmente em cenários de prefeitura e prova de vida externa.

### Regras funcionais percebidas

- O domínio não é exclusivamente interno.
- O legado tenta conciliar operação assistida e consumo externo da mesma base previdenciária.

## Diagnóstico funcional desta decomposição

- `recadastramento` combina gestão de vencimentos, execução cadastral, prova documental e cobrança ativa.
- A separação futura mais natural é entre campanha/lista de convocação, formulário previdenciário, trilha documental e interação externa.
