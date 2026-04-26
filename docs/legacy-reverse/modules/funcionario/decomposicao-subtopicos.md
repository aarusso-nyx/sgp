# FUNCIONARIO: decomposição em sub-tópicos funcionais

## Objetivo desta onda

Este artefato desce um nível abaixo do mapa fino do domínio `funcionario` e organiza o legado em blocos menores de jornada. A intenção é separar o cadastro mestre funcional em partes que normalmente viram módulos de produto ou trilhas independentes de refatoração.

## Árvore funcional do domínio

1. Identificação civil e qualificação básica
2. Documentação civil, profissional e de nomeação
3. Contato, endereço e dados de localização
4. Enquadramento funcional, vínculo e pagamento
5. Dossiê, anexos e observações permanentes
6. Posse e formalização do ingresso
7. Verbas individuais e reflexos cadastrais
8. Consolidação histórica do servidor

## 1. Identificação civil e qualificação básica

### Papel funcional

É a porta de entrada do servidor no produto. Aqui o legado procura responder quem é a pessoa, se já existe cadastro prévio por CPF, qual terminologia deve ser usada (`funcionario` ou `servidor`) e se o vínculo nasce como cedido.

### Blocos da jornada

- Abertura do formulário principal em `/funcionario/formulario` e `/servidor/formulario`.
- Busca por CPF para reaproveitamento cadastral e prevenção de duplicidade.
- Definição da matrícula e da matrícula oficial.
- Registro de nome, nome social, sexo, data de nascimento, filiação, estado civil, escolaridade e tipo sanguíneo.
- Marcação de servidor cedido com órgão e cargo de origem.

### Regras funcionais percebidas

- CPF é obrigatório e validado.
- Nome é obrigatório.
- A matrícula pode ficar bloqueada quando já existe vínculo ou quando o sistema está configurado para matrícula automática.
- O rótulo exibido ao usuário muda conforme a parametrização de terminologia institucional.
- O cadastro admite reaproveitamento de dados via consulta por CPF antes da confirmação do vínculo.

### Rotas e APIs centrais

- `funcionarioGestao`
- `funcionarioFormulario`
- `servidorGestao`
- `servidorFormulario`
- `GET /api/funcionario/cpf`
- `GET /api/funcionario/cpf/info`
- `POST /api/funcionario`
- `PUT /api/funcionario`

## 2. Documentação civil, profissional e de nomeação

### Papel funcional

Concentra a regularidade documental do servidor. O legado mistura documentos pessoais permanentes com atos formais de nomeação e registros profissionais exigidos por certos cargos.

### Blocos da jornada

- Aba `Documentação` do formulário principal.
- Registro de identidade, CTPS, PIS/PASEP, SUS, título de eleitor, CNH e alistamento.
- Registro do ato de nomeação: portaria/decreto, processo, ato, diário oficial e publicação.
- Registro profissional: conselho, número, registro, UF, município e data de expedição.

### Regras funcionais percebidas

- A nomeação é tratada como evento documental de alta relevância, mesmo quando a posse ocorre em módulo satélite.
- O registro profissional sugere exigência condicional por carreira ou função.
- O produto tenta preservar material probatório do ingresso e da habilitação profissional.

## 3. Contato, endereço e dados de localização

### Papel funcional

Agrupa os dados de contato e residência que sustentam comunicação institucional, correspondência, prova de vida, benefícios e relatórios.

### Blocos da jornada

- Aba `Contato & Endereço`.
- Estado e município de registro.
- Dados migratórios de chegada ao país.
- CEP, logradouro, número, complemento, UF, município e bairro.
- E-mail pessoal, e-mail corporativo, telefone principal e telefone opcional.

### Regras funcionais percebidas

- O legado diferencia contato pessoal de contato institucional.
- Endereço do servidor é tratado como dado mestre do cadastro, não como informação transitória.

## 4. Enquadramento funcional, vínculo e pagamento

### Papel funcional

É o coração do domínio para RH e Folha. Traduz a pessoa em vínculo remunerável: filial, lotação, centro de custo, jornada, vínculo, tipo de ingresso, datas funcionais, dependentes, sindicato, nível salarial, referência, FGTS, ATS, probatório, tipo de folha e dados bancários.

### Sub-blocos internos

#### 4.1 Vinculação organizacional

- Filial
- Lotação
- Centro de custo
- UF e município de trabalho

#### 4.2 Base do vínculo

- Jornada de trabalho
- Carga horária
- Vínculo
- Tipo de ingresso
- Data da posse
- Data de exercício/admissão

#### 4.3 Reflexos previdenciários e remuneratórios

- Dependentes de IR e salário-família
- Sindicato
- Efetivo, função gratificada e cargo em comissão
- Contrato temporário
- Abono permanência
- FGTS
- ATS/ADTS
- Estado probatório
- Tipo de folha

#### 4.4 Crédito e pagamento

- Tipo de conta
- Agência
- Conta
- Dígito
- Operação

#### 4.5 Situação funcional e benefícios acessórios

- Situação funcional
- Tipo de afastamento ou desligamento
- Vale-transporte
- Descontos por outros vínculos

### Regras funcionais percebidas

