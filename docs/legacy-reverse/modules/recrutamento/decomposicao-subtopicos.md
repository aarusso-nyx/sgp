# Requisição de Pessoal: decomposição em sub-tópicos funcionais

## Objetivo desta onda

Este documento separa `requisicaoPessoal` em unidades funcionais menores. O legado reúne abertura da demanda, composição da vaga, aprovação, captação de candidatos, análise curricular, banco de talentos e trilhas correlatas de estágio.

## Árvore funcional do domínio

1. Abertura e motivação da requisição
2. Desenho da vaga e composição por função
3. Tramitação e governança da aprovação
4. Captação e vínculo de currículos ao processo
5. Análise curricular e devolutiva ao RH
6. Banco de talentos e leitura do candidato
7. Programa de estágio correlato

## 1. Abertura e motivação da requisição

### Papel funcional

É a origem formal da necessidade de pessoal.

### Blocos da jornada

- Seleção do solicitante.
- Data de entrada.
- Situação do processo.
- Filial e lotação herdadas do solicitante.
- Data limite.
- Opção entre `Aumento de quadro` e `Substituição`.
- Seleção do colaborador substituído quando aplicável.
- Justificativa.
- Data prevista de admissão.

### APIs principais

- `POST /api/requisicaoPessoal`
- `PUT /api/requisicaoPessoal`
- `PUT /api/requisicaoPessoal/alterar/{id}`

## 2. Desenho da vaga e composição por função

### Papel funcional

Traduz a necessidade abstrata em vagas concretas a serem atendidas.

### Blocos da jornada

- Seleção da função.
- Seleção do tipo de contratação.
- Definição do custo por vaga.
- Definição da quantidade de vagas.
- Seleção de turno.
- Leitura automática de requisitos, cursos, habilidades e atividades da função.
- Inclusão da função no pedido.

### Regras funcionais percebidas

- A vaga é composta por uma ou mais funções.
- Requisitos, cursos, habilidades e atividades são herdados do cadastro da função.
- O pedido só parece apto a avançar quando ao menos uma função foi adicionada.

## 3. Tramitação e governança da aprovação

### Papel funcional

É o ciclo decisório da requisição.

### Blocos da jornada

- Salvar rascunho.
- Encaminhar para aprovação.
- Aprovar.
- Rejeitar.
- Gestão da requisição pela área de RH.

### APIs principais

- `GET /api/requisicaoPessoal/{id}`
- `GET /api/requisicaoPessoalGestao/{id}`
- `PUT /api/requisicaoPessoalGestao`
- `PUT /api/requisicaoPessoalGestao/alterar/{id}`

## 4. Captação e vínculo de currículos ao processo

### Papel funcional

É a fase em que o RH povoa a requisição aprovada com candidatos reais.

### Blocos da jornada

- Tela `Vincular Currículo de Candidatos ao Processo`.
- Comentário inicial.
- Nome do candidato.
- Upload ou vínculo do currículo.
- Salvamento do candidato no processo.
- Remoção do candidato.
- Download do currículo anexado.

### APIs principais

- `POST /api/requisicaoPessoalGestao/candidato`
- `GET /api/requisicaoPessoalGestao/candidatos/{id}`
- `DELETE /api/requisicaoPessoalGestao/candidato/delete/{id}`

## 5. Análise curricular e devolutiva ao RH

### Papel funcional

É a etapa em que o gestor ou avaliador aprecia os candidatos selecionados pelo RH.

### Blocos da jornada

- Listagem `Candidatos Selecionados pelo RH`.
- Download do currículo.
- Aprovar candidato.
- Reprovar candidato.
- Concluir e enviar para o RH.

### APIs principais

- `GET /api/requisicaoPessoal/analiseCurriculo/candidatos/{id}`
- `PUT /api/requisicaoPessoal/analiseCurriculo/aprovar`
- `PUT /api/requisicaoPessoal/analiseCurriculo/reprovar`
- `PUT /api/requisicaoPessoal/analiseCurriculo/concluir`

## 6. Banco de talentos e leitura do candidato

### Papel funcional

É o repositório e painel de leitura aprofundada de perfis disponíveis.

### Blocos da jornada

- Dados pessoais e de contato.
- Histórico profissional.
- Educação e qualificações.
- Habilidades e competências.
- Idiomas e certificados.
- Cursos e treinamentos adicionais.
- Links relevantes e currículo.
- Ações de `Selecionar` e `Reprovar`.

## 7. Programa de estágio correlato

### Papel funcional

Conecta recrutamento a uma esteira específica para estagiários.

### Blocos da jornada

- Estruturação do programa.
- Identificação do estagiário.
- Contratação.
- Controle da vida do estágio.
- Relatórios de estágio.

## Diagnóstico funcional desta decomposição

- `requisicaoPessoal` reúne abertura de demanda, desenho de vaga e esteira de seleção.
- O bloco com mais potencial de autonomia futura é a tríade `requisição -> pipeline de candidatos -> análise`.
