# Requisição de Pessoal: decomposição focal em Demanda x Pipeline de Seleção

## Objetivo

Este artefato separa `requisicaoPessoal` em duas metades funcionais que o legado apresenta na mesma área: `Demanda` e `Pipeline de Seleção`.

## Leitura executiva

No produto legado, a requisição começa como necessidade de força de trabalho, mas rapidamente se transforma em uma trilha de captação e triagem de candidatos. A separação funcional mais útil é:

- `Demanda`: justificar a necessidade, desenhar a vaga, tramitar aprovação e acompanhar o processo requisitório.
- `Pipeline de Seleção`: captar candidatos, vincular currículos, analisar currículos, consultar banco de talentos e registrar a decisão sobre perfis.

## 1. Camada Demanda

### Pergunta de negócio que esta camada responde

Qual necessidade de pessoal foi formalmente aberta, por quem, com qual justificativa, para qual perfil e em qual prazo?

### Jornadas e ações que pertencem mais claramente à Demanda

- Abrir nova requisição.
- Registrar solicitante, filial, lotação, data de entrada e data limite.
- Marcar aumento de quadro ou substituição.
- Informar colaborador substituído.
- Registrar justificativa e data prevista de admissão.
- Compor a requisição por função, tipo de contratação, custo por vaga, quantidade e turno.
- Salvar rascunho.
- Encaminhar para aprovação.
- Aprovar, rejeitar, editar e cancelar.

### Sinais fortes no legado

- A lista principal de `Requisições de Pessoal` é orientada por processo e situação.
- A gestão de requisições funciona como fila decisória.
- As funções da vaga são parte constitutiva da demanda, não da seleção.
- A trilha de criação/alteração aparece como metadado do processo.

### Telas e APIs mais aderentes à Demanda

- `requisicaoPessoal.html`
- `requisicaoPessoal.form.html`
- `requisicaoPessoalGestao.html`
- `requisicaoPessoalGestao.form.html`
- `POST /api/requisicaoPessoal`
- `PUT /api/requisicaoPessoal`
- `PUT /api/requisicaoPessoal/alterar/{id}`
- `PUT /api/requisicaoPessoalGestao`
- `PUT /api/requisicaoPessoalGestao/alterar/{id}`

### Tabelas mais aderentes à Demanda

- `requisicaoPessoal.html`: processo, situação, requisitante, data limite, ações.
- `requisicaoPessoalGestao.html`: processo, data limite, solicitante, situação, ações.
- prévia de função no formulário: requisitos, cursos, habilidades, atividades.
- grade das funções da requisição: função, vagas, requisitos, cursos, habilidades, turno, atividades, ações.
- trilha de auditoria do processo: criado em, atualizado em, criado por, atualizado por.

## 2. Camada Pipeline de Seleção

### Pergunta de negócio que esta camada responde

Como a requisição aprovada é abastecida com candidatos e como esses candidatos são comparados, aprovados ou reprovados?

### Jornadas e ações que pertencem mais claramente ao Pipeline de Seleção

- Vincular candidatos e currículos ao processo.
- Registrar comentário inicial do RH.
- Baixar currículo.
- Remover candidato.
- Abrir a análise curricular.
- Aprovar ou reprovar candidato.
- Concluir a análise e devolver ao RH.
- Consultar banco de talentos.
- Ver detalhamento da vaga e do candidato.
- Selecionar ou reprovar perfis no banco de talentos.

### Sinais fortes no legado

- O pipeline só se abre quando a demanda alcança estado adequado, como `Aprovado`.
- A análise curricular é uma etapa formal distinta da captação.
- O banco de talentos atua como repositório e filtro de candidatos potenciais.
- A camada de seleção reaproveita a vaga como contexto, mas opera sobre perfis humanos e não mais sobre o desenho da necessidade.

### Telas e APIs mais aderentes ao Pipeline de Seleção

- `cadastrarCurriculo.form.html`
- `analiseCurriculo.form.html`
- `bancoTalentos.html`
- `bancoTalentos.form.html`
- `tabVagaDetalhe.tmpl.html`
- `POST /api/requisicaoPessoalGestao/candidato`
- `GET /api/requisicaoPessoalGestao/candidatos/{id}`
- `DELETE /api/requisicaoPessoalGestao/candidato/delete/{id}`
- `GET /api/requisicaoPessoal/analiseCurriculo/candidatos/{id}`
- `PUT /api/requisicaoPessoal/analiseCurriculo/aprovar`
- `PUT /api/requisicaoPessoal/analiseCurriculo/reprovar`
- `PUT /api/requisicaoPessoal/analiseCurriculo/concluir`

### Tabelas mais aderentes ao Pipeline de Seleção

- `cadastrarCurriculo.form.html`: candidatos, comentário, situação, opções.
- `analiseCurriculo.form.html`: candidatos selecionados pelo RH, opções.
- `bancoTalentos.html`, aba de vagas: vaga, data criação, status, vagas.
- `bancoTalentos.html`, aba de candidatos: matrícula, nome, vaga, vínculo, filial.
- `tabVagaDetalhe.tmpl.html`: candidatos, matrícula, nome, avaliação, formação, tempo de experiência, currículo.

## 3. Zonas de mistura no legado

### Função da vaga aparecendo junto da seleção

O pipeline depende da vaga desenhada na demanda, mas o detalhamento da função às vezes aparece muito próximo da experiência de seleção.

### Banco de talentos

O banco de talentos pode ser lido tanto como satélite do pipeline quanto como cadastro-base independente de candidatos.

### Situação do processo

A mesma situação governa atos da demanda e a abertura de etapas do pipeline.

## 4. Fronteira funcional recomendada para leitura do legado

### O que tende a permanecer em Demanda

- solicitação
- justificativa
- desenho da vaga
- prazo
- aprovação
- governança do processo

### O que tende a permanecer em Pipeline de Seleção

- candidatos
- currículos
- comentário do RH
- análise curricular
- banco de talentos
- decisão sobre perfis

### O principal elo entre as duas camadas

- a demanda cria o contexto da vaga
- o pipeline tenta preencher essa vaga com candidatos aderentes

## 5. Diagnóstico funcional

- A clivagem `demanda x pipeline de seleção` explica melhor o legado do que a simples divisão `requisitante x RH`.
- O domínio mistura um workflow requisitório com um mini ATS de recrutamento.
- Para refatoração futura, a transição de `requisição aprovada` para `captação/análise` é a principal fronteira funcional do domínio.
