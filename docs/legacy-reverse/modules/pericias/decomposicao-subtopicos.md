# Perícia Médica: decomposição em sub-tópicos funcionais

## Objetivo desta onda

Este artefato divide `periciaMedica` em blocos menores de trabalho. No legado, a área de saúde ocupacional combina gestão de agenda, convocação, atendimento clínico-pericial, validação, licença e efeitos funcionais no vínculo.

## Árvore funcional do domínio

1. Oferta assistencial e agenda médica
2. Convocação e agendamento
3. Atendimento pericial e prontuário
4. Reagendamento e continuidade clínica
5. Validação do atendimento
6. Laudo, licença e decisão funcional
7. Replicação e efeitos em múltiplas matrículas

## 1. Oferta assistencial e agenda médica

### Papel funcional

É a camada que forma a capacidade de atendimento do serviço médico.

### Blocos da jornada

- Cadastro de especialidade médica.
- Cadastro de médico.
- Cadastro e manutenção de agenda médica.
- Consulta de datas e horários disponíveis.

### APIs principais

- `GET /api/periciaMedica/agendamento/especialidade`
- `GET /api/periciaMedica/agendamento/datas-disponiveis`
- `GET /api/periciaMedica/agendamento/horarios-disponiveis`
- `GET /api/periciaMedica/agendamento/all-horarios`

## 2. Convocação e agendamento

### Papel funcional

É a jornada de marcação da perícia para um servidor.

### Blocos da jornada

- Busca do servidor por matrícula/nome.
- Registro do telefone de contato.
- Escolha da especialidade médica.
- Escolha da data.
- Escolha do horário e do médico.
- Registro de observação.
- Inclusão de anexo e descrição.

### APIs principais

- `GET /api/periciaMedica/agendamento`
- `POST /api/periciaMedica/agendamento`
- `GET /api/periciaMedica/agendamento/{id}`
- `DELETE /api/periciaMedica/agendamento/{id}`

## 3. Atendimento pericial e prontuário

### Papel funcional

É a execução clínica e administrativa da perícia.

### Blocos da jornada

- Dados do paciente.
- Observação do assistente.
- Motivo da perícia.
- CID.
- Número da perícia.
- HDA.
- Exame físico.
- Diagnóstico.
- Observação do médico.
- Ação e laudo.

### Regras funcionais percebidas

- O atendimento é mais que conclusão de agenda; ele gera prontuário.
- Assistente e médico deixam registros distintos.
- O laudo é consequência explícita da decisão do atendimento.

## 4. Reagendamento e continuidade clínica

### Papel funcional

Trata a perícia como processo longitudinal quando o caso exige retorno.

### Blocos da jornada

- Escolha de especialidade para a próxima perícia.
- Definição de período da próxima perícia.
- Definição de dias até a nova perícia.
- Definição da data da próxima perícia.

## 5. Validação do atendimento

### Papel funcional

É a camada de dupla checagem institucional da perícia.

### Blocos da jornada

- Envio do atendimento para validação.
- Consulta de pendentes de validação.
- Validação do atendimento.
- Não validação.
- Cancelamento.

### APIs principais

- `GET /api/periciaMedica/atendimento/validacao/pendente`
- `PUT /api/periciaMedica/atendimento/enviar/validacao/{id}`
- `PUT /api/periciaMedica/atendimento/validar/{id}`
- `PUT /api/periciaMedica/atendimento/nao/validar/{id}`
- `PUT /api/periciaMedica/atendimento/cancelar/{id}`

## 6. Laudo, licença e decisão funcional

### Papel funcional

Traduz o resultado médico em efeito administrativo sobre o vínculo.

### Blocos da jornada

- Tela `Prontuário / Laudo` de licença médica.
- Tipo de avaliação/solicitação.
- Escolha entre benefício parcial previdenciário e motivo de afastamento remunerado.
- Regras específicas para invalidez permanente.
- Consulta de histórico de prontuários/laudos.
- Abertura em PDF.

### APIs mais ligadas

- `licencaMedicaFormulario`
- `GET /api/licencas-medicas/funcionario/{id}/dias-concedidos`

## 7. Replicação e efeitos em múltiplas matrículas

### Papel funcional

Atende o cenário em que a mesma pessoa possui múltiplos vínculos/matrículas.

### Blocos da jornada

- `Replicar a perícia para outras matrículas`.
- Seleção das matrículas adicionais.
- Visualização da réplica por filial, lotação e cargo.
- Exclusão de matrículas replicadas antes da confirmação.

## Diagnóstico funcional desta decomposição

- `periciaMedica` mistura oferta, regulação, clínica, validação e efeito administrativo.
- O tratamento de múltiplas matrículas é um requisito funcional importante e não deve ser perdido numa modernização.
