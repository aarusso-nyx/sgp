# Manual do Usuário — SGP Sistema de Gestão de Pessoas

**Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Draft
**Escopo:** Todos os módulos | **Depende de:** BRIEF.md, 50-arvore-menus.md, 00-glossario.md

---

## Histórico Funcional

O histórico funcional do servidor fica disponível em **RH > Funcionários > Histórico funcional**. A tela apresenta uma linha do tempo somente leitura com eventos de situação funcional, férias, licenças, licenças médicas e averbações de tempo de serviço. Os filtros por período e tipo de evento refinam a consulta sem alterar os registros.

O histórico é imutável: correções não editam nem removem eventos anteriores. Quando houver mudança funcional válida, o sistema cria novo evento na linha do tempo e preserva a trilha anterior para auditoria.

## Estágio Probatório

O estágio probatório é acompanhado em **Avaliação > Estágio probatório** para servidores estatutários. A lista operacional mostra servidores próximos de completar 36 meses de exercício e permite registrar avaliações parciais de 12, 24 e 36 meses com nota, decisão, avaliador e observação.

Somente usuários com permissão de avaliação podem registrar decisões. A aprovação final encerra o ciclo administrativo do estágio; reprovação ou prorrogação deve ser acompanhada pelo procedimento formal aplicável.

## Férias

As férias são solicitadas pelo **Portal do Servidor > Férias > Solicitar** e aprovadas na aplicação administrativa em **Módulo RH > Férias**. O servidor informa o período aquisitivo, até três parcelas de gozo e, quando aplicável, o abono pecuniário limitado a 10 dias. O sistema consulta o saldo por período aquisitivo, bloqueia solicitações com mais de três parcelas e exige que servidores celetistas tenham uma das parcelas com pelo menos 14 dias contínuos.

A chefia ou RH aprova ou cancela a programação antes do gozo. Cada alteração grava evento de auditoria imutável em `audit_event`, e o histórico funcional passa a exibir as férias aprovadas ou gozadas. O valor de férias, terço constitucional e reflexos em folha não são calculados nesta tela; esses valores são tratados no processamento de folha de férias.

## Licença Saúde / Perícia

A licença para tratamento de saúde inicia no **Portal do Servidor > Licença Saúde > Solicitar**, onde o servidor informa a janela desejada para a perícia oficial. A equipe de saúde acompanha a agenda em **Saúde > Licença de saúde e perícia**, registra o comparecimento e lança o parecer médico com decisão, CID-10, período e dias concedidos.

Quando o parecer é concedido, o sistema cria automaticamente a licença médica e o afastamento funcional do servidor, sem edição manual paralela. A consulta por servidor mostra somente as licenças visíveis ao tenant atual e o histórico funcional passa a exibir o afastamento correspondente. Indeferimentos ficam preservados no prontuário pericial sem gerar afastamento.

## Sumário

