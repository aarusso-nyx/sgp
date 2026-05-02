# FUNCIONARIO: decomposição focal em Pessoa x Vínculo

## Objetivo

Este artefato separa o domínio `funcionario` em duas metades funcionais que o legado mantém fortemente acopladas na mesma ficha: `Pessoa` e `Vínculo`.

## Leitura executiva

No legado, a mesma tela registra ao mesmo tempo quem é a pessoa e como ela se relaciona com a administração. A consequência é que CPF, filiação e nome convivem com matrícula, lotação, tipo de folha, dados bancários e situação funcional. Para refatoração futura, a distinção funcional mais importante é:

- `Pessoa`: identidade civil, contato, documentação pessoal e memória documental da pessoa.
- `Vínculo`: relação jurídico-funcional, enquadramento organizacional, remuneração, situação funcional e efeitos históricos por matrícula.

## 1. Camada Pessoa

### Pergunta de negócio que esta camada responde

Quem é a pessoa física que está sendo cadastrada ou localizada?

### Entradas e jornadas que pertencem mais claramente a Pessoa

- Busca e reaproveitamento por CPF.
- Nome, nome social, sexo, data de nascimento, estado civil, filiação, raça, escolaridade e tipo sanguíneo.
- Documentos pessoais: identidade, CTPS, PIS/PASEP, SUS, título de eleitor, CNH e alistamento.
- Endereço, CEP, município, UF e contatos pessoais/corporativos.
- Foto.
- Dossiê documental e observações gerais, quando tratadas como memória permanente do indivíduo.

### Sinais fortes no legado

- O CPF é o principal eixo de recuperação cadastral.
- Há consultas específicas por CPF antes da criação do vínculo.
- O cadastro aceita reaproveitamento de dados pessoais antes da confirmação da matrícula.
- Parte do histórico documental acompanha a pessoa independentemente da competência de folha.

### APIs mais aderentes à camada Pessoa

- `GET /api/funcionario/cpf`
- `GET /api/funcionario/cpf/info`
- `GET /api/funcionario/form`
- `GET /api/funcionario/{funcionarioId}/form`
- `GET /api/funcionario/{funcionarioId}/foto`
- `GET /api/funcionario/{funcionarioId}/anexos`
- `PUT /api/funcionarioAnexo`
- `GET /api/funcionarios/{funcionarioId}/observacao-geral`
- `PUT /api/funcionarios/{funcionarioId}/observacao-geral`

### Objetos funcionais implícitos

- Pessoa física
- Documento pessoal
- Endereço
- Meio de contato
- Dossiê pessoal/funcional
- Observação permanente

## 2. Camada Vínculo

### Pergunta de negócio que esta camada responde

Qual é a relação funcional dessa pessoa com o órgão, e como essa relação produz direitos, lotação, pagamento e histórico administrativo?

### Entradas e jornadas que pertencem mais claramente a Vínculo

- Matrícula e matrícula oficial.
- Filial, lotação, centro de custo e unidade de trabalho.
- Jornada, carga horária, vínculo, tipo de ingresso e datas de posse/exercício.
- Sindicato, dependentes, tipo de folha, dados bancários, FGTS, ATS, probatório e abono permanência.
- Situação funcional, afastamento, desligamento, cessão e matrícula destino.
- Verbas individuais.
- Posse, progressão, transferências e ficha funcional.
- Contracheques e competências históricas vistos a partir da ficha do servidor.

### Sinais fortes no legado

- A matrícula pode ser gerada automaticamente e é tratada como sinal de ativação do vínculo.
- Existem APIs por `funcionarioId`, mas vários comportamentos revelam preocupação com múltiplas matrículas e contagem de vínculos.
- A situação funcional interfere em folha, saúde ocupacional e outras rotinas.
- A ficha funcional consolida eventos típicos de vínculo, não da pessoa em abstrato.

### APIs mais aderentes à camada Vínculo

- `POST /api/funcionario`
- `PUT /api/funcionario`
- `POST /api/funcionario/cedido`
- `PUT /api/funcionario/cedido`
- `GET /api/funcionario/vinculoCount/{id}`
- `GET /api/funcionarios/{cpf}/vinculo`
- `GET /api/funcionario/verbas/{funcionarioId}`
- `GET /api/funcionario/status/desligado`
- `PUT /api/funcionario/{id}/progressao`
- `GET /api/funcionario/{id}/progressao`
- `GET /api/funcionario/{funcionarioId}/ficha`
- `GET /api/funcionario/{funcionarioId}/ficha/*`
- `POST /api/posse/form`
- `PUT /api/posse/form`
- `POST /api/funcionarioVerbas/`
- `GET /api/funcionarioVerbas/{funcionarioId}`
- `POST /api/transferenciaFuncionario`

### Objetos funcionais implícitos

- Vínculo funcional
- Matrícula
- Enquadramento organizacional
- Enquadramento remuneratório
- Situação funcional
- Evento de vida funcional
- Crédito/pagamento

## 3. Zonas de mistura no legado

### Cadastro principal

A tela principal mistura pessoa e vínculo na mesma experiência. O usuário sai da identificação civil diretamente para filial, lotação e tipo de ingresso, sem mudança de contexto funcional.

### Dossiê

O dossiê parece ora pertencer à pessoa, ora ao vínculo. Certos documentos são do indivíduo; outros são claramente do ato funcional, como nomeação, cessão e posse.

### Contracheque dentro da ficha do servidor

Quando a ficha funcional incorpora contracheque por competência, o legado transforma a ficha do vínculo em ponto de acesso para resultados financeiros.

### Cedido

O tratamento de cedido mistura um atributo pessoal-administrativo com dados de vínculo de origem e destino.

## 4. Fronteira funcional recomendada para leitura do legado

### O que tende a permanecer em Pessoa

- Identidade civil
- Documentos de identificação
- Endereço e contatos
- Foto
- Parte do dossiê de natureza pessoal

### O que tende a permanecer em Vínculo

- Matrícula
- Estrutura organizacional
- Regras de ingresso
- Situação funcional
- Base remuneratória
- Posse, progressão, transferências e histórico funcional
- Verbas e contracheques

### O que precisa de critério de partição

- Dossiê e anexos
- Observações
- Documentação de nomeação
- Documentos de cessão e amparo ao fato

## 5. Diagnóstico funcional

- A maior ambiguidade do domínio `funcionario` é que o legado trata `servidor` como um agregado único, quando na prática opera sobre dois eixos distintos: pessoa e vínculo.
- Para leitura de negócio, `CPF` é o eixo natural da pessoa e `matrícula` é o eixo natural do vínculo.
- Essa clivagem ajuda a explicar por que o domínio transborda para posse, folha, saúde ocupacional, recadastramento e previdência.
