# Perícia Médica: decomposição focal em Regulação x Clínica

## Objetivo

Este artefato separa `periciaMedica` em duas metades funcionais que o legado mantém fortemente conectadas: `Regulação` e `Clínica`.

## Leitura executiva

No legado, a área de perícia não é só atendimento médico. Antes do encontro clínico existe uma camada forte de organização da oferta, convocação, agenda, disponibilidade e validação formal. Depois disso, entra a camada clínica propriamente dita, que registra achados, CID, diagnóstico, laudo e desfecho funcional. A distinção mais útil é:

- `Regulação`: organizar o acesso, agendar, controlar disponibilidade e validar o trâmite institucional do atendimento.
- `Clínica`: examinar o servidor, registrar prontuário, produzir laudo, definir conduta e gerar efeitos de licença ou restrição.

## 1. Camada Regulação

### Pergunta de negócio que esta camada responde

Como o servidor chega à perícia, em qual agenda, com qual prioridade e sob qual governança operacional?

### Jornadas e ações que pertencem mais claramente a Regulação

- Cadastro e manutenção da oferta assistencial.
- Consulta de especialidades, datas e horários disponíveis.
- Agendamento da perícia.
- Registro de telefone e observação de convocação.
- Registro e gestão do anexo que acompanha o agendamento.
- Lista de agendamentos.
- Lista de atendimentos.
- Envio para validação.
- Validação, não validação e cancelamento.

### Sinais fortes no legado

- O agendamento exige primeiro especialidade, depois data e só então horário.
- O produto trata disponibilidade como recurso escasso e organizado.
- Há fila de pendentes de validação, sinal de governança posterior ao atendimento.
- O campo de telefone e o anexo do agendamento indicam preocupação com convocação e instrução prévia do caso.

### APIs mais aderentes à Regulação

- `GET /api/periciaMedica/agendamento`
- `POST /api/periciaMedica/agendamento`
- `GET /api/periciaMedica/agendamento/{id}`
- `DELETE /api/periciaMedica/agendamento/{id}`
- `GET /api/periciaMedica/agendamento/especialidade`
- `GET /api/periciaMedica/agendamento/datas-disponiveis`
- `GET /api/periciaMedica/agendamento/horarios-disponiveis`
- `GET /api/periciaMedica/agendamento/all-horarios`
- `GET /api/periciaMedica/atendimento`
- `GET /api/periciaMedica/atendimento/validacao/pendente`
- `PUT /api/periciaMedica/atendimento/enviar/validacao/{id}`
- `PUT /api/periciaMedica/atendimento/validar/{id}`
- `PUT /api/periciaMedica/atendimento/nao/validar/{id}`
- `PUT /api/periciaMedica/atendimento/cancelar/{id}`

### Objetos funcionais implícitos

- Oferta de agenda
- Slot disponível
- Convocação/agendamento
- Fila regulada
- Pendência de validação

## 2. Camada Clínica

### Pergunta de negócio que esta camada responde

O que o médico concluiu sobre a condição do servidor e quais efeitos essa conclusão produz?

### Jornadas e ações que pertencem mais claramente a Clínica

- Registro de dados do paciente para contextualização assistencial.
- Observação do assistente e do médico.
- Motivo da perícia.
- CID.
- HDA.
- Exame físico.
- Diagnóstico.
- Ação pericial.
- Tipo e situação do laudo.
- Reagendamento por necessidade clínica.
- Licença médica, renovação e PDF.
- Replicação da decisão para outras matrículas.

### Sinais fortes no legado

- O prontuário guarda campos nitidamente clínicos.
- O CID ocupa posição central tanto no prontuário quanto no histórico.
- O laudo aprovado é condição explícita para certas saídas documentais.
- A licença médica detalha benefícios, afastamentos remunerados, restrições e aposentadoria por invalidez.

### APIs mais aderentes à Clínica

- `GET /api/licencas-medicas`
- `POST /api/licencas-medicas`
- `GET /api/licencas-medicas/{id}`
- `PUT /api/licencas-medicas/{id}`
- `DELETE /api/licencas-medicas/{id}`
- `GET /api/licencas-medicas/{id}/pdf`
- `GET /api/licencas-medicas/{id}/pdf-aposentadoria`
- `PUT /api/licencas-medicas/{id}/renovar`
- `GET /api/licencas-medicas/funcionario/{id}/dias-concedidos`
- `GET /api/licencas-medicas/tipos-restricao-medica`

### Objetos funcionais implícitos

- Prontuário pericial
- CID e hipótese diagnóstica
- Laudo
- Conduta
- Licença/restrição/readaptação
- Desfecho previdenciário

## 3. Zonas de mistura no legado

### Atendimento e validação na mesma trilha

O fluxo clínico não se encerra no consultório. O atendimento precisa passar por validação institucional, o que mistura ato clínico com governança regulatória.

### Reagendamento

O reagendamento pode nascer de falta de vaga ou de decisão clínica de retorno. É uma zona híbrida entre regulação e clínica.

### Múltiplas matrículas

A decisão clínica é una para a pessoa, mas o efeito administrativo precisa alcançar vínculos diferentes, aproximando medicina, regulação e RH.

## 4. Fronteira funcional recomendada para leitura do legado

### O que tende a permanecer em Regulação

- Agenda
- Especialidade
- Disponibilidade
- Marcação
- Convocação
- Filas operacionais
- Validação institucional

### O que tende a permanecer em Clínica

- Prontuário
- CID
- Exame e diagnóstico
- Laudo
- Decisão médica
- Licença e renovação
- Restrição/readaptação/invalidez

### O principal elo entre as duas camadas

- O agendamento viabiliza o ato clínico.
- O ato clínico devolve um resultado que volta para a governança por meio da validação e dos efeitos administrativos.

## 5. Diagnóstico funcional

- A distinção `regulação x clínica` explica melhor o domínio do que a separação simples `agendamento x atendimento`.
- O legado tenta operar uma central reguladora e um prontuário pericial no mesmo módulo.
- Para leitura de negócio, a clínica produz a decisão; a regulação organiza o acesso, controla o fluxo e legitima institucionalmente essa decisão.