- O cadastro do vínculo é fortemente condicionado por tipo de vínculo e tipo de ingresso.
- Efetivo, comissionado e temporário convivem no mesmo formulário, mas com blocos próprios.
- Situação funcional atua como chave de comportamento para outras áreas, inclusive folha e saúde.
- O tipo de folha já nasce no cadastro funcional, revelando forte acoplamento com Folha de Pagamento.

### APIs mais associadas

- `GET /api/funcionario/status/desligado`
- `GET /api/funcionario/{id}/progressao`
- `GET /api/funcionario/vinculoCount/{id}`
- `GET /api/funcionarioCountByFilial/{filialId}`

## 5. Dossiê, anexos e observações permanentes

### Papel funcional

É a memória documental e narrativa do servidor. Reúne anexos classificados, observações textuais e registros que devem acompanhar a vida funcional independentemente do evento que os originou.

### Sub-blocos internos

#### 5.1 Dossiê do servidor

- Escolha do tipo de documento.
- Upload de arquivo.
- Observações do anexo.
- Listagem com ações de detalhe, edição, exclusão e download.

#### 5.2 Dossiê legado `observacaoDoc`

- Registro de observações.
- Data de emissão.
- Tipo e número do documento.
- Publicação, número de publicação e descrição do documento.

#### 5.3 Observações gerais

- Texto permanente exibido na ficha funcional.
- Uso explícito para ocorrências históricas, comportamentais ou de saúde.

### APIs mais associadas

- `GET /api/funcionario/{funcionarioId}/anexos`
- `DELETE /api/funcionario/{funcionarioId}/anexo/{anexoId}`
- `PUT /api/funcionarioAnexo`
- `GET /api/funcionarios/{funcionarioId}/observacao-geral`
- `PUT /api/funcionarios/{funcionarioId}/observacao-geral`

## 6. Posse e formalização do ingresso

### Papel funcional

A posse é um subfluxo próprio, mas funcionalmente pertence ao ciclo de ativação do servidor. O legado o trata como jornada formal de ingresso, com dados de vínculo, unidade organizacional, crédito, bens, documentos oficiais e emissão de termos.

### Blocos da jornada

- Seleção do candidato à posse.
- Preenchimento de informações principais.
- Definição da relação de vínculo.
- Escolha de unidade organizacional.
- Jornada de trabalho.
- Dados de crédito.
- Declaração de bens e valores.
- Cadastro de documentos e meios de publicação.
- Emissão/seleção de peças para impressão.
- Efetivação da posse.

### Regras funcionais percebidas

- A posse consolida o ato de ingresso e sua materialidade documental.
- O fluxo varia por natureza do vínculo, como comissionado, efetivo, temporário e outros perfis.

### APIs mais ligadas

- `GET /api/posse/funcionario/{funcionarioId}`
- `GET /api/posse/historico/{funcionarioId}`
- `GET /api/posse/funcionario/{funcionarioId}/cargo/{cargoId}/nivelSalarial`
- `GET /api/posse/funcionario/{funcionarioId}/filial/{filialId}/lotacao`

## 7. Verbas individuais e reflexos cadastrais

### Papel funcional

É o braço do cadastro voltado a parcelas e parâmetros individuais que alimentam a folha.

### Blocos da jornada

- Identificação do servidor.
- Definição de tipo de valor, recorrência, valor e parcelas.
- Escolha do tipo de folha.
- Definição do início de incidência por mês e ano.
- Inclusão de observação.
- Manutenção de verbas adicionadas.

### APIs mais associadas

- `verbasFuncionarioFormulario`
- `verbasServidorFormulario`
- `GET /api/funcionarioVerbas/{funcionarioId}`
- `POST /api/funcionarioVerbas/`

## 8. Consolidação histórica do servidor

### Papel funcional

É a leitura longitudinal do cadastro. Une ficha funcional, desligamentos, licenças, férias, transferências, vencimentos e contracheques processados para formar a narrativa do vínculo.

### Blocos da jornada

- Ficha funcional.
- Histórico de férias.
- Histórico de licenças.
- Histórico de licença-prêmio.
- Histórico de transferências.
- Histórico de vencimentos.
- Emissão de PDF da ficha.
- Consulta de contracheques por ano e competência.

### APIs centrais

- `GET /api/funcionario/{funcionarioId}/ficha`
- `GET /api/funcionario/{funcionarioId}/ficha/ferias`
- `GET /api/funcionario/{funcionarioId}/ficha/licencas`
- `GET /api/funcionario/{funcionarioId}/ficha/licenca-premio`
- `GET /api/funcionario/{funcionarioId}/ficha/transferencias`
- `GET /api/funcionario/{funcionarioId}/ficha/vencimentos`
- `GET /api/funcionario/{funcionarioId}/ficha/pdf`
- `GET /api/competencia/anos/funcionario/{funcionarioId}`
- `GET /api/competencia/porAno/funcionario/{funcionarioId}`

## Diagnóstico funcional desta decomposição

- O domínio `funcionario` não é apenas cadastro pessoal; ele já agrega ativação do vínculo, reflexos remuneratórios, base previdenciária, prontuário documental e histórico longitudinal.
- A futura refatoração tende a se beneficiar de uma separação entre pessoa, vínculo, enquadramento remuneratório, dossiê e histórico.
