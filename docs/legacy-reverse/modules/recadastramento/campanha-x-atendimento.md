# Recadastramento: decomposição focal em Campanha x Atendimento Previdenciário

## Objetivo

Este artefato separa `recadastramento` em duas metades funcionais que o legado mantém acopladas: `Campanha` e `Atendimento Previdenciário`.

## Leitura executiva

No legado, a prova de vida aparece como uma única área, mas ela mistura duas responsabilidades bem distintas:

- `Campanha`: organizar convocação, carteira de vencimentos, filtros de priorização, contatos e controle da execução.
- `Atendimento Previdenciário`: executar o recadastramento de aposentado ou pensionista, atualizar dados, anexar provas e emitir comprovante.

## 1. Camada Campanha

### Pergunta de negócio que esta camada responde

Quem precisa ser recadastrado, quando precisa ser convocado e qual é o status operacional dessa campanha?

### Jornadas e ações que pertencem mais claramente à Campanha

- Listagem geral de recadastrantes.
- Filtros por nome, tipo, situação e faixa de próximo recadastramento.
- Geração de relatório consolidado.
- Abertura do histórico de ligações.
- Acionamento da ação `Recadastrar`.
- Monitoramento da situação do beneficiário na fila.

### Sinais fortes no legado

- A tela principal é uma carteira de trabalho com data de próximo recadastramento.
- A situação do registro orienta a ação disponível.
- O histórico de ligações funciona como trilha de diligência da campanha.
- O produto permite ver aposentados e pensionistas na mesma fila gerencial.

### APIs e telas mais aderentes à Campanha

- rota `provaDeVidaGestao`
- tela `recadastramento.html`
- diálogo `dialogHistoricoLigacao.html`
- emissão de relatório da gestão

### Tabelas mais aderentes à Campanha

- `recadastramento.html`: matrícula, nome, filial, último recadastramento, próximo recadastramento, situação, ações.
- `dialogHistoricoLigacao.html`: data da ligação, usuário, observação.
- `recadastramento.aposentado.form.html` e `recadastramento.pensionista.form.html`, aba de histórico: nome, usuário sistema, data, ações.

## 2. Camada Atendimento Previdenciário

### Pergunta de negócio que esta camada responde

Como o beneficiário comprova vida, atualiza seu cadastro previdenciário e deixa evidência formal do atendimento?

### Jornadas e ações que pertencem mais claramente ao Atendimento Previdenciário

- Abertura do formulário do aposentado.
- Abertura do formulário do pensionista.
- Atualização de dados civis, endereço e contato.
- Gestão de telefones.
- Upload e remoção de anexos.
- Consulta do histórico formal do recadastramento.
- Emissão de comprovante.
- Salvamento do atendimento.

### Sinais fortes no legado

- O aposentado e o pensionista têm formulários próprios.
- O atendimento mistura atualização cadastral e prova documental.
- Há tabelas de telefone, anexos e histórico embutidas no formulário.
- O comprovante só faz sentido depois da conclusão do atendimento.

### Rotas e telas mais aderentes ao Atendimento Previdenciário

- `recadastramentoAposentadoFormulario`
- `recadastramentoAposentadoFormularioDetalhes`
- `recadastramentoPensionistaFormulario`
- `recadastramentoPensionistaFormularioDetalhes`
- `recadastramentoFormularioVisualizar`

### Tabelas mais aderentes ao Atendimento Previdenciário

- telefones do beneficiário e do contato secundário: número, tipo, ações.
- fila de upload de anexos: descrição, tamanho, progresso, situação, ações.
- anexos já gravados: descrição, tamanho, ações.
- histórico formal do recadastramento: nome, usuário do sistema, data, ações.

## 3. Zonas de mistura no legado

### Botão `Recadastrar` saindo da carteira

A campanha aciona diretamente o atendimento, sem uma camada intermediária explícita de convocação formal.

### Histórico dentro do formulário

O histórico de recadastramento aparece dentro do atendimento, mas sua utilidade é claramente gerencial e de campanha.

### Histórico de ligações

As ligações são ferramenta de campanha, mas estão muito próximas do caso individual do beneficiário.

## 4. Fronteira funcional recomendada para leitura do legado

### O que tende a permanecer em Campanha

- carteira de vencimentos
- filtros operacionais
- priorização
- diligência telefônica
- relatórios de execução

### O que tende a permanecer em Atendimento Previdenciário

- ficha do aposentado
- ficha do pensionista
- atualização cadastral
- anexos
- comprovante
- histórico formal do atendimento

### O principal elo entre as duas camadas

- a campanha seleciona o caso que deve ser atendido
- o atendimento devolve status e evidências que alimentam a campanha

## 5. Diagnóstico funcional

- A clivagem `campanha x atendimento previdenciário` explica melhor o domínio do que a divisão simples `gestão x formulário`.
- O legado tenta operar ao mesmo tempo uma carteira ativa de prova de vida e um atendimento previdenciário formal.
- Para refatoração futura, a prova de vida parece menos um simples cadastro e mais uma combinação de CRM previdenciário com atendimento regulado.