1. [Introdução](#1-introdução)
2. [Navegação Geral](#2-navegação-geral)
3. [Manual por Perfil](#3-manual-por-perfil)
   - 3.1 Administrador do Tenant
   - 3.2 Gestor de Recursos Humanos
   - 3.3 Analista de RH
   - 3.4 Gestor de Folha
   - 3.5 Analista de Folha
   - 3.6 Analista de Verbas
   - 3.7 Analista de Consignado
   - 3.8 Gestor Pericial
   - 3.9 Médico Perito
   - 3.10 Coordenador Pericial
   - 3.11 Agente Previdenciário
   - 3.12 Operador de Recadastramento
   - 3.13 Analista de Recrutamento
   - 3.14 Gestor de Requisição
   - 3.15 Avaliador Curricular
   - 3.16 Gestor de Estágio
   - 3.17 Avaliador de Desempenho
   - 3.18 Auditor / Controle Interno
4. [Portal do Servidor](#4-portal-do-servidor)
   - 4.1 Servidor Ativo
   - 4.2 Aposentado / Pensionista
   - 4.3 Candidato
5. [Operações Transversais](#5-operações-transversais)
6. [Glossário Rápido](#6-glossário-rápido)
7. [FAQ Consolidado](#7-faq-consolidado)

---

## 1. Introdução

### 1.1 O que é o SGP

O **SGP — Sistema de Gestão de Pessoas** é um ERP de Recursos Humanos e Folha de Pagamento desenvolvido para entes públicos: prefeituras, autarquias, fundos e institutos de previdência (RPPS) e demais órgãos da administração pública direta e indireta. Ele cobre, em um único ambiente integrado, os domínios de:

- Cadastro de pessoas e vínculos funcionais
- Vida funcional (afastamentos, transferências, progressões)
- Folha de pagamento (mensal, 13º, férias, rescisão, complementar)
- Benefícios previdenciários (aposentadoria, pensão, recadastramento)
- Saúde ocupacional e perícia médica
- Recrutamento, seleção e gestão de estágio
- Integrações fiscais e oficiais (eSocial, SIPREV, DIRF, remessa bancária)
- Transparência e auditoria

O SGP opera em modelo **multi-tenant SaaS**: cada ente contratante (tenant) tem seus dados completamente isolados. A terminologia interna é parametrizável — o sistema pode exibir "Servidor" ou "Funcionário" conforme a configuração do tenant.

### 1.2 Onde acessar

| Ambiente                     | URL                               | Público-alvo                                                       |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| **Aplicação Administrativa** | `https://sgp.seu-ente.gov.br/`    | Servidores de RH, Folha, Previdência, Perícia, Auditoria, Gestores |
| **Portal do Servidor**       | `https://portal.seu-ente.gov.br/` | Servidores ativos, aposentados, pensionistas, candidatos           |

> As URLs exatas são definidas pelo administrador de infraestrutura de cada ente. Consulte o responsável técnico local caso as URLs acima não funcionem.

📷 [inserir screenshot: tela inicial da aplicação administrativa com logotipo do tenant]

### 1.3 Como entrar (autenticação)

O SGP utiliza autenticação **OAuth2/OIDC via AWS Cognito**. Dependendo da configuração do seu ente, o login pode ocorrer de duas formas:

#### Opção A — Login direto pelo Cognito (padrão)

1. Acesse a URL da aplicação.
2. A tela de login do Cognito será exibida.
3. Informe seu **e-mail corporativo** e **senha**.
4. Se o MFA estiver habilitado para sua conta, informe o código de seis dígitos gerado pelo aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar).
5. Clique em **Entrar**.

#### Opção B — Login via Gov.br (quando habilitado pelo tenant)

1. Acesse a URL da aplicação.
2. Clique em **Entrar com Gov.br**.
3. Você será redirecionado ao portal Gov.br.
4. Autentique-se com seu CPF e senha Gov.br.
5. Autorize o acesso ao SGP quando solicitado.
6. Você será redirecionado de volta ao SGP já autenticado.

> A opção Gov.br depende da feature flag `GOV_BR_SSO_ENABLED`. Se o botão não aparecer, seu ente ainda não habilitou essa integração.

📷 [inserir screenshot: tela de login com campo de e-mail, senha e botão Gov.br]

#### Primeiro acesso

1. Clique em **Esqueci minha senha** na tela de login.
2. Informe seu e-mail cadastrado.
3. Verifique sua caixa de entrada — você receberá um link de redefinição com validade de 24 horas.
4. Clique no link, defina uma nova senha seguindo os requisitos exibidos na tela (mínimo 8 caracteres, letras maiúsculas, minúsculas, números e caractere especial).
5. Após redefinir, faça login normalmente.

### 1.4 Organização deste manual

Este manual está dividido em seções por **perfil de usuário**. Localize seu perfil no Sumário e vá diretamente à seção correspondente. As seções de Navegação Geral (seção 2) e Operações Transversais (seção 5) são comuns a todos os perfis.

| Seção    | Conteúdo                                                               |
| -------- | ---------------------------------------------------------------------- |
| 2        | Navegação da interface — menus, header, busca, notificações            |
| 3.1–3.18 | Manual específico por perfil administrativo                            |
| 4.1–4.3  | Portal do Servidor — servidor ativo, aposentado/pensionista, candidato |
| 5        | Operações comuns a todos (upload, MFA, suporte)                        |
| 6        | Glossário rápido                                                       |
| 7        | FAQ consolidado                                                        |

---

## 2. Navegação Geral

### 2.1 Header

O header é a barra horizontal no topo da tela. Ele contém:

| Elemento                  | Descrição                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| **Logo do tenant**        | Logotipo do ente configurado pelo Administrador. Clique para voltar ao Dashboard.          |
| **Nome do tenant**        | Exibido ao lado do logo (sigla e nome completo).                                           |
| **Campo de busca global** | Lupa ou caixa de texto — pesquisa pessoas, matrículas e funcionalidades. Atalho: `Ctrl+K`. |
| **Ícone de notificações** | Sino com contador de alertas não lidos. Clique para abrir o painel lateral.                |
| **Menu do usuário**       | Avatar com nome e papel atual. Clique para acessar Meu Perfil, Configurar MFA e Sair.      |

📷 [inserir screenshot: header completo com logo, busca, notificações e menu do usuário]

### 2.2 Sidebar dinâmica

A barra lateral esquerda exibe apenas os menus aos quais seu perfil tem acesso (RBAC). Os menus de primeiro nível são:

1. **Gestão** — estrutura organizacional e parametrizações
2. **Módulo RH** — cadastro funcional e vida laboral
3. **Folha de Pagamento** — folha, verbas, consignado
4. **Módulo Avaliação** — avaliação de desempenho e progressão
5. **Recrutamento e Seleção** — requisições, candidatos, estágio
6. **Consultas Gerenciais** — painéis e BI
7. **Relatório** — emissão de relatórios
8. **Módulo Previdenciário** — aposentadoria, pensão, recadastramento
9. **Auditoria** — trilha de auditoria
10. **Área de Saúde** — junta médica e SST
11. **Convênio** — convênios e descontos em folha

Clique em qualquer item de primeiro nível para expandir os submenus. O item ativo fica destacado com cor de destaque do tenant.

**Recolher/expandir sidebar:** clique no ícone de hambúrguer (`☰`) no topo da sidebar ou use o atalho `Ctrl+B`.

📷 [inserir screenshot: sidebar expandida mostrando menus de primeiro e segundo nível]

### 2.3 Busca global

A busca global (`Ctrl+K`) permite encontrar rapidamente:

- **Pessoas/servidores** — por nome, CPF ou matrícula.
- **Funcionalidades** — pelo nome da tela (ex.: "Folha de Pagamento", "Recadastramento").
- **Registros recentes** — os últimos itens acessados aparecem automaticamente.

**Como usar:**

1. Pressione `Ctrl+K` ou clique na lupa no header.
2. Digite o termo desejado (mínimo 3 caracteres para busca de pessoas).
3. Use as setas `↑` e `↓` para navegar nos resultados.
4. Pressione `Enter` para abrir o registro selecionado, ou `Esc` para fechar.

📷 [inserir screenshot: modal de busca global com resultados de pessoa e funcionalidades]

### 2.4 Breadcrumb e estado de sessão

O **breadcrumb** aparece abaixo do header e mostra a localização atual dentro da hierarquia de menus. Clique em qualquer nível para voltar àquela tela.

Exemplo: `Módulo RH > Funcionário > Cadastro > João da Silva`

O SGP mantém a **sessão ativa** enquanto houver interação. Após **30 minutos de inatividade**, a sessão expira automaticamente e você é redirecionado à tela de login. Salve seus trabalhos em andamento periodicamente com `Ctrl+S`.

### 2.5 Notificações in-app

O painel de notificações exibe alertas gerados pelo sistema, como:

- Conclusão de cálculo de folha em lote.
- Laudo pericial aguardando validação.
- Requisição de pessoal encaminhada para aprovação.
- Recadastramento próximo do vencimento.
- Erros em importações de arquivos.

**Como gerenciar notificações:**

1. Clique no ícone de sino no header.
2. O painel lateral se abre com a lista de notificações.
3. Clique em uma notificação para ir diretamente ao registro relacionado.
4. Clique em **Marcar todas como lidas** para limpar o contador.
5. Use o filtro por tipo para visualizar apenas notificações relevantes.

### 2.6 Acessibilidade

O SGP foi desenvolvido com suporte a acessibilidade:

| Recurso                   | Detalhe                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Leitor de tela**        | Compatível com NVDA (Windows) e VoiceOver (macOS/iOS). Todos os campos e botões possuem `aria-label`.      |
| **Navegação por teclado** | Use `Tab` para mover entre campos e `Shift+Tab` para retroceder.                                           |
| **Atalhos globais**       | `Ctrl+K` (busca), `Ctrl+B` (sidebar), `Ctrl+S` (salvar), `Ctrl+Z` (desfazer), `Esc` (fechar modal/painel). |
| **Contraste**             | Interface em conformidade com WCAG 2.1 nível AA.                                                           |
| **Zoom**                  | Use o zoom do navegador (`Ctrl++` / `Ctrl+-`) sem perda de funcionalidade até 200%.                        |

---

## 3. Manual por Perfil

---

## 3.1 Administrador do Tenant

### Responsabilidades

O Administrador do Tenant é responsável pela configuração inicial e manutenção do ambiente do ente no SGP. Suas atribuições incluem:

- Configurar a identidade visual e os parâmetros do sistema.
- Provisionar e gerenciar usuários e seus perfis de acesso.
- Habilitar ou desabilitar funcionalidades (feature flags).
- Monitorar a trilha de auditoria do tenant.

### Telas acessíveis

Consulte o documento `50-arvore-menus.md`, seção **Gestão**, para a lista completa. As principais telas são:

- Gestão > Parâmetros do Sistema
- Gestão > Usuários
- Gestão > Perfis e Papéis
- Gestão > Feature Flags
- Auditoria > Trilha de Auditoria

### 3.1.1 Configurar Parâmetros do Sistema

Os parâmetros do sistema (`ParametroSistema`) controlam a identidade do tenant e comportamentos globais.

**Jornada: Configurar identidade visual e terminologia**

1. Acesse **Gestão > Parâmetros do Sistema**.
2. A tela exibe os parâmetros organizados em abas: **Identidade**, **Matrícula**, **eSocial**, **Cognito**.
3. Na aba **Identidade**:
   a. Clique em **Alterar Logo Principal** e selecione o arquivo de imagem (PNG ou SVG, máximo 2 MB).
   b. O sistema fará upload para o S3 e exibirá a prévia.
   c. Repita o processo para o **Logo Secundário**, se aplicável.
   d. Preencha o campo **Sigla** com a sigla oficial do ente (ex.: `PMX` para Prefeitura Municipal de X).
   e. Preencha **Frase Inicial** — texto exibido na tela de boas-vindas do Dashboard.
   f. Em **Terminologia**, selecione entre **Servidor** ou **Funcionário** (afeta toda a interface).
4. Clique em **Salvar** (`Ctrl+S`).
5. Uma mensagem de sucesso confirma. Recarregue a página para ver as alterações.

📷 [inserir screenshot: tela de Parâmetros do Sistema, aba Identidade]

**Jornada: Configurar formato de matrícula**

1. Acesse **Gestão > Parâmetros do Sistema**, aba **Matrícula**.
2. Ative a opção **Matrícula Automática** se desejar que o sistema gere automaticamente.
3. Defina o **Formato** (ex.: `{PREFIXO}{SEQUENCIAL}{SUFIXO}`).
4. Informe o **Prefixo** (ex.: `PM`) e/ou **Sufixo** (ex.: `/2026`), se aplicável.
5. Se preferir matrícula manual, deixe a opção desativada.
6. Clique em **Salvar**.

> **Atenção:** A matrícula é travada após a criação do vínculo e não pode ser alterada. Defina o formato antes de iniciar admissões.

### 3.1.2 Provisionar usuários em massa

**Jornada: Importar usuários via planilha**

1. Acesse **Gestão > Usuários > Importar**.
2. Baixe o modelo de planilha clicando em **Baixar Modelo XLSX**.
3. Preencha a planilha com os campos: `nome`, `email`, `cpf`, `perfil` (nome exato do perfil cadastrado), `filial` (opcional).
4. Salve a planilha e retorne ao SGP.
5. Clique em **Selecionar Arquivo** e escolha a planilha preenchida.
6. O sistema exibirá uma prévia com validações. Erros são destacados em vermelho com descrição.
7. Corrija os erros na planilha, reimporte ou ignore linhas com erros clicando em **Ignorar inválidos**.
8. Clique em **Confirmar Importação**.
9. O sistema envia e-mail de boas-vindas com link de ativação para cada usuário importado.

📷 [inserir screenshot: tela de importação de usuários com prévia de validação]

**Jornada: Criar usuário individualmente**

1. Acesse **Gestão > Usuários > Novo Usuário**.
2. Preencha: **Nome completo**, **E-mail corporativo**, **CPF**.
3. Selecione o **Perfil** de acesso (ex.: Analista de RH).
4. Associe a **Filial** se necessário para restringir o acesso.
5. Clique em **Salvar**.
6. O usuário receberá e-mail com link de ativação e instruções para definir senha.

### 3.1.3 Configurar feature flags

**Jornada: Habilitar/desabilitar funcionalidades**

1. Acesse **Gestão > Feature Flags**.
2. A tela lista todas as flags disponíveis com seu estado atual (ativo/inativo).
3. Para habilitar, clique no toggle ao lado da flag desejada. Para desabilitar, clique novamente.
4. Confirme a ação na caixa de diálogo exibida (algumas flags requerem confirmação explícita pois afetam integrações).
5. A alteração é aplicada imediatamente para todos os usuários do tenant.

**Flags principais:**

| Flag                            | Efeito ao habilitar                      |
| ------------------------------- | ---------------------------------------- |
| `esocial.enabled`               | Ativa o menu e os envios eSocial S-1.2   |
| `PORTAL_SERVIDOR_ENABLED`       | Habilita o Portal do Servidor para login |
| `GOV_BR_SSO_ENABLED`            | Exibe o botão "Entrar com Gov.br"        |
| `PROVA_VIDA_PUBLIC_API_ENABLED` | Habilita prova de vida via API pública   |
| `AUDIT_FULL_TRACE_ENABLED`      | Registra auditoria em todos os domínios  |

### 3.1.4 Monitorar trilha de auditoria

1. Acesse **Auditoria > Trilha de Auditoria**.
2. Use os filtros disponíveis:
   - **Período:** datas inicial e final.
   - **Usuário:** busque pelo nome ou e-mail do usuário.
   - **Domínio:** selecione o módulo (ex.: `FOLHA`, `VIDA_FUNCIONAL`).
   - **Ação:** filtre por `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `EXPORT`, `PRINT`.
3. Clique em **Buscar**.
4. A lista exibe: data/hora, usuário, IP, domínio, entidade, ação.
5. Clique em qualquer registro para ver o **diff JSONB** — as alterações antes e depois, campo a campo.
6. Para exportar, clique em **Exportar CSV** ou **Exportar XLSX**.

📷 [inserir screenshot: tela de trilha de auditoria com filtros e detalhe de diff]

### FAQ — Administrador do Tenant

**P: Posso ter mais de um Administrador do Tenant?**
R: Sim. Atribua o perfil de Administrador do Tenant a múltiplos usuários. Recomenda-se pelo menos dois para redundância.

**P: Ao alterar a terminologia de "Funcionário" para "Servidor", os dados históricos são afetados?**
R: Não. A terminologia é apenas um rótulo de interface. Os dados permanecem inalterados.

**P: A importação de usuários em massa cria as contas no Cognito automaticamente?**
R: Sim. O sistema provisiona o usuário no Cognito UserPool do tenant e dispara o e-mail de boas-vindas.

**Erros comuns:**

| Erro                    | Causa                                    | Solução                                                        |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| "E-mail já cadastrado"  | O e-mail já existe no tenant             | Verifique em Gestão > Usuários se o usuário já está cadastrado |
| "Perfil não encontrado" | Nome do perfil na planilha não coincide  | Use exatamente o nome do perfil como aparece na tela de Perfis |
| "Upload de logo falhou" | Arquivo muito grande ou formato inválido | Use PNG ou SVG com menos de 2 MB                               |

---

## 3.2 Gestor de Recursos Humanos

### Responsabilidades

O Gestor de RH supervisiona a gestão do quadro de pessoal. Aprova ou rejeita solicitações de admissão, valida transferências, afastamentos e acompanha progressões salariais. Não realiza cadastros diretamente — essa é responsabilidade do Analista de RH.

### Telas acessíveis

- Módulo RH > Quadro de Pessoal (consulta)
- Módulo RH > Requisições de Pessoal (aprovação)
- Módulo RH > Transferências (validação)
- Módulo RH > Afastamentos (validação)
- Módulo RH > Progressões (acompanhamento)
- Consultas Gerenciais > Relatório Gerencial

### 3.2.1 Consultar situação do quadro

1. Acesse **Módulo RH > Quadro de Pessoal**.
2. Utilize os filtros: **Filial**, **Lotação**, **Tipo de Vínculo**, **Situação Funcional**.
3. Clique em **Buscar**.
4. A grade exibe: matrícula, nome, cargo, lotação, situação, data de ingresso.
5. Clique em qualquer servidor para abrir o **Resumo Funcional** com dados consolidados.
6. Para exportar o quadro, clique em **Exportar XLSX** ou **Gerar Relatório PDF**.

📷 [inserir screenshot: tela de quadro de pessoal com grade e filtros]

### 3.2.2 Aprovar requisições de pessoal

1. Acesse **Recrutamento e Seleção > Requisições de Pessoal**.
2. Filtre por **Situação: EM_PROCESSO** para ver as pendentes de aprovação.
3. Clique na requisição para abrir o detalhe.
4. Revise: justificativa, filial, lotação, vagas, tipo de contratação, requisitos.
5. Para aprovar, clique em **Aprovar**. Confirme na caixa de diálogo.
6. Para rejeitar, clique em **Rejeitar**, informe o **motivo** obrigatoriamente, e confirme.
7. O solicitante é notificado por e-mail e notificação in-app.

📷 [inserir screenshot: detalhe de requisição com botões Aprovar e Rejeitar]

### 3.2.3 Validar transferências

1. Acesse **Módulo RH > Transferências > Pendentes de Validação**.
2. Clique na transferência para ver o detalhe: servidor, filial origem, filial destino, lotação, data, com ou sem ônus.
3. Verifique a conformidade com a política interna do ente.
4. Clique em **Validar** para confirmar ou **Devolver** informando justificativa.

### 3.2.4 Validar afastamentos

1. Acesse **Módulo RH > Afastamentos > Pendentes de Validação**.
2. Revise o afastamento: tipo, motivo, período, documentação anexada.
3. Verifique se o limite anual do motivo não foi excedido (o sistema alerta automaticamente).
4. Clique em **Validar** ou **Devolver com justificativa**.

### 3.2.5 Acompanhar progressões

1. Acesse **Módulo Avaliação > Progressões**.
2. Filtre por período, tipo (Mérito, Titularidade, Judicial, Correção Salarial) e filial.
3. Clique em um servidor para ver o histórico de progressões e a progressão pendente, se houver.
4. Para progressões aprovadas por avaliação de desempenho, o sistema exibe a nota e o indicativo de mérito.

### FAQ — Gestor de Recursos Humanos

**P: Posso aprovar uma requisição parcialmente (apenas algumas vagas)?**
R: Não diretamente. Devolva a requisição com orientação para o solicitante ajustar a quantidade de vagas e reenviar.

**P: O sistema bloqueia afastamento que excede o limite anual?**
R: Sim. O sistema rejeita automaticamente o registro e exibe a mensagem de limite excedido. O Analista de RH deve consultar o Gestor para tratamento excepcional.

---

## 3.3 Analista de RH

### Responsabilidades

O Analista de RH executa o ciclo completo de vida do servidor: admissão, formalização de posse, registros de transferência, afastamentos, desligamentos e manutenção do dossiê documental.

### Telas acessíveis

- Módulo RH > Funcionário (CRUD completo)
- Módulo RH > Posse (Efetivo, Comissionado, Contratado)
- Módulo RH > Afastamentos
- Módulo RH > Transferências
- Módulo RH > Desligamentos
- Módulo RH > Dossiê / Anexos
- Módulo RH > Ficha Funcional

### 3.3.1 Admitir servidor — Jornada A1 a A4

A admissão de um novo servidor segue quatro etapas (cenários A1–A4 do golden scenario).

#### Etapa A1 — Cadastro da pessoa e vínculo (matrícula automática)

1. Acesse **Módulo RH > Funcionário > Novo**.
2. O sistema verifica se já existe pessoa com o CPF informado:
   - Se **CPF já cadastrado**: o sistema exibe os dados existentes e pergunta se deseja reutilizar. Clique em **Reutilizar Dados** para aproveitar os dados pessoais e documentais.
   - Se **CPF novo**: preencha todos os campos do formulário.
3. Preencha os **Dados Pessoais**:
   - Nome completo, nome social (opcional), sexo, data de nascimento, estado civil.
   - Filiação (mãe obrigatória).
   - Raça/cor, grau de instrução, tipo sanguíneo.
   - Nacionalidade; se naturalizado, informe data de chegada ao país.
4. Preencha os **Dados de Endereço**:
   - Informe o CEP e clique em **Buscar CEP** para preenchimento automático.
   - Complete número, complemento e bairro.
5. Preencha os **Dados de Contato**:
   - E-mail pessoal (obrigatório), e-mail corporativo (opcional), telefone principal.
6. Na aba **Documentos**, cadastre ao menos o **RG** e o **PIS/PASEP**:
   - Clique em **Adicionar Documento**, selecione o tipo, preencha número, órgão emissor, data de emissão e UF.
7. Clique em **Próximo** para avançar para os Dados Funcionais.
8. Preencha os **Dados do Vínculo**:
   - **Filial** (obrigatório) → o campo **Lotação** é carregado automaticamente conforme a filial.
   - **Lotação** → o campo **Centro de Custo** é carregado automaticamente.
   - **Tipo de Vínculo**: Efetivo, Comissionado, Contratado, Cedido, Prestador, Temporário.
   - **Tipo de Ingresso**, **Cargo**, **Função**, **Nível Salarial**, **Referência Salarial**.
   - **Jornada**, **Carga Horária**, **Turno**, **Tipo de Folha**.
9. Se `matricula_automatica = true`, a matrícula é gerada automaticamente (exibida no topo do formulário). Caso contrário, informe a matrícula manualmente.
10. Clique em **Salvar Rascunho** para salvar sem finalizar, ou **Salvar e Avançar** para ir à etapa de posse.

📷 [inserir screenshot: formulário de cadastro de funcionário, aba Dados Pessoais]

#### Etapa A2 — Cadastro com matrícula manual

Quando `matricula_automatica = false`:

1. Siga os mesmos passos da etapa A1.
2. No campo **Matrícula**, informe o número manualmente.
3. O sistema valida unicidade da matrícula dentro do tenant.
4. Clique em **Salvar**.

> **Atenção:** A matrícula não pode ser alterada após o salvamento.

#### Etapa A3 — Formalizar posse

A posse formaliza o ingresso do servidor. O tipo de posse varia conforme o vínculo: **Efetivo**, **Comissionado** ou **Contratado**.

1. Acesse **Módulo RH > Funcionário**, localize o servidor (situação `CADASTRO_BASE`).
2. Clique em **Registrar Posse**.
3. Selecione o **Tipo de Posse** conforme o vínculo.
4. Preencha:
   - **Data da Posse** (obrigatório).
   - **Data de Fim de Contrato** (obrigatório para Contratado e Comissionado).
   - **Opção de Remuneração** e **Bens Declarados** (se exigido pelo ente).
   - Dados bancários: **Banco**, **Agência**, **Conta**, **Dígito**, **Operação**, **Tipo de Conta**.
5. Clique em **Gerar Termo de Posse** para gerar o PDF — o arquivo é salvo automaticamente no S3 e vinculado ao registro.
6. Após assinatura física ou digital, clique em **Confirmar Posse**.
7. O vínculo muda para situação **ATIVO**.

📷 [inserir screenshot: tela de registro de posse com campos de data e dados bancários]

#### Etapa A4 — Associar verba individual ao servidor

1. Com o servidor em situação **ATIVO**, acesse **Módulo RH > Funcionário > [Nome do Servidor] > Verbas Individuais**.
2. Clique em **Adicionar Verba**.
3. Selecione a **Verba** (lista filtrada pelas elegibilidades do cargo/vínculo do servidor).
4. Defina:
   - **Tipo de Valor**: fixo ou percentual.
   - **Valor** ou **Percentual**.
   - **Recorrência**: mensal, eventual, parcelas.
   - **Parcelas Totais** (se parcelado).
   - **Tipo de Folha** (mensal, 13º, etc.).
   - **Competência Inicial** (mês/ano a partir do qual a verba entra no cálculo).
   - **Observação** (opcional).
5. Clique em **Salvar**.

📷 [inserir screenshot: tela de verbas individuais do servidor com lista e formulário de adição]

### 3.3.2 Registrar transferência

1. Acesse **Módulo RH > Funcionário > [Nome do Servidor] > Transferências**.
2. Clique em **Nova Transferência**.
3. Preencha:
   - **Filial Destino**, **Lotação Destino**, **Centro de Custo Destino**.
   - **Data da Transferência**.
   - **Designado**: marque se o servidor foi designado para função na nova lotação.
   - **Com Ônus**: marque se a origem mantém os custos.
   - **Justificativa** (obrigatório).
4. Clique em **Salvar e Encaminhar para Validação**.
5. O Gestor de RH recebe notificação para validar a transferência.

### 3.3.3 Registrar afastamento

1. Acesse **Módulo RH > Funcionário > [Nome do Servidor] > Situação Funcional**.
2. Clique em **Registrar Afastamento**.
3. Selecione o **Motivo de Afastamento** (lista parametrizada).
4. Informe **Data de Início** e **Data Prevista de Retorno**.
5. Adicione **Justificativa** e eventuais **Documentos** de suporte (upload S3).
6. Clique em **Salvar**.
7. O sistema valida o limite anual para o motivo escolhido. Se excedido, exibe erro.
8. O Gestor de RH recebe notificação para validar.

> **Regra automática:** Se não houver retorno registrado ao fim do período, o sistema aciona o job diário que sugere a **sustação automática** do vínculo.

### 3.3.4 Gerenciar dossiê

O dossiê é o repositório documental do servidor.

1. Acesse **Módulo RH > Funcionário > [Nome do Servidor] > Dossiê**.
2. Clique em **Adicionar Documento**.
3. Selecione o **Tipo de Documento** (parametrizado).
4. Preencha: **Número do Documento**, **Data de Emissão**, **Publicação** (número, data, página, meio).
5. Clique em **Selecionar Arquivo** e faça upload do documento (PDF, até 20 MB).
6. Adicione **Observações** se necessário.
7. Clique em **Salvar**.
8. O arquivo é salvo no S3 com chave determinística `{tenant}/dossie/{funcionario_id}/{uuid}.pdf`.

Para **baixar** um documento do dossiê: clique no ícone de download ao lado do documento. O sistema gera uma URL pré-assinada válida por 15 minutos.

Para **excluir**: clique no ícone de lixeira, confirme. O arquivo é removido do S3.

📷 [inserir screenshot: tela de dossiê com lista de documentos e botões de ação]

### FAQ — Analista de RH

**P: O que acontece se eu tentar cadastrar um CPF que já existe em outro vínculo?**
R: O sistema detecta o CPF e oferece reutilização dos dados pessoais. Aceite para evitar duplicidades.

**P: Posso corrigir dados pessoais após a posse?**
R: Sim, exceto a matrícula. Acesse o cadastro do servidor e edite os campos desejados.

**P: Como registrar um servidor cedido de outro órgão?**
R: Selecione o tipo de vínculo **Cedido** e preencha a aba **Detalhe de Cedência** com: órgão de origem, cargo de origem, documento de amparo (número, data, tipo) e publicação. O anexo digitalizado é obrigatório.

**Erros comuns:**

| Erro                        | Causa                                      | Solução                                     |
| --------------------------- | ------------------------------------------ | ------------------------------------------- |
| "CPF inválido"              | Dígito verificador incorreto               | Verifique o CPF no documento físico         |
| "Idade mínima não atingida" | Data de nascimento indica menos de 14 anos | Confirme a data informada                   |
| "PIS/PASEP já cadastrado"   | Duplicidade inter-tenant                   | Entre em contato com o suporte para análise |
| "Matrícula já existe"       | Matrícula manual já utilizada              | Consulte o cadastro ou use outra numeração  |

---

## 3.4 Gestor de Folha

### Responsabilidades

O Gestor de Folha controla o ciclo mensal de processamento: abertura da competência, criação de folhas, agendamento de fechamento e reaberturas excepcionais.

### Telas acessíveis

- Folha de Pagamento > Competências
- Folha de Pagamento > Folhas por Filial
- Folha de Pagamento > Lote de Processamento
- Folha de Pagamento > Fechamento Programado
- Relatório > Relatório de Folha

### 3.4.1 Abrir competência

1. Acesse **Folha de Pagamento > Competências**.
2. Verifique se existe competência aberta. Só pode haver uma competência com status `ABERTA` por tenant.
3. Clique em **Nova Competência**.
4. Informe **Mês** e **Ano**.
5. Clique em **Abrir Competência**.
6. A competência é criada com status `ABERTA` e a data de abertura é registrada automaticamente.

📷 [inserir screenshot: tela de competências com lista e botão Nova Competência]

### 3.4.2 Criar folhas por filial

Com a competência aberta, crie as folhas de pagamento para cada combinação de filial × tipo de processamento.

1. Acesse **Folha de Pagamento > Folhas por Filial**.
2. Selecione a **Competência** ativa.
3. Clique em **Criar Folha**.
4. Selecione:
   - **Empresa Matriz**.
   - **Filial**.
   - **Tipo de Processamento**: Mensal, 13º Adiantamento, 13º Integração, Férias, Rescisão, Complementar, Adiantamento Salarial.
   - **Período Inicial** e **Período Final** (datas de referência para o cálculo).
5. Clique em **Criar**.
6. A folha é criada com status `DESBLOQUEADO` e situação `PENDENTE`.
7. Repita para cada filial e tipo de processamento necessário.

> **Dica:** Para criar folhas em múltiplas filiais de uma vez, use **Criar Folhas em Lote** e selecione as filiais desejadas na lista.

📷 [inserir screenshot: tela de criação de folha com campos de filial e tipo de processamento]

### 3.4.3 Agendar fechamento programado

O fechamento programado permite definir uma data e hora para que o sistema feche automaticamente a competência.

1. Acesse **Folha de Pagamento > Fechamento Programado**.
2. Selecione a **Competência**.
3. Informe a **Data e Hora de Fechamento** programado.
4. Clique em **Agendar**.
5. O status da competência muda para `PROGRAMADA_FECHAR`.
6. No horário definido, o job `daily:competencia-programada-fechamento` executa o fechamento automaticamente.

> Para cancelar o agendamento, clique em **Cancelar Agendamento**. A competência volta ao status `ABERTA`.

### 3.4.4 Executar lote de cálculo

1. Acesse **Folha de Pagamento > Lote de Processamento**.
2. Clique em **Novo Lote**.
3. Configure:
   - **Competência**.
   - **Tipo de Processamento**.
   - **Filiais** (selecione uma ou mais).
   - **Período Inicial** e **Período Final**.
4. Clique em **Iniciar Lote**.
5. O sistema enfileira o processamento. A tela exibe barras de progresso:
   - **Progresso das folhas** (%).
   - **Progresso dos contracheques** (%).
6. Aguarde a conclusão. Você receberá notificação in-app ao terminar.
7. Verifique o status: `CALCULADO` indica sucesso; `ERRO` indica falha em algum contracheque.

📷 [inserir screenshot: tela de lote de processamento com barras de progresso]

### 3.4.5 Reabrir competência anterior

Use com cautela — reabrir uma competência fechada permite reprocessamento de folhas já bloqueadas.

1. Acesse **Folha de Pagamento > Competências**.
2. Localize a competência com status `FECHADA`.
3. Clique em **Reabrir**.
4. O sistema exibe aviso: "Esta ação desbloqueará as folhas da competência. Confirme se deseja prosseguir."
5. Informe a **Justificativa** (obrigatório — registrada na trilha de auditoria).
6. Clique em **Confirmar Reabertura**.
7. A competência volta ao status `ABERTA` e as folhas voltam ao status `DESBLOQUEADO`.

### FAQ — Gestor de Folha

**P: Posso ter duas competências abertas ao mesmo tempo?**
R: Não. O sistema permite apenas uma competência `ABERTA` por tenant por vez.

**P: O lote de cálculo pode ser interrompido?**
R: Sim. Clique em **Cancelar Lote** na tela de acompanhamento. Os contracheques já calculados permanecem; os pendentes voltam ao status `PENDENTE`.

**P: O fechamento automático falha se houver folhas com erro?**
R: Sim. O sistema só executa o fechamento automático se todas as folhas estiverem com situação `CALCULADO`. Resolva os erros antes da data agendada.

---

## 3.5 Analista de Folha

### Responsabilidades

O Analista de Folha opera o dia a dia do processamento: lançamentos manuais, importações, reprocessamentos seletivos e emissão de contracheques.

### Telas acessíveis

- Folha de Pagamento > Lançamentos
- Folha de Pagamento > Importar Planilha
- Folha de Pagamento > Reprocessamento Seletivo
- Folha de Pagamento > Contracheques
- Relatório > Relatório Financeiro

### 3.5.1 Lançamento manual

1. Acesse **Folha de Pagamento > Lançamentos**.
2. Selecione a **Competência** e a **Folha** (filial + tipo de processamento).
3. Clique em **Novo Lançamento**.
4. Busque o **Servidor** por nome, CPF ou matrícula.
5. Selecione a **Verba** (apenas verbas com elegibilidade compatível são exibidas).
6. Informe o **Valor** (deve ser maior que zero).
7. Selecione o **Tipo**: Manual.
8. Clique em **Salvar**.

> **Atenção:** Lançamentos só são possíveis em folhas com status `DESBLOQUEADO`.

📷 [inserir screenshot: formulário de lançamento manual com busca de servidor e verba]

### 3.5.2 Importação de planilha de lançamentos

1. Acesse **Folha de Pagamento > Importar Planilha**.
2. Selecione a **Competência** e a **Folha**.
3. Baixe o **Modelo de Planilha** clicando no link correspondente.
4. Preencha a planilha com: matrícula, código da verba, valor.
5. Retorne ao SGP e clique em **Selecionar Arquivo**.
6. O sistema valida e exibe um relatório de erros, se houver.
7. Corrija os erros ou clique em **Importar Somente Válidos**.
8. Clique em **Confirmar Importação**.

> **Importante:** A importação é **saneadora** — substitui lançamentos existentes das mesmas verbas para os mesmos servidores. Use com atenção.

### 3.5.3 Reprocessamento seletivo

1. Acesse **Folha de Pagamento > Reprocessamento Seletivo**.
2. Selecione a **Competência** e a **Folha**.
3. Escolha o **Modo**:
   - **Seletivo**: marque individualmente os contracheques a reprocessar.
   - **Total**: reprocessa toda a folha.
   - **Pendentes apenas**: reprocessa apenas contracheques com situação `PENDENTE` ou `ERRO`.
4. Para o modo seletivo, use a busca e marque os servidores.
5. Clique em **Reprocessar**.
6. Acompanhe o progresso na barra exibida.

### 3.5.4 Emissão de contracheques

**Emitir contracheque individual:**

1. Acesse **Folha de Pagamento > Contracheques**.
2. Selecione a **Competência** e busque o servidor.
3. Clique no contracheque desejado.
4. Clique em **Visualizar PDF** para abrir o documento no navegador.
5. Clique em **Baixar PDF** para salvar.

> O contracheque é gerado pelo `sgp-report-service` com o template SERVIDOR ou PENSIONISTA conforme o tipo.

**Emitir contracheques em massa:**

1. Na tela de contracheques, aplique os filtros desejados (filial, tipo de processamento, etc.).
2. Clique em **Emitir em Massa**.
3. Confirme — o sistema enfileira a geração dos PDFs.
4. Quando concluído, você receberá notificação in-app com link para baixar o ZIP consolidado.

📷 [inserir screenshot: tela de contracheques com opção de emissão em massa]

### 3.5.5 Relatório financeiro

1. Acesse **Relatório > Relatório Financeiro**.
2. Selecione a **Competência**.
3. Clique em **Gerar Relatório**.
4. O sistema calcula os totais e exibe o relatório na tela.
5. Para persistir o relatório, clique em **Salvar Relatório** — o status muda de `NAO_SALVO` para `SALVO`.
6. Clique em **Exportar PDF** ou **Exportar XLSX** para download.

### FAQ — Analista de Folha

**P: Como corrigir um lançamento já importado?**
R: Exclua o lançamento incorreto em Lançamentos > localizar o servidor > excluir a linha, e insira o valor correto manualmente ou reimporte a planilha.

**P: É possível importar lançamentos para múltiplas folhas de uma vez?**
R: Não. A importação é feita folha a folha.

**Erros comuns:**

| Erro                            | Causa                                  | Solução                                                                  |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| "Folha bloqueada"               | A folha está com status BLOQUEADO      | Solicite ao Gestor de Folha o desbloqueio ou a reabertura da competência |
| "Verba sem elegibilidade"       | A verba não é elegível para o servidor | Verifique elegibilidades no cadastro da verba                            |
| "Valor deve ser maior que zero" | Valor zero foi informado               | Informe um valor positivo                                                |

---

## 3.6 Analista de Verbas

### Responsabilidades

O Analista de Verbas gerencia o catálogo de verbas (rubricas), suas fórmulas de cálculo em DSL e as regras de elegibilidade.

### Telas acessíveis

- Folha de Pagamento > Verbas
- Folha de Pagamento > Fórmulas
- Folha de Pagamento > Elegibilidade
- Folha de Pagamento > Importar Verbas (Servidor / Pensionista)

### 3.6.1 Cadastro de verba

1. Acesse **Folha de Pagamento > Verbas > Nova Verba**.
2. Preencha:
   - **Código** (único no tenant).
   - **Descrição**.
   - **Tipo**: Provento, Desconto, Base, Apoio ao Cálculo.
   - **Recorrência**: mensal, eventual, parcelada.
   - **Parcelas Padrão** (se recorrência parcelada).
3. Clique em **Salvar**.

📷 [inserir screenshot: formulário de cadastro de verba]

### 3.6.2 Edição de fórmula DSL

1. Acesse **Folha de Pagamento > Verbas > [Código da Verba] > Fórmulas**.
2. Clique em **Nova Fórmula** (ou edite a vigente).
3. No campo **Texto DSL**, escreva a expressão usando os atributos disponíveis.
4. Use o painel lateral **Atributos Disponíveis** para consultar as chaves semânticas (ex.: `salario_base`, `carga_horaria`, `dias_trabalhados`).
5. Clique em **Validar Fórmula** — o sistema compila para SQL e reporta erros de sintaxe.
6. Se válida, defina:
   - **Data de Vigência Início** e **Data de Vigência Fim** (opcional).
7. Marque **Ativa**.
8. Clique em **Salvar**.

> **Importante:** A fórmula é compilada para SQL parametrizado no momento do cálculo. Nunca use valores fixos sensíveis diretamente na expressão — use atributos de fórmula.

📷 [inserir screenshot: editor de fórmula DSL com painel de atributos]

### 3.6.3 Gestão de elegibilidade

A elegibilidade define quais servidores são afetados por uma verba no cálculo.

1. Acesse **Folha de Pagamento > Verbas > [Código] > Elegibilidade**.
2. Clique em **Adicionar Regra de Elegibilidade**.
3. Selecione o **Critério**:
   - **Por Servidor** (individual — use apenas para exceções).
   - **Por Cargo**.
   - **Por Função**.
   - **Por Tipo de Vínculo**.
   - **Por Categoria Profissional**.
   - **Por Tipo de Folha**.
4. Selecione o valor correspondente ao critério.
5. Clique em **Salvar**.

### 3.6.4 Importação de verbas (servidor e pensionista)

A importação de verbas é saneadora: substitui os valores existentes das verbas importadas para os servidores constantes no arquivo.

1. Acesse **Folha de Pagamento > Importar Verbas > [Servidor ou Pensionista]**.
2. Selecione a **Competência**.
3. Baixe o **Modelo de Planilha**.
4. Preencha com: matrícula (ou CPF para pensionista), código da verba, valor, recorrência, parcelas.
5. Faça upload do arquivo preenchido.
6. Revise a prévia de validação.
7. Clique em **Confirmar Importação**.

### FAQ — Analista de Verbas

**P: Como testar uma fórmula antes de colocar em produção?**
R: Use o botão **Simular** na tela de fórmula para executar o cálculo com dados de um servidor de teste.

**P: Posso ter duas fórmulas ativas para a mesma verba?**
R: Não. Apenas uma fórmula pode estar ativa por verba em determinada competência. As datas de vigência controlam qual fórmula se aplica.

---

## 3.7 Analista de Consignado

### Responsabilidades

O Analista de Consignado gerencia convênios de desconto em folha, valida cadastros de bancos e processa as importações mensais de movimentos consignados.

### Telas acessíveis

- Convênio > Convênios
- Convênio > Bancos e Agências
- Folha de Pagamento > Importar Consignado

### 3.7.1 Cadastro de convênio

1. Acesse **Convênio > Convênios > Novo Convênio**.
2. Preencha:
   - **Nome** do convênio.
   - **Tipo** (consignado, benefício, outros).
   - **Número do Contrato**.
   - **Vigência** (início e fim).
   - **Banco de Cobrança** (vinculado ao banco cadastrado e validado).
3. Clique em **Salvar**.

### 3.7.2 Validação de banco/agência

1. Acesse **Convênio > Bancos e Agências**.
2. Localize o banco pelo código ou nome.
3. Clique em **Validar** para confirmar que o banco está homologado para operação de consignado.
4. Para adicionar uma agência, clique em **Adicionar Agência**, informe o código e o nome da praça.
5. Clique em **Salvar**.

### 3.7.3 Importação mensal de movimentos

1. Acesse **Folha de Pagamento > Importar Consignado**.
2. Selecione a **Competência**.
3. Selecione o **Convênio** (Neoconsig ou outro layout).
4. Clique em **Selecionar Arquivo** e escolha o CSV de movimentos fornecido pela financeira.
5. O sistema valida o leiaute e exibe resumo: total de registros, registros válidos, inválidos.
6. Clique em **Importar**.
7. O status do arquivo muda para `IMPORTADO` ou `IMPORTADO_PARCIALMENTE` se houver registros rejeitados.

📷 [inserir screenshot: tela de importação de consignado com resumo de validação]

### 3.7.4 Tratamento de parcelas pendentes

1. Acesse **Folha de Pagamento > Importar Consignado > Pendências**.
2. Filtre por convênio e competência.
3. A lista exibe as parcelas com status pendente ou rejeitadas.
4. Para cada parcela, é possível:
   - **Corrigir**: ajustar manualmente o valor ou matrícula e reprocessar.
   - **Ignorar**: registrar observação e excluir da fila.
5. Após tratar todas as pendências, clique em **Finalizar Importação**.

---

## 3.8 Gestor Pericial

### Responsabilidades

O Gestor Pericial estrutura as agendas médicas, aloca médicos peritos às especialidades e monitora a fila de laudos aguardando validação.

### Telas acessíveis

- Área de Saúde > Agendas Médicas
- Área de Saúde > Médicos
- Área de Saúde > Especialidades
- Área de Saúde > Laudos Pendentes

### 3.8.1 Estruturar agendas médicas

1. Acesse **Área de Saúde > Agendas Médicas > Nova Agenda**.
2. Selecione o **Médico**.
3. Selecione as **Especialidades** atendidas (múltipla seleção).
4. Defina:
   - **Data Inicial** e **Data Final** de vigência da agenda.
   - **Hora Inicial** e **Hora Final** de cada dia.
   - **Intervalo entre consultas** (em minutos).
   - **Periodicidade**: diária, semanal (selecione os dias da semana).
5. Clique em **Gerar Janelas** — o sistema cria automaticamente as `janela_agenda` para todo o período.
6. Clique em **Salvar Agenda**.

📷 [inserir screenshot: formulário de criação de agenda médica com calendário de janelas geradas]

### 3.8.2 Alocar médicos

1. Acesse **Área de Saúde > Médicos > Novo Médico** (se ainda não cadastrado).
2. Preencha: **Nome**, **CRM**, **UF do CRM**, **Especialidades** (seleção múltipla), **Filiais** atendidas.
3. Clique em **Salvar**.
4. Para vincular o médico a uma agenda existente, acesse **Agendas Médicas**, edite a agenda e altere o médico.

### 3.8.3 Monitorar fila de validação

1. Acesse **Área de Saúde > Laudos Pendentes**.
2. A tela exibe todos os prontuários com `situacao_laudo = PENDENTE_VALIDACAO`.
3. Clique em qualquer laudo para ver o resumo: servidor, data do atendimento, médico, ação pericial, CID.
4. Encaminhe para o Coordenador Pericial por meio do botão **Encaminhar para Validação** (se necessário redirecionar para outro coordenador).

---

## 3.9 Médico Perito

### Responsabilidades

O Médico Perito realiza o atendimento pericial: preenche o prontuário, registra a ação pericial, solicita licença quando aplicável e envia o laudo para validação.

### Telas acessíveis

- Área de Saúde > Minha Agenda
- Área de Saúde > Atendimentos
- Área de Saúde > Prontuário Pericial

### 3.9.1 Abrir atendimento

1. Acesse **Área de Saúde > Minha Agenda**.
2. A tela exibe a agenda do dia com os agendamentos no horário atual.
3. Clique no agendamento do servidor.
4. Clique em **Iniciar Atendimento**.
5. O status do agendamento muda para `COMPARECEU`.

> Se o servidor não comparecer, clique em **Registrar Não Comparecimento**. O status muda para `NAO_COMPARECEU`.

📷 [inserir screenshot: tela de agenda do médico com botão Iniciar Atendimento]

### 3.9.2 Preencher prontuário

1. Com o atendimento aberto, clique em **Preencher Prontuário**.
2. Preencha obrigatoriamente:
   - **Motivo** da perícia.
   - **HDA** — História da Doença Atual.
   - **Exame Físico**.
   - **Diagnóstico**.
   - **CID Principal** (busque pelo código ou descrição).
   - **CIDs Secundários** (opcional, múltiplos).
   - **Ação Pericial**: Aposentar, Não Aposentar, Desaposentar, Remarcar, Retorno, Encaminhar Especialista.
3. Se a ação gerar licença médica, preencha a seção **Licença Médica**:
   - **Tipo de Avaliação**.
   - **Benefício Previdenciário** OU **Motivo de Afastamento Remunerado** (exclusão mútua — preencha apenas um).
   - **Dias Concedidos** (máximo acumulado de 720 dias).
   - **Data de Início** e **Data de Fim**.
   - Se licença de tratamento de familiar, selecione o **Dependente**.
4. Adicione **Equipe Multiprofissional** (ao menos um profissional de saúde obrigatório para emissão de parecer).
5. Preencha **Observações** adicionais.
6. Clique em **Salvar Prontuário**.

📷 [inserir screenshot: prontuário pericial com campos de CID e ação pericial]

### 3.9.3 Enviar laudo

1. Após preencher o prontuário, clique em **Enviar para Validação**.
2. O sistema verifica:
   - Equipe multiprofissional preenchida.
   - CID informado.
   - Ação pericial selecionada.
   - Benefício previdenciário ou motivo de afastamento informado (para licenças).
3. Se todas as validações passarem, o status do laudo muda para `PENDENTE_VALIDACAO`.
4. O Coordenador Pericial recebe notificação.

> **Réplica multi-vínculo:** Se o servidor possuir mais de uma matrícula (mesmo CPF), o sistema pergunta se deseja replicar a licença para todas as matrículas. Confirme para replicar automaticamente.

---

## 3.10 Coordenador Pericial

### Responsabilidades

O Coordenador Pericial valida ou reprova os laudos enviados pelos Médicos Peritos, emitindo observações quando necessário.

### Telas acessíveis

- Área de Saúde > Laudos para Validação

### 3.10.1 Validar laudo

1. Acesse **Área de Saúde > Laudos para Validação**.
2. Filtre por status `PENDENTE_VALIDACAO` e/ou por médico, data, especialidade.
3. Clique no laudo para abrir o detalhe completo do prontuário.
4. Revise todos os campos: CID, ação pericial, dias de licença, equipe multiprofissional.
5. Para **aprovar**, clique em **Validar Laudo**. O status muda para `APROVADO`.
   - A licença médica (se existente) é ativada e o sistema dispara o efeito na situação funcional do servidor.
6. Para **reprovar**, clique em **Reprovar Laudo**.
   - Informe obrigatoriamente as **Observações** de reprovação.
   - O status muda para `REPROVADO`.
   - O Médico Perito recebe notificação com as observações.

📷 [inserir screenshot: tela de validação de laudo com botões Validar e Reprovar]

### 3.10.2 Emitir observações

Mesmo ao aprovar, o Coordenador pode registrar observações:

1. Antes de clicar em **Validar Laudo**, preencha o campo **Observações do Coordenador**.
2. As observações são registradas no prontuário e ficam visíveis para o Médico Perito no histórico.

### FAQ — Coordenador Pericial

**P: Posso delegar a validação de um laudo para outro coordenador?**
R: Não há delegação automática no sistema. O laudo permanece em fila até ser validado por qualquer usuário com o papel de Coordenador Pericial.

**P: O que acontece com a situação funcional do servidor após aprovação do laudo?**
R: O sistema automaticamente registra o afastamento conforme os dias concedidos e atualiza a situação funcional para `AFASTAMENTO`.

---

## 3.11 Agente Previdenciário

### Responsabilidades

O Agente Previdenciário gerencia benefícios previdenciários: aposentadorias, pensões, recadastramentos e certidões.

### Telas acessíveis

- Módulo Previdenciário > Aposentadoria
- Módulo Previdenciário > Pensão
- Módulo Previdenciário > Recadastramento > Campanhas
- Módulo Previdenciário > Certidões
- Módulo Previdenciário > Declarações

### 3.11.1 Criar campanha de recadastramento

1. Acesse **Módulo Previdenciário > Recadastramento > Campanhas > Nova Campanha**.
2. Defina:
   - **Tipo**: Aposentado, Pensionista ou Pensionista Universitário.
   - **Ciclo Início** e **Ciclo Fim** (datas do período de recadastramento).
   - **Filtros** (opcional): filial, faixa de concessão, lotação origem.
3. Clique em **Criar Campanha**.
4. O sistema popula automaticamente a carteira de beneficiários conforme os filtros.
5. Os beneficiários com status `NAO_RECADASTRADO` são destacados.

📷 [inserir screenshot: tela de criação de campanha de recadastramento]

### 3.11.2 Gerenciar carteira

1. Acesse **Módulo Previdenciário > Recadastramento > Carteira**.
2. Filtre por campanha, status (`RECADASTRADO`, `PERTO_VENCER`, `NAO_RECADASTRADO`) e tipo de beneficiário.
3. Para exportar a carteira, clique em **Exportar XLSX**.
4. Clique em um beneficiário para ver o histórico de recadastramentos e ligações.

### 3.11.3 Conceder aposentadoria

1. Acesse **Módulo Previdenciário > Aposentadoria > Nova Aposentadoria**.
2. Busque o **Servidor** por CPF ou matrícula.
3. Clique em **Simular** para ver o resultado da simulação por regra de aposentadoria (o sistema calcula automaticamente critérios de idade, tempo de contribuição e carência).
4. Selecione a **Regra de Aposentadoria** aplicável.
5. Preencha:
   - **Data de Concessão**.
   - **Fundamento Legal**.
   - **Ato de Nomeação** (número do ato, data de publicação).
6. Clique em **Conceder Aposentadoria**.
7. O sistema muda a situação funcional para `DESLIGAMENTO` (motivo: aposentadoria) e cria o registro de aposentadoria com status `CONCEDIDA`.

📷 [inserir screenshot: tela de concessão de aposentadoria com simulação de regras]

### 3.11.4 Conceder pensão

1. Acesse **Módulo Previdenciário > Pensão > Nova Pensão**.
2. Busque o **Instituidor** (servidor falecido ou aposentado) por CPF.
3. Busque o **Beneficiário** (dependente) por CPF.
4. Preencha:
   - **Tipo de Benefício**.
   - **Tipo de Rateio** e **Cota-Parte** (se múltiplos beneficiários).
   - **Forma de Reajuste**.
   - **Natureza** da pensão.
   - **Data de Concessão**.
5. Clique em **Conceder Pensão**.
6. O pensionista é criado no sistema e associado à folha de pagamento (template PENSIONISTA).

### 3.11.5 Emitir certidões

1. Acesse **Módulo Previdenciário > Certidões**.
2. Selecione o **Tipo de Certidão**:
   - Certidão de Tempo de Contribuição.
   - Certidão de Ex-Segurado.
   - Declaração de Aposentado.
   - Declaração de Ex-Servidor.
3. Busque a pessoa por CPF.
4. Preencha os campos específicos do tipo de certidão.
5. Clique em **Emitir Certidão**.
6. O PDF é gerado e salvo no S3. Clique em **Baixar PDF**.

---

## 3.12 Operador de Recadastramento

### Responsabilidades

O Operador de Recadastramento realiza o atendimento presencial ou remoto dos beneficiários, atualiza os dados cadastrais, emite comprovantes e registra ligações.

### Telas acessíveis

- Módulo Previdenciário > Recadastramento > Atendimento
- Módulo Previdenciário > Recadastramento > Carteira

### 3.12.1 Realizar atendimento presencial

1. Acesse **Módulo Previdenciário > Recadastramento > Atendimento**.
2. Busque o beneficiário por CPF ou nome.
3. O sistema exibe o status atual: `RECADASTRADO`, `PERTO_VENCER` ou `NAO_RECADASTRADO`.
4. Verifique a identidade do beneficiário conforme os documentos apresentados.
5. Clique em **Iniciar Recadastramento**.

### 3.12.2 Atualizar snapshot

O snapshot captura os dados cadastrais no momento do recadastramento.

1. Revise e atualize os campos na tela de recadastramento:
   - **Endereço** (CEP, logradouro, número, complemento, bairro, UF, município).
   - **Contato** (telefone principal, telefone opcional, e-mail).
   - **Estado Civil**.
2. Os dados atualizados são salvos no `recadastramento.dados_snapshot_json` e retroalimentam o cadastro base da pessoa.
3. Clique em **Concluir Recadastramento**.
4. O status do beneficiário muda para `RECADASTRADO`.

📷 [inserir screenshot: tela de recadastramento com campos de endereço e contato]

### 3.12.3 Emitir comprovante

1. Após concluir o recadastramento (status `RECADASTRADO`), o botão **Emitir Comprovante** fica disponível.
2. Clique em **Emitir Comprovante**.
3. O PDF é gerado e salvo no S3 vinculado ao registro.
4. Imprima ou envie ao beneficiário.

> **Atenção:** O comprovante só pode ser emitido se o status for `RECADASTRADO`. Beneficiários em outros status não permitem emissão.

### 3.12.4 Registrar ligação

Para registrar tentativas de contato por telefone:

1. Acesse **Módulo Previdenciário > Recadastramento > Carteira**, localize o beneficiário.
2. Clique em **Registrar Ligação**.
3. Informe a **Data/Hora** da ligação.
4. Preencha a **Observação** (obrigatório — descreva o resultado: atendeu, não atendeu, número inválido, etc.).
5. Clique em **Salvar**.

---

## 3.13 Analista de Recrutamento

### Responsabilidades

O Analista de Recrutamento apoia o processo seletivo: revisa requisições encaminhadas, capta candidatos e importa currículos do banco de talentos.

### Telas acessíveis

- Recrutamento e Seleção > Requisições
- Recrutamento e Seleção > Candidatos
- Recrutamento e Seleção > Banco de Talentos

### 3.13.1 Revisar requisições

1. Acesse **Recrutamento e Seleção > Requisições**.
2. Filtre por **Situação: EM_PROCESSO**.
3. Clique na requisição para abrir o detalhe.
4. Revise: filial, lotação, funções requisitadas, vagas, requisitos, tipo de contratação, prazo.
5. Se necessário, entre em contato com o solicitante usando as observações internas.

### 3.13.2 Captar candidatos

1. Com a requisição aberta, acesse a aba **Candidatos**.
2. Clique em **Adicionar Candidato**.
3. Busque a pessoa pelo CPF ou nome (busca no cadastro de pessoas do tenant).
4. Preencha o **Comentário Inicial**.
5. Faça upload do **Currículo** (PDF, máximo 10 MB).
6. Clique em **Salvar**. O candidato é cadastrado com situação `PENDENTE`.

### 3.13.3 Importar do banco de talentos

1. Ainda na aba **Candidatos**, clique em **Importar do Banco de Talentos**.
2. Use os filtros: cargo/função, habilidades, formação, localidade.
3. O sistema exibe os candidatos do banco que atendem os critérios.
4. Selecione os candidatos desejados e clique em **Importar Selecionados**.
5. Os candidatos são adicionados à requisição com situação `PENDENTE`.

---

## 3.14 Gestor de Requisição (Solicitante)

### Responsabilidades

O Gestor de Requisição (solicitante) abre e gerencia requisições de pessoal em nome da sua área, acompanha o pipeline de aprovação e seleção.

### Telas acessíveis

- Recrutamento e Seleção > Minhas Requisições

### 3.14.1 Abrir requisição

1. Acesse **Recrutamento e Seleção > Minhas Requisições > Nova Requisição**.
2. Preencha:
   - **Filial** e **Lotação** solicitante.
   - **Motivo**: Aumento de Quadro ou Substituição.
   - Se **Substituição**: selecione o **Colaborador Substituído**.
   - **Justificativa** detalhada.
   - **Data Limite** para atendimento.
   - **Data Prevista de Admissão**.
3. Clique em **Salvar como Rascunho**.

### 3.14.2 Compor vagas

1. Na requisição em rascunho, clique em **Adicionar Função Requisitada**.
2. Preencha:
   - **Função** e **Tipo de Contratação**.
   - **Quantidade de Vagas** e **Custo por Vaga**.
   - **Turno**.
   - **Requisitos**, **Cursos**, **Habilidades**, **Atividades** esperadas.
3. Clique em **Salvar**.
4. Repita para cada função diferente necessária.

### 3.14.3 Encaminhar para aprovação

1. Com as vagas compostas, clique em **Encaminhar para Aprovação**.
2. O status muda de `RASCUNHO` para `EM_PROCESSO`.
3. O RH e o Gestor de RH recebem notificação por e-mail.

### 3.14.4 Acompanhar pipeline

1. Acesse **Recrutamento e Seleção > Minhas Requisições**.
2. O painel exibe o status de cada requisição e o progresso dos candidatos.
3. Ao ser concluída a análise, você recebe notificação e a requisição muda para `CONCLUIDO`.

---

## 3.15 Avaliador Curricular

### Responsabilidades

O Avaliador Curricular analisa os currículos dos candidatos em uma requisição, aprovando ou reprovando cada um.

### Telas acessíveis

- Recrutamento e Seleção > Requisições > [Requisição] > Candidatos

### 3.15.1 Listar candidatos

1. Acesse **Recrutamento e Seleção > Requisições**.
2. Abra a requisição em andamento.
3. Clique na aba **Candidatos**.
4. A lista exibe: nome, situação (PENDENTE, APROVADO, REPROVADO), data de inclusão.

### 3.15.2 Aprovar ou reprovar candidato

1. Clique no candidato para abrir o detalhe.
2. Clique em **Visualizar Currículo** para abrir o PDF.
3. Preencha o **Comentário de Análise**.
4. Clique em **Aprovar** ou **Reprovar**.
5. A situação do candidato é atualizada imediatamente.

> Ao reprovar, o currículo permanece no S3 mas o candidato fica inativo para esta requisição. A exclusão remove definitivamente o currículo do S3.

### 3.15.3 Concluir análise

1. Após avaliar todos os candidatos, clique em **Concluir Análise**.
2. O sistema valida que todos os candidatos têm situação definida (APROVADO ou REPROVADO).
3. A requisição muda para `CONCLUIDO`.
4. O solicitante recebe notificação.

---

## 3.16 Gestor de Estágio

### Responsabilidades

O Gestor de Estágio cria e gerencia programas de estágio, contrata estagiários, autoriza prorrogações e registra recessos.

### Telas acessíveis

- Recrutamento e Seleção > Estágio > Programas
- Recrutamento e Seleção > Estágio > Estagiários
- Recrutamento e Seleção > Estágio > Prorrogações
- Recrutamento e Seleção > Estágio > Recessos

### 3.16.1 Criar programa de estágio

1. Acesse **Recrutamento e Seleção > Estágio > Programas > Novo Programa**.
2. Preencha:
   - **Nome** do programa.
   - **Vigência** (início e fim).
   - **Período Máximo** em meses.
   - **Renovações Permitidas**.
   - **Candidatos por Vaga**.
   - **Idade Mínima**.
   - **Valor da Bolsa** e **Carga Horária**.
   - **Relação de Trabalho**.
3. Faça upload do **Normativo** (portaria, resolução) — obrigatório.
4. Clique em **Salvar**.

📷 [inserir screenshot: formulário de criação de programa de estágio]

### 3.16.2 Contratar estagiário

1. Acesse **Recrutamento e Seleção > Estágio > Estagiários > Novo Estagiário**.
2. Busque a pessoa por CPF.
3. Selecione o **Programa**.
4. Preencha:
   - **Filial**, **Lotação**, **Centro de Custo**, **Turno**.
   - **Instituição de Ensino** e **Curso**.
   - **PNE** (Portador de Necessidades Especiais): marque se aplicável.
   - **Data de Início** e **Data de Fim** (limitada pelo período máximo do programa).
   - Dados bancários: Banco, Agência, Conta.
5. Clique em **Contratar Estagiário**.
6. O sistema cria o vínculo com tipo `ESTAGIARIO` e ativa as verbas do programa.

### 3.16.3 Autorizar prorrogação

1. Acesse **Recrutamento e Seleção > Estágio > Prorrogações**.
2. A lista exibe os pedidos pendentes de autorização.
3. Clique em um pedido para ver: estagiário, programa, data atual de fim, duração adicional solicitada.
4. Verifique se o acumulado (vigência atual + prorrogação) não ultrapassa 2 anos no programa.
5. Clique em **Autorizar** ou **Negar**.
6. Se autorizado, a `data_fim` do estagiário é atualizada.

### 3.16.4 Registrar recesso

1. Acesse **Recrutamento e Seleção > Estágio > Recessos > Novo Recesso**.
2. Busque o **Estagiário**.
3. Informe **Data de Início** e **Duração em Dias**.
4. Clique em **Salvar**.

---

## 3.17 Avaliador de Desempenho

### Responsabilidades

O Avaliador de Desempenho aplica avaliações aos servidores, consolida notas e indica progressões por mérito.

### Telas acessíveis

- Módulo Avaliação > Avaliações
- Módulo Avaliação > Progressões
- Módulo Avaliação > Plano de Cargos

### 3.17.1 Aplicar avaliação

1. Acesse **Módulo Avaliação > Avaliações > Nova Avaliação**.
2. Busque o **Servidor**.
3. Selecione o **Período** de avaliação.
4. Preencha os **Critérios** conforme o formulário configurado pelo tenant (critérios_json).
5. O sistema calcula automaticamente a **Nota Final** com base nos pesos definidos.
6. Clique em **Salvar Avaliação**.

📷 [inserir screenshot: formulário de avaliação de desempenho com critérios e nota calculada]

### 3.17.2 Consolidar notas

1. Acesse **Módulo Avaliação > Avaliações**.
2. Filtre por período e filial.
3. Clique em **Consolidar Período**.
4. O sistema calcula as médias e classifica os servidores por nota.
5. O resultado consolidado fica disponível para consulta e exportação.

### 3.17.3 Indicar progressão por mérito

1. Acesse **Módulo Avaliação > Progressões > Nova Progressão**.
2. Selecione o **Servidor** com avaliação consolidada.
3. O sistema exibe o nível atual e os critérios de elegibilidade para progressão.
4. Selecione o **Nível Destino** e o **Tipo de Progressão**: Mérito, Titularidade, Judicial ou Correção Salarial.
5. Informe o **Ato de Nomeação** e a **Data de Vigência**.
6. Clique em **Registrar Progressão**.
7. O nível salarial do servidor é atualizado e refletido na próxima folha.

---

## 3.18 Auditor / Controle Interno

### Responsabilidades

O Auditor ou Analista de Controle Interno consulta a trilha de auditoria, exporta evidências e solicita esclarecimentos sobre alterações.

### Telas acessíveis

- Auditoria > Trilha de Auditoria
- Relatório > Relatórios de Auditoria

### 3.18.1 Consultar trilha

1. Acesse **Auditoria > Trilha de Auditoria**.
2. Aplique os filtros:
   - **Período** (data/hora inicial e final).
   - **Usuário** (nome ou e-mail).
   - **Domínio**: FOLHA, VIDA_FUNCIONAL, PREVIDENCIARIO, PERICIA, USUARIOS_PAPEIS, VERBAS.
   - **Entidade** (ex.: `contracheque`, `funcionario`).
   - **Ação**: CREATE, UPDATE, DELETE, LOGIN, EXPORT, PRINT.
3. Clique em **Buscar**.
4. Para ver o detalhe de uma alteração, clique no registro:
   - A tela exibe o **diff JSONB**: campos alterados com valor anterior (vermelho) e novo (verde).
   - Informações de IP, user-agent e ID da requisição HTTP são exibidos.

📷 [inserir screenshot: detalhe de registro de auditoria com diff JSONB destacado]

### 3.18.2 Exportar relatórios

1. Na tela de Trilha de Auditoria, aplique os filtros desejados.
2. Clique em **Exportar CSV** para exportação simples.
3. Clique em **Exportar XLSX** para planilha formatada.
4. Para relatórios específicos por domínio, acesse **Relatório > Relatórios de Auditoria** e selecione o template.

### 3.18.3 Solicitar esclarecimentos

O SGP não possui fluxo interno de esclarecimentos diretamente na trilha. Para solicitar esclarecimentos:

1. Identifique o registro de auditoria com o `id` e o nome do usuário responsável.
2. Use o módulo de **Suporte** (ver seção 5.4) para abrir um chamado com as referências do registro.

### FAQ — Auditor

**P: Todos os domínios são auditados?**
R: Por padrão, apenas domínios sensíveis: folha, verbas, vida funcional, previdenciário, perícia e usuários/papéis. Se a flag `AUDIT_FULL_TRACE_ENABLED` estiver ativa, todos os domínios são auditados.

**P: Quanto tempo os registros de auditoria são mantidos?**
R: A retenção é configurável por tenant. Consulte o Administrador do Tenant para verificar a política vigente.

---

## 4. Portal do Servidor

O Portal do Servidor é uma SPA Angular separada (`sgp-portal`) acessível em `https://portal.seu-ente.gov.br/`. O login utiliza os mesmos mecanismos do sistema administrativo (Cognito e/ou Gov.br), mas com escopo reduzido de menus.

> O portal só está disponível se a feature flag `PORTAL_SERVIDOR_ENABLED` estiver ativa.

---

## 4.1 Servidor Ativo

### 4.1.1 Login no Portal

1. Acesse `https://portal.seu-ente.gov.br/`.
2. Clique em **Entrar com CPF e Senha** ou **Entrar com Gov.br** (se disponível).
3. Informe suas credenciais.
4. Se for o primeiro acesso, defina uma senha seguindo as instruções recebidas por e-mail.
5. O Dashboard exibe: nome, matrícula, cargo, lotação e situação funcional atual.

📷 [inserir screenshot: tela inicial do Portal do Servidor logado com resumo funcional]

### 4.1.2 Consultar contracheque

1. No menu lateral, acesse **Meu Contracheque**.
2. Selecione o **Mês** e **Ano** desejados.
3. O contracheque é carregado na tela com todos os proventos e descontos.
4. Clique em **Baixar PDF** para salvar o documento.

📷 [inserir screenshot: contracheque exibido no portal com detalhamento de verbas]

### 4.1.3 Baixar ficha financeira

1. Acesse **Ficha Financeira**.
2. Selecione o **Período** (ano ou intervalo de meses).
3. Clique em **Gerar Ficha Financeira**.
4. Clique em **Baixar PDF** ou **Baixar XLSX**.

### 4.1.4 Atualizar endereço e contato

1. Acesse **Meus Dados > Endereço e Contato**.
2. Clique em **Editar**.
3. Atualize os campos desejados (CEP, logradouro, número, complemento, bairro, telefone, e-mail pessoal).
4. Clique em **Salvar Alterações**.
5. As alterações retroalimentam o cadastro base no sistema administrativo.

### 4.1.5 Solicitar licenças

1. Acesse **Minhas Solicitações > Nova Solicitação de Licença**.
2. Selecione o **Tipo de Licença**.
3. Informe o **Período** solicitado e a **Justificativa**.
4. Faça upload de documentos comprobatórios, se necessário.
5. Clique em **Enviar Solicitação**.
6. A solicitação segue para o RH para avaliação.
7. Você receberá notificação quando a solicitação for analisada.

### 4.1.6 Ver agenda de perícia

1. Acesse **Saúde > Minha Agenda de Perícia**.
2. A tela exibe os agendamentos futuros: data, hora, especialidade, médico, local.
3. Clique em um agendamento para ver as instruções de preparo, se houver.

---

## 4.2 Aposentado / Pensionista

### 4.2.1 Realizar prova de vida

A prova de vida pode ser realizada pelo portal (quando `PROVA_VIDA_PUBLIC_API_ENABLED = true`).

1. Acesse `https://portal.seu-ente.gov.br/` e faça login com CPF e senha ou Gov.br.
2. O sistema verifica se há prova de vida pendente ou próxima do vencimento.
3. Se pendente, clique em **Realizar Prova de Vida**.
4. Siga as instruções na tela (pode incluir reconhecimento facial via câmera ou confirmação de dados).
5. Ao concluir, o status muda para `RECADASTRADO` e a data do próximo ciclo é recalculada.
6. Um comprovante digital fica disponível para download.

📷 [inserir screenshot: tela de prova de vida no portal com instruções]

### 4.2.2 Baixar contracheque (aposentado/pensionista)

1. Acesse **Meu Contracheque**.
2. Selecione o mês e ano.
3. O contracheque exibe o template PENSIONISTA com os proventos e descontos correspondentes.
4. Clique em **Baixar PDF**.

### 4.2.3 Consultar certidões

1. Acesse **Minhas Certidões**.
2. A tela lista as certidões emitidas pelo Agente Previdenciário: tipo, data de emissão, status.
3. Clique em **Baixar PDF** para cada certidão disponível.

---

## 4.3 Candidato

O acesso do candidato ao portal requer que haja uma requisição de pessoal ativa com candidatura aberta.

### 4.3.1 Criar currículo

1. Acesse o Portal do Servidor e crie uma conta informando CPF e e-mail.
2. Acesse **Meu Currículo > Editar**.
3. Preencha as seções:
   - **Dados Pessoais**: já preenchidos com base no cadastro.
   - **Histórico Profissional**: adicione experiências com empresa, cargo, período, descrição.
   - **Formação Acadêmica**: curso, instituição, nível, ano de conclusão.
   - **Habilidades** e **Idiomas**.
   - **Certificados** e **Cursos Complementares**.
   - **Links** (LinkedIn, portfólio).
4. Faça upload do **Currículo em PDF** (opcional, para complementar os dados estruturados).
5. Clique em **Salvar Currículo**.

### 4.3.2 Candidatar-se a uma vaga

1. Acesse **Vagas Disponíveis**.
2. A lista exibe as requisições abertas para candidatura externa.
3. Clique em uma vaga para ver os requisitos, turno, tipo de contratação e prazo.
4. Clique em **Candidatar-se**.
5. Confirme o uso do seu currículo cadastrado.
6. Você recebe confirmação por e-mail e notificação no portal.

### 4.3.3 Acompanhar status da candidatura

1. Acesse **Minhas Candidaturas**.
2. A lista exibe todas as candidaturas com o status atual: `PENDENTE`, `APROVADO`, `REPROVADO`.
3. Clique em uma candidatura para ver eventuais comentários do Avaliador Curricular.

---

## 5. Operações Transversais

### 5.1 Como fazer upload de arquivo (presigned URL)

O SGP usa AWS S3 para armazenamento de todos os arquivos. O processo de upload utiliza **URL pré-assinada** para segurança e desempenho.

1. Em qualquer tela com campo de upload, clique em **Selecionar Arquivo**.
2. O sistema solicita ao backend uma URL pré-assinada para upload direto ao S3.
3. O arquivo é transferido diretamente do seu navegador para o S3 (sem passar pelo servidor da aplicação).
4. Ao concluir, o sistema salva a chave S3 no registro correspondente.
5. Uma barra de progresso indica o andamento. Aguarde a mensagem de confirmação.

**Formatos e tamanhos suportados:**

| Tipo de arquivo      | Formatos aceitos | Tamanho máximo |
| -------------------- | ---------------- | -------------- |
| Documentos           | PDF              | 20 MB          |
| Imagens (foto, logo) | PNG, JPG, SVG    | 2 MB           |
| Planilhas            | XLSX, CSV        | 10 MB          |
| Arquivos de remessa  | TXT, XML, CSV    | 50 MB          |

### 5.2 Como baixar relatório

1. Em qualquer tela de relatório, configure os filtros desejados.
2. Clique em **Gerar Relatório** (PDF) ou **Exportar XLSX**.
3. O sistema enfileira a geração assíncrona para relatórios grandes (> 1.000 registros).
4. Você receberá notificação in-app com o link para download quando pronto.
5. Para relatórios pequenos, o download começa imediatamente.
6. Os arquivos gerados ficam disponíveis no S3 por 7 dias. Após esse prazo, é necessário regerar.

### 5.3 Como configurar MFA

O MFA (Multi-Factor Authentication) adiciona uma segunda camada de segurança à sua conta.

**Ativar MFA:**

1. Clique no seu **Avatar** no header e selecione **Meu Perfil**.
2. Clique na aba **Segurança**.
3. Clique em **Ativar MFA**.
4. Abra o aplicativo autenticador no seu celular (Google Authenticator, Microsoft Authenticator ou Authy).
5. Escaneie o **QR Code** exibido na tela.
6. Digite o **código de 6 dígitos** gerado pelo aplicativo para confirmar a ativação.
7. Anote os **códigos de recuperação** exibidos — guarde-os em local seguro. Eles são usados caso perca acesso ao autenticador.
8. Clique em **Confirmar Ativação**.

**Desativar MFA** (requer aprovação do Administrador do Tenant):

1. Acesse **Meu Perfil > Segurança > Desativar MFA**.
2. Informe um código do autenticador para confirmar.
3. A desativação é registrada na trilha de auditoria.

📷 [inserir screenshot: tela de configuração de MFA com QR Code]

### 5.4 Como solicitar suporte (abrir chamado)

Para reportar problemas ou solicitar auxílio:

1. Clique no ícone de **?** (ajuda) no header.
2. Selecione **Abrir Chamado de Suporte**.
3. Preencha:
   - **Tipo**: Bug, Dúvida, Solicitação de Melhoria.
   - **Módulo** afetado.
   - **Descrição detalhada** do problema.
   - **Passos para reproduzir** (para bugs).
4. Faça upload de **screenshots** ou arquivos relevantes.
5. Clique em **Enviar Chamado**.
6. Você receberá um número de protocolo por e-mail.

### 5.5 Como imprimir em massa

**Contracheques em massa:**
Veja seção 3.5.4 — Emissão de contracheques em massa.

**Outros relatórios em massa:**

1. Em qualquer listagem (ex.: fichas funcionais, certidões), marque os registros com o checkbox.
2. Clique em **Ações em Massa > Imprimir Selecionados**.
3. O sistema enfileira a geração de um PDF consolidado.
4. Aguarde a notificação in-app com o link de download do ZIP.

**Atalho de impressão:** `Ctrl+P` abre a caixa de diálogo de impressão do navegador para a tela atual.

---

## 6. Glossário Rápido

> Para o glossário completo, consulte o documento `00-glossario.md`.

| Termo                  | Definição                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Competência**        | Mês e ano de referência de uma folha de pagamento.                                  |
| **Contracheque**       | Documento que detalha os proventos e descontos de um servidor em uma competência.   |
| **DSL de fórmula**     | Linguagem declarativa usada para escrever fórmulas de verbas, compilada para SQL.   |
| **Feature flag**       | Chave de configuração que ativa ou desativa funcionalidades do sistema.             |
| **Filial**             | Unidade administrativa do ente (secretaria, departamento, autarquia).               |
| **Folha de pagamento** | Processamento financeiro de um conjunto de servidores em uma competência.           |
| **Jornada A1–A4**      | Sequência de etapas do golden scenario de admissão de servidor.                     |
| **Laudo pericial**     | Documento médico emitido após atendimento pericial, com ação e CID.                 |
| **Lotação**            | Setor ou unidade onde o servidor está alocado, dentro de uma filial.                |
| **MFA**                | Multi-Factor Authentication — autenticação com segundo fator (código 6 dígitos).    |
| **Papel (role)**       | Capacidade autorizada no sistema (`ROLE_MODULO_ACAO`).                              |
| **Pensionista**        | Beneficiário de pensão previdenciária decorrente de vínculo com servidor.           |
| **Perfil**             | Agrupador de papéis atribuído a um usuário.                                         |
| **Posse**              | Ato formal de ingresso do servidor no serviço público.                              |
| **Provento**           | Verba de crédito (salário, gratificações, adicionais).                              |
| **Recadastramento**    | Procedimento periódico de atualização cadastral de aposentados e pensionistas.      |
| **RLS**                | Row-Level Security — mecanismo do PostgreSQL para isolamento multi-tenant.          |
| **RPPS**               | Regime Próprio de Previdência Social — previdência do ente público.                 |
| **Rubrica**            | Sinônimo de verba — item da folha de pagamento.                                     |
| **Situação funcional** | Estado atual do vínculo do servidor: ativo, afastado, desligado, etc.               |
| **SST**                | Saúde e Segurança do Trabalho.                                                      |
| **Tenant**             | Ente contratante do SGP (prefeitura, autarquia, instituto, etc.).                   |
| **Verba**              | Item de cálculo da folha (provento, desconto, base, apoio).                         |
| **Vínculo**            | Relação jurídica entre a pessoa e o ente (efetivo, comissionado, contratado, etc.). |

---

## 7. FAQ Consolidado

### Acesso e autenticação

**P: Esqueci minha senha. O que faço?**
R: Na tela de login, clique em **Esqueci minha senha**, informe seu e-mail e siga as instruções enviadas para a caixa de entrada. O link expira em 24 horas.

**P: Minha sessão expira muito rápido. Posso alterar o tempo?**
R: O tempo de sessão (30 minutos de inatividade) é configurado no Cognito. Solicite ao Administrador do Tenant caso precise de ajuste.

**P: Não vejo o menu que preciso. O que pode ser?**
R: O menu é exibido conforme os papéis atribuídos ao seu perfil. Contate o Administrador do Tenant para verificar suas permissões.

**P: O botão Gov.br não aparece na tela de login.**
R: A integração Gov.br depende da flag `GOV_BR_SSO_ENABLED`. Contate o Administrador do Tenant.

### Folha de pagamento

**P: Tentei criar uma folha mas o botão está desabilitado.**
R: Verifique se a competência está com status `ABERTA`. Sem competência aberta, não é possível criar folhas.

**P: O cálculo de um contracheque deu erro. Como identificar a causa?**
R: Acesse o contracheque com status `ERRO`, clique em **Ver Detalhes do Erro**. O sistema exibe a verba e a mensagem de erro da fórmula.

**P: Posso calcular a folha de apenas um servidor sem recalcular todos?**
R: Sim. Use o **Reprocessamento Seletivo** (modo seletivo) e marque apenas o servidor desejado.

**P: Como emitir o contracheque com marca d'água "Não Oficial"?**
R: Acesse o contracheque antes do fechamento da competência. O sistema aplica automaticamente a marca d'água enquanto a competência estiver aberta.

### Módulo RH

**P: Como admitir um servidor?**
R: Acesse **Módulo RH > Cadastro do servidor**. Preencha matrícula, nome, CPF, data de admissão e, quando aplicável, datas de nomeação, posse e exercício. Ao salvar, o sistema cria o vínculo funcional ativo, registra o contrato e grava a primeira linha do histórico de situação.

**P: Onde consulto o dossiê do servidor?**
R: Na mesma tela, selecione o servidor na lista. O painel de dossiê exibe os dados principais e usa o endpoint protegido por `rh.employee.read`.

**P: Cadastrei um servidor mas não consigo registrar a posse.**
R: Verifique se o servidor está na situação `CADASTRO_BASE`. Caso esteja em outra situação, contate o Analista de RH responsável.

**P: Como desligar um servidor?**
R: Acesse **Módulo RH > Cadastro do servidor**, selecione o servidor e preencha data, motivo e justificativa no bloco **Desligamento**. A situação muda para `DESLIGAMENTO`, o contrato ativo recebe data final e a operação é auditada.

**P: Como faço uma alteração de regime jurídico?**
R: Acesse **Módulo RH > Cadastro do servidor > Vínculos**, selecione o servidor e use **Alterar Regime**. Informe o regime, a data de vigência e os campos obrigatórios do tipo escolhido: fundamento legal para estatutário, cargo para comissionado ou data final para temporário. Marque a confirmação e digite `ALTERAR REGIME` para concluir. A operação fecha o contrato ativo, abre novo vínculo/contrato, registra a linha do tempo e grava auditoria.

**P: O sistema permitiu cadastrar dois servidores com o mesmo CPF?**
R: Não é possível. O CPF é único por tenant. Se houver dois registros, um deles pode ser de tenant diferente — contate o suporte.

### Gestão — Estrutura organizacional

**P: Onde cadastro cargos, funções, lotações e centros de custo?**
R: Acesse **Gestão > Estrutura organizacional**. A tela exibe a árvore de lotações, listas de cargos com vagas, funções, centros de custo e vínculos entre cargo/função e vínculo funcional.

**P: Posso criar vínculo funcional antes de cadastrar a estrutura?**
R: Não. O cadastro de vínculo funcional depende de cargos, funções, lotações e vínculos de estrutura previamente ativos.

**P: Como confiro a disponibilidade de vagas de um cargo?**
R: Na lista de cargos, confira o total de vagas e as vagas providas. O sistema exige que o total seja igual à soma de vagas providas e vagas abertas.

### Gestão — Parâmetros de IRRF

**P: Como atualizo a tabela progressiva mensal de IRRF?**
R: Acesse **Gestão > Parâmetros > Tabela IRRF**, informe a vigência inicial, a vigência final quando existir e importe o CSV com cinco linhas no formato `mínimo;máximo;alíquota;dedução;dedução_dependente`. A última faixa deve ficar sem valor máximo. Ao salvar, o sistema valida a continuidade centavo a centavo das faixas, grava a nova tabela em `public.tax_rate`, registra auditoria e passa a usar a vigência informada no cálculo da rubrica `IRRF`.

### Gestão — Parâmetros de RPPS

**P: Como atualizo a tabela progressiva de contribuição RPPS?**
R: Acesse **Gestão > Parâmetros > Tabela RPPS**, informe a vigência inicial, a vigência final quando existir, o teto da base RPPS e importe o CSV no formato `mínimo;máximo;alíquota`. A última faixa deve ficar sem valor máximo. Ao salvar, o sistema valida a continuidade centavo a centavo das faixas, grava a tabela por tenant em `public.tax_rate`, atualiza o parâmetro `TETO_RPPS`, registra auditoria e passa a usar a vigência informada no cálculo da rubrica `RPPS`. Vínculos celetistas não sofrem desconto RPPS; o cálculo retorna zero e registra evento de bypass para auditoria.

### Gestão — Teto remuneratório

**P: Como mantenho os subtetos por poder/cargo?**
R: Acesse **Gestão > Parâmetros > Teto Remuneratório** e cadastre os valores de `TETO_PREFEITURA`, `TETO_VICE`, `TETO_VEREADOR` e `TETO_SECRETARIO` para o tenant. O cálculo da folha usa a rubrica `DESCONTO_TETO` para gerar o redutor quando a soma das parcelas sujeitas ao teto supera o subteto aplicável. Parcelas indenizatórias ficam imunes quando a rubrica está marcada com `subject_to_ceiling = false`; valores de teto não cadastrados fazem o cálculo falhar com erro explícito, sem redutor silencioso.

### Previdenciário e recadastramento

**P: O beneficiário fez a prova de vida, mas o status ainda aparece como "Perto do Vencimento".**
R: O job de atualização de status roda diariamente. Aguarde até o dia seguinte. Se o problema persistir, contate o Agente Previdenciário para verificação manual.

**P: Posso emitir comprovante de recadastramento para beneficiário com status "Não Recadastrado"?**
R: Não. O comprovante só é emitido após a confirmação do recadastramento (status `RECADASTRADO`).

### Perícia médica

**P: O médico não consegue enviar o laudo. Qual pode ser o problema?**
R: Verifique se todos os campos obrigatórios estão preenchidos: equipe multiprofissional (ao menos 1 profissional), CID principal, ação pericial, e benefício previdenciário ou motivo de afastamento.

**P: O laudo foi reprovado pelo coordenador. O que o médico deve fazer?**
R: O médico recebe notificação com as observações de reprovação. Acesse o prontuário, corrija os pontos indicados e reenvie para validação.

### Licenças

**P: Como solicitar licença maternidade, paternidade, adotante, capacitação, prêmio, interesse particular ou cônjuge?**
R: Acesse **Portal do Servidor > Licenças > Solicitações**, informe servidor, motivo, data de início, dias e comprovante quando exigido. O sistema calcula o período, valida regras legais e registra a solicitação em `hr.leave_record`.

**P: Quando a licença fica sem remuneração?**
R: Licença para tratar de interesse particular é registrada automaticamente com `paid=false`. As demais licenças continuam remuneradas no cadastro funcional; reflexos de cálculo ficam no escopo da folha.

**P: Como o RH aprova uma licença?**
R: Acesse **Módulo RH > Licenças**, selecione o servidor, filtre por motivo se necessário e aprove ou cancele a solicitação. A aprovação grava auditoria e inclui a linha correspondente no histórico funcional do servidor.

### Portal do Servidor

**P: Não consigo acessar o portal.**
R: Verifique se o portal está habilitado (`PORTAL_SERVIDOR_ENABLED`). Caso esteja, confirme seu e-mail e senha com o setor de RH.

**P: Meu contracheque não aparece no portal para determinado mês.**
R: O contracheque só fica disponível no portal após o fechamento da competência. Meses com competência ainda aberta não exibem contracheque.

**P: Atualizei meu endereço no portal, mas o RH não viu a alteração.**
R: As alterações feitas em **Portal do Servidor > Meus Dados** geram uma solicitação de alteração cadastral com comparação entre dados atuais e dados propostos. O cadastro base só é atualizado depois da aprovação do RH em **Recursos Humanos > Atualizações cadastrais**; se a solicitação não aparecer, o Administrador do Tenant deve verificar a fila `hr.cadastral_change_request` e os eventos de auditoria.

### Integração e arquivos

**P: O upload de arquivo falhou.**
R: Verifique: (1) o formato do arquivo está correto para aquela tela; (2) o tamanho não excede o limite; (3) sua conexão de internet está estável. Se o problema persistir, tente um navegador diferente.

**P: O retorno bancário não baixou os pagamentos corretos. O que fazer?**
R: Acesse **Folha de Pagamento > Remessa/Retorno**, localize o arquivo de retorno e clique em **Processar Retorno**. Verifique as inconsistências reportadas. Se houver divergências, contate o banco.

---

_Fim do Manual do Usuário — SGP Sistema de Gestão de Pessoas._
_Para dúvidas não cobertas neste manual, abra um chamado de suporte conforme a seção 5.4 ou consulte o Administrador do Tenant._
