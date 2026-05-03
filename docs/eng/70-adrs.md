# ADRs — SGP Moderno: Decisões de Arquitetura

**Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Aceito
**Escopo:** Todo o stack SGP (backend, frontend, infra, dados) | **Depende de:** BRIEF.md, 01-escopo-e-decisoes.md, 41-arquitetura-sistema.md

---

> Este documento consolida as Architecture Decision Records (ADRs) do SGP Moderno.
> Os ADRs 001–010 correspondem às 10 decisões aprovadas listadas no §2 do BRIEF.
> Os ADRs 011–015 são decisões técnicas transversais de apoio à arquitetura.
> Os ADRs 016–020 registram decisões temporárias de escopo aprovadas em 2026-04-26.
> Formato: [MADR — Markdown Architecture Decision Record](https://adr.github.io/madr/).

---

## ADR-001: Multi-tenant SaaS com Row-Level Security no PostgreSQL

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Quando o número de tenants ativos ultrapassar 500 ou quando o tempo médio de query cross-tenant superar 200 ms em produção.

---

### Contexto

O SGP atende prefeituras, autarquias, fundos e institutos de previdência de diferentes entes da federação. Cada ente contratante ("tenant") possui seus próprios servidores, folhas de pagamento, parâmetros e dados previdenciários, todos com exigência de **isolamento absoluto** — um tenant jamais pode acessar dados de outro, nem por engano de código nem por falha de parametrização.

O sistema legado utiliza instalações separadas por cliente (deploy-per-tenant), o que gera custo operacional elevado: N instâncias para gerenciar, N bancos de dados para manter, N pipelines de atualização. O reimplementado deve reduzir esse custo operacional mantendo o isolamento.

Adicionalmente, o modelo de dados é extenso — 300+ tabelas de negócio — e qualquer estratégia de isolamento deve ser transparente para o código de aplicação, sem exigir filtros manuais em cada query.

### Decisão

Adotar **PostgreSQL Row-Level Security (RLS)** com coluna `tenant_id UUID NOT NULL` em todas as tabelas de negócio. O contexto de tenant é injetado na sessão via `SET LOCAL app.current_tenant_id = '<uuid>'` em cada transação, e as políticas RLS filtram automaticamente todas as operações DML e SELECT.

```sql
-- Exemplo canônico de política RLS
ALTER TABLE funcionario ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON funcionario
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

O `TenantGuard` NestJS extrai o `tenant_id` do JWT Cognito e o injeta no contexto da requisição; o módulo de banco de dados (Prisma middleware ou TypeORM subscriber) executa `SET LOCAL` antes de cada transação.

Todas as PKs são `UUID` (gen_random_uuid()); índices compostos incluem `tenant_id` como coluna líder nas tabelas de alta cardinalidade.

### Alternativas consideradas

**Opção A — DB-per-tenant (banco separado por cliente)**

- Prós: isolamento máximo; backup/restore por tenant; sem risco de vazamento cross-tenant.
- Contras: N conexões de pool; custo de infra linear no número de tenants; impossibilidade prática de views analíticas cross-tenant; complexidade de provisionamento e migration.

**Opção B — Schema-per-tenant (schema separado no mesmo banco)**

- Prós: isolamento lógico forte; search_path controla contexto; sem RLS.
- Contras: migrações exigem executar DDL N vezes; search_path pode vazar em ORM se mal configurado; shared_catalog limita paralelismo de DDL; muito mais complexo de operar em 100+ tenants.

**Opção C — Discriminator column sem RLS (filtros no ORM)**

- Prós: zero overhead de RLS; simples de implementar.
- Contras: um bug de código expõe dados de todos os tenants; `WHERE tenant_id = ?` esquecido em uma query é uma violação de segurança; não há garantia em nível de banco.

**Opção D — Sharding horizontal (Citus ou particionamento físico)**

- Prós: escala massiva; co-location por tenant.
- Contras: overhead de operação; licença Citus; complexidade desnecessária para o volume esperado (< 1.000 tenants, < 10 TB totais em 5 anos); joins cross-shard inviáveis.

**Decisão final: RLS (Opção escolhida)**
Melhor equilíbrio entre isolamento garantido pelo banco, custo operacional e transparência para o código de aplicação. A penalidade de performance do RLS em PostgreSQL 16 é inferior a 5% em workloads OLTP com índices adequados, conforme benchmarks documentados na comunidade.

### Consequências

**Positivas:**

- Isolamento garantido em nível de banco — não depende de código correto.
- Um único cluster RDS Multi-AZ atende todos os tenants; custo compartilhado.
- Migrations Flyway/Prisma Migrate executam uma única vez para todos os tenants.
- Análises cross-tenant (com `SECURITY DEFINER`) possíveis para operações internas.
- Simplifica DR/backup: backup de um cluster cobre todos os tenants.

**Negativas:**

- `SET LOCAL app.current_tenant_id` deve ser executado antes de **toda** transação — qualquer omissão retorna zero linhas (comportamento seguro, mas silencioso).
- RLS desabilita `table partition pruning` em alguns casos — necessário benchmark por tabela particionada.
- Superusuário de banco (`BYPASSRLS`) deve ser protegido e auditado — nunca usar em runtime de aplicação.
- Operações DDL de emergency (ex.: hotfix de coluna) requerem acesso com `BYPASSRLS` ou `SET app.current_tenant_id` explícito.
- Dumps de backup incluem dados de todos os tenants; restore seletivo por tenant exige script adicional.

### Referências

- PostgreSQL 16 docs: Row Security Policies — https://www.postgresql.org/docs/16/ddl-rowsecurity.html
- BRIEF.md §2, decisão #1 — Multi-tenancy com `tenant_id` e RLS obrigatória.
- ADR-012 — PostgreSQL 16 como único SGBD.

---

## ADR-002: Motor de folha como microsserviço dedicado `sgp-payroll-engine`

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se o tempo de fechamento de lote ultrapassar SLA de 4h para folha de 10.000 contracheques, ou se custo de infraestrutura do serviço isolado superar 30% do custo total de compute.

---

### Contexto

O cálculo de folha de pagamento é o processo mais crítico, mais intensivo em CPU/I-O e mais sensível do SGP. Características que o diferenciam dos demais módulos:

1. **Volume massivo e concentrado no tempo**: fechamento mensal processa milhares de contracheques em janela noturna de poucas horas.
2. **Isolamento de carga obrigatório**: um cálculo de folha em andamento não pode degradar a experiência dos usuários nas telas de Cadastro, Previdenciário ou Saúde.
3. **Recálculo retroativo**: reprocessamento de competências anteriores para correções de verbas, alíquotas ou dados cadastrais deve ser possível sem bloquear a competência corrente.
4. **Fórmulas compiladas para SQL** (ADR-008): o motor precisa de acesso direto ao banco com pool dedicado de read replicas para maximizar throughput.
5. **Auditabilidade**: cada contracheque precisa de `memoria_calculo` JSONB com rastreabilidade completa de cada verba calculada.
6. **Fault isolation**: um erro em cálculo de folha não deve derrubar a API principal.

O sistema legado executa o cálculo de folha in-process na aplicação principal Java, causando degradação perceptível da interface durante fechamentos e dificultando a evolução independente das regras de cálculo.

### Decisão

Implementar o `sgp-payroll-engine` como **serviço autônomo** com:

- **Acionamento híbrido**: execução por cron/scheduler e por requisição explícita de cálculo.
- **Comunicação assíncrona**: consome fila SQS `folha.calculo.solicitada` para processamento em lote; publica em `folha.calculo.concluida` ao término.
- **Consulta de progresso**: disponibiliza estado de batch e in-batch para alimentar interfaces operacionais.
- **Pool dedicado de conexões** apontando para a **read replica do RDS** durante cálculo; escreve resultados (`contracheque`, `lancamento`) via conexão de escrita separada.
- **Step Functions `payroll-lote`** para orquestrar paralelismo: divide o lote por filial, dispara N workers simultâneos, agrega progresso e trata falhas parciais com retry seletivo.
- **Lógica no banco por padrão**: fórmulas e rotinas de cálculo concentradas em procedures/funções `plpgsql` parametrizadas sob camada fina de gestão.
- **Schema próprio** `payroll` no PostgreSQL (compartilhado no mesmo cluster, isolado por schema) — tabelas `contracheque`, `lancamento`, `formula`, `atributo_formula` residem aqui.
- **Escalabilidade horizontal**: ECS Fargate com auto-scaling baseado em profundidade da fila SQS (CloudWatch metric `ApproximateNumberOfMessagesVisible`) e possibilidade de execução em servidor dedicado quando exigido por capacidade.

```
sgp-core-api ──[SQS folha.calculo.solicitada]──► sgp-payroll-engine
                                                         │
                                              ┌──────────┴──────────┐
                                         RDS Read Replica     RDS Primary
                                         (SELECT queries)    (INSERT results)
                                              │
                                    [SQS folha.calculo.concluida]
                                              │
                                    sgp-core-api (atualiza UI via WebSocket)
```

### Alternativas consideradas

**Opção A — Monolito (cálculo in-process na `sgp-core-api`)**

- Prós: sem latência de rede entre serviços; código mais simples; single deploy.
- Contras: cálculo de lote degrada API principal; não escala independentemente; fault domain compartilhado — bug no engine derruba toda a aplicação; dificulta evolução das fórmulas sem deploy completo.

**Opção B — Serverless Lambda por verba**

- Prós: escala infinita por verba; pay-per-invocation.
- Contras: cold start inaceitável para cálculo massivo; limite de 15 min por execução inadequado para grandes lotes; conexões de banco explosivas (10.000 Lambdas × pool de 2 = 20.000 conexões); estado de sessão de cálculo não compartilhado entre verbas do mesmo contracheque.

**Opção C — Worker in-process com job queue (Bull/BullMQ)**

- Prós: reduz complexidade de deploy; Redis-backed; fácil de implementar.
- Contras: ainda no mesmo processo que a API HTTP; não resolve isolamento de carga; Redis adiciona dependência de infraestrutura; menos adequado para orquestração complexa de lote.

**Opção D — Microsserviço em linguagem diferente (Go, Java)**

- Prós: Java tem maturidade comprovada em sistemas de folha.
- Contras: stack heterogêneo aumenta custo de manutenção; a equipe tem expertise em TypeScript/NestJS; DSL de fórmulas (ADR-008) é mais natural em TypeScript.

### Consequências

**Positivas:**

- Cálculo de lote não afeta latência da API principal.
- Escala horizontal independente durante fechamentos.
- Fault isolation: falha no engine não derruba cadastro, portal ou previdenciário.
- Pool dedicado de conexões na read replica maximiza throughput de SELECTs durante cálculo.
- Deploy e atualização de regras de folha sem downtime da aplicação principal.
- Recálculo retroativo de competências antigas pode rodar em paralelo com competência corrente.

**Negativas:**

- Complexidade operacional adicional: dois serviços para monitorar, escalar e fazer deploy.
- Latência de comunicação via SQS (tipicamente < 1 s) — inaceitável para uso síncrono além do endpoint pontual.
- Necessidade de garantir consistência eventual entre `sgp-core-api` (que exibe status) e `sgp-payroll-engine` (que atualiza status).
- Transações distribuídas são inviáveis — necessidade de Saga para rollback de lote parcial.
- Onboarding de novos desenvolvedores mais complexo.

### Referências

- BRIEF.md §2, decisão #2 — Motor de folha como microsserviço.
- BRIEF.md §8 — Filas SQS: `folha.calculo.solicitada`, `folha.calculo.concluida`.
- ADR-008 — Fórmulas compiladas para SQL.
- ADR-013 — Event-driven via EventBridge + SNS + SQS + Step Functions.

---

## ADR-003: Cobertura de todos os 11 menus com igual profundidade

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP

---

### Contexto

O legado SGP possui 643 estados de navegação, 192 controladores, ~1.200 endpoints e 159 diretórios de páginas distribuídos em 11 menus de primeiro nível. Os clientes existentes utilizam todos esses módulos em produção; qualquer reimplementação que entregue apenas um subconjunto forçaria os clientes a manter o legado em paralelo para os módulos não migrados — o que é operacionalmente inviável (dois sistemas com dados divergentes, dois contratos de suporte, dois treinamentos de usuário).

A discussão interna avaliou estratégias de priorização que são comuns em projetos greenfield: entregar primeiro os módulos de maior receita ou maior criticidade (Folha + RH), depois os demais em fases.

### Decisão

**Cobrir todos os 11 menus de primeiro nível com profundidade funcional equivalente ao legado**, sem MVP reduzido por módulo. Os 12 menus são:

| #   | Menu                             | Módulo NestJS    |
| --- | -------------------------------- | ---------------- |
| 1   | Gestão                           | `gestao`         |
| 2   | Módulo RH                        | `rh`             |
| 3   | Folha de Pagamento               | `folha`          |
| 4   | Módulo Avaliação                 | `avaliacao`      |
| 5   | Recrutamento e Seleção           | `recrutamento`   |
| 6   | Consultas Gerenciais             | `consultas`      |
| 7   | Relatório                        | `relatorios`     |
| 8   | Módulo Previdenciário            | `previdenciario` |
| 9   | Auditoria                        | `auditoria`      |
| 10  | Área de Saúde (Junta Médica/SST) | `saude`          |
| 11  | Convênio                         | `convenio`       |

A estratégia de desenvolvimento interna prioriza módulos por complexidade técnica e dependência — Folha depende de RH que depende de Gestão — mas **o contrato externo com o cliente é paridade completa**.

### Alternativas consideradas

**Opção A — MVP apenas Folha + RH, demais módulos em fases**

- Prós: entrega valor mais rápido nos módulos de maior criticidade; reduz escopo inicial.

**Opção B — Faseamento com grupos temáticos (Fase 1: RH+Folha+Previdenciário; Fase 2: demais)**

- Prós: cronograma mais previsível para o núcleo do negócio.
- Contras: ainda exige operação paralela de legado para os módulos da Fase 2; contratos de integração (eSocial, SIPREV) existem em múltiplos módulos e não podem ser separados facilmente; complexidade de migração de dados parcial.

**Opção C — Priorização por receita (entregar primeiro o que paga mais)**

- Prós: maximiza ROI no curto prazo.
- Contras: módulos como Recrutamento e Estágio, Avaliação e Convênio são juridicamente obrigatórios para os entes públicos — a ausência não é uma opção; clientes esperariam indefinidamente pelos módulos "de menor receita".

### Consequências

**Positivas:**

- Go-live limpo: cliente migra completamente, legado desativado.
- Sem dados duplicados entre sistemas em coexistência.
- Integrações (eSocial, SIPREV, DIRF) implementadas uma única vez no novo sistema.
- Proposta de valor clara: SGP Moderno substitui completamente o legado.
- Menor custo de suporte pós-go-live (não há dois sistemas para suportar).

**Negativas:**

- Cronograma de desenvolvimento mais longo antes do primeiro go-live.
- Risco de escopo: módulos obscuros do legado podem conter lógica não documentada que só é descoberta tardiamente — mitigado pela ADR-010 (documentação completa antes de codar).
- Necessidade de equipes maiores ou período de desenvolvimento mais longo.

### Referências

- BRIEF.md §2, decisão #3 — Cobertura de todos os 11 menus.
- BRIEF.md §3 — Tabela de módulos e bounded contexts.
- ADR-010 — Artefatos documentais completos antes de codar.

---

## ADR-004: Autenticação OAuth2/OIDC com User Pools Separados (Core x Portal)

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Quando houver decisão de unificar domínios de identidade ou mudança no framework corporativo de auth/authz.

---

### Contexto

O SGP possui três classes distintas de identidade:

1. **Staff administrativo** (`sgp-admin` / `sgp-core-api`): operadores de RH, folha, perícia e gestão.
2. **Employees/beneficiários/candidatos** (`sgp-portal-ui` / `sgp-portal-api`): população de autoatendimento externa ao backoffice.
3. **Sistemas externos**: integrações machine-to-machine.

O legado usa sessão HTTP própria + `SGP-API-KEY` para integrações. O novo desenho exige separação explícita entre identidades de core e portal para reduzir blast radius e permitir políticas de segurança independentes.

### Decisão

Adotar OAuth2/OIDC com **domínios de identidade separados**:

1. **User pool CORE** para `sgp-admin`/`sgp-core-api` (staff).
2. **User pool PORTAL** para `sgp-portal-ui`/`sgp-portal-api` (employees/beneficiários/candidatos).
3. **Client credentials** para integrações externas.

Integração com IdP externo (ex.: Gov.br) é opcional e restrita ao domínio de identidade do portal.

```
sgp-admin ──[PKCE]──► UserPool CORE ──► sgp-core-api
sgp-portal-ui ──[PKCE]──► UserPool PORTAL ──► sgp-portal-api
Sistema externo ──[client_credentials]──► IdP M2M ──► /api/external/v1/...
```

Guards NestJS: `AuthGuard (JWT)` → `TenantGuard` → `PermissionsGuard (@RequirePermissions)`.

### Alternativas consideradas

**Opção A — Keycloak (self-managed)**

- Prós: open-source; customização total; sem lock-in de cloud.
- Contras: operação de mais um serviço stateful na infra; upgrades manuais; HA exige cluster dedicado; custo de operação e expertise de configuração.

**Opção B — Auth0 (SaaS)**

- Prós: melhor UX de configuração.
- Contras: custo crescente por MAU (Monthly Active Users) — inviável para 100+ tenants × N usuários; dados fora do ambiente AWS BR; compliance de dados públicos questionável.

**Opção C — JWT manual (implementar próprio Identity Provider)**

- Prós: controle total; sem dependências externas.
- Contras: responsabilidade de segurança crítica na equipe (armazenamento de senha, rotação de segredos, MFA); retrabalho enorme; não recomendado para dados públicos sensíveis.

**Opção D — SAML (legado enterprise)**

- Prós: compatível com provedores de identidade corporativos legados.
- Contras: protocolo mais complexo, XML-based; sem suporte nativo a SPAs modernas; PKCE não é suportado.

### Consequências

**Positivas:**

- Zero gestão local de senha no código do SGP.
- Integração nativa com todos os serviços AWS (API Gateway authorizer, ALB authentication).
- Separação de blast radius entre autenticação administrativa e autenticação de autoatendimento.
- `client_credentials` para sistemas externos — elimina API-key custom e seus riscos.
- JWT stateless: validação sem round-trip ao banco de identidade em cada request.

**Negativas:**

- Lock-in AWS Cognito: migrar para outro IdP exigiria atualização de todos os App Clients.
- Cognito tem limitações de customização de UI (hosted UI pouco flexível) — mitigado pelo uso de SDK JavaScript com UI própria.
- Duas superfícies de identidade para operar e monitorar.
- Multi-tenant exige claim `tenant_id` validado no `TenantGuard`.

### Referências

- BRIEF.md §2, decisão #4 — OAuth2/OIDC via Cognito.
- BRIEF.md §4 — Modelo de autorização RBAC.
- BRIEF.md §2, decisão #5 — separação de identidade e runtime entre core e portal.
- ADR-001 — Multi-tenant com tenant_id.

---

## ADR-005: Portal do Funcionário como Aplicação Separada (UI + API)

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se surgir demanda comprovada de SEO para páginas do portal ou se adoção mobile nativa superar 60% dos acessos no portal.

---

### Contexto

O SGP atende dois perfis de usuário fundamentalmente diferentes:

**Usuário administrativo** (`sgp-admin`): servidor de RH, gestor de folha, médico perito, auditor. Acessa diariamente, opera fluxos complexos com muitos campos e estados, precisa de telas densas e responsividade a múltiplas ações simultâneas. Acesso exclusivamente via rede corporativa ou VPN.

**Employee/pensionista/candidato** (`sgp-portal-ui`): cidadão que acessa esporadicamente para consultar contracheque, solicitar documentos, realizar recadastramento, submeter currículo ou fazer prova de vida. Acesso via internet pública, com dispositivos variados. Precisa de interface simplificada, com menu reduzido e experiência orientada a tarefas pontuais.

Essas duas audiências têm requisitos opostos de:

- **Bundle size**: portal deve ser leve (usuários em conexões móveis); admin pode ser robusto.
- **Segurança**: portal é exposto à internet pública; admin pode ter controles adicionais de rede.
- **Cadência de deploy**: funcionalidades de autoatendimento evoluem em ritmo diferente do back-office.
- **Autenticação**: portal e admin usam domínios de identidade separados; federação externa no portal é opcional.

### Decisão

Implementar o portal como aplicação separada do core, com dois artefatos dedicados:

- `apps/sgp-admin` — aplicação administrativa completa para `SGP-CORE`.
- `apps/sgp-portal-ui` — frontend de autoatendimento.
- `apps/sgp-portal-api` — backend do portal com acesso read-only ao banco por role de menor privilégio.

As aplicações:

- Compartilham **libs Angular do monorepo**: `@sgp/ui` (design system), `@sgp/authz` (guards e diretivas de permissão), `@sgp/domain` (tipos TypeScript), `@sgp/infra` (clientes HTTP).
- Não compartilham runtime backend: `sgp-admin` consome `sgp-core-api` e `sgp-portal-ui` consome `sgp-portal-api`.
- São servidas por **CloudFront distributions distintas**: admin com restrição de IP/WAF mais agressiva; portal aberto com rate limiting.

Funcionalidades do portal: consulta de contracheques, holerite, documentos pessoais, recadastramento, prova de vida, consulta de benefícios, banco de talentos/currículo, acompanhamento de requisição de pessoal.

### Alternativas consideradas

**Opção A — SSR com Next.js ou Nuxt.js**

- Prós: melhor SEO (relevante para portal público); First Contentful Paint mais rápido em conexões lentas.
- Contras: introduz React/Vue no stack — equipe já domina Angular; design system precisaria ser reescrito; complexidade de hidratação em apps com estado rico; para um portal de cidadão autenticado, SEO não é relevante (conteúdo não é indexável).

**Opção B — Bundle único admin + portal com feature flags**

- Prós: single deploy; compartilhamento de código mais simples.
- Contras: bundle imenso carregado por cidadão que usa apenas 10% das features; risco de exposição de lógica administrativa no cliente do portal; impossibilidade de diferentes políticas de CSP/WAF por aplicação.

**Opção C — Aplicativo mobile nativo (React Native ou Flutter)**

- Prós: experiência nativa; acesso a recursos do dispositivo (câmera para prova de vida).
- Contras: custo de desenvolvimento e manutenção de app nativo adicional; time to market maior; distribuição via App Store/Play Store; não cobre candidatos e pensionistas que preferem desktop.

**Opção D — PWA (Progressive Web App) única**

- Prós: instalável no dispositivo; funciona offline.
- Contras: complexidade de service worker em app com dados sempre atualizados; não resolve separação de bundle ou de segurança.

### Consequências

**Positivas:**

- Bundle do portal significativamente menor: somente os módulos de autoatendimento são incluídos.
- Políticas de segurança distintas: WAF do portal protege internet pública; admin pode ser restrito por IP.
- Deploy independente: nova funcionalidade no portal não exige regressão completa do admin.
- Backend portal opera com privilégio mínimo e acesso somente leitura.
- Libs compartilhadas garantem consistência visual e comportamental (design system único).

**Negativas:**

- Dois projetos Angular para manter; dois pipelines de build e e2e.
- Possibilidade de divergência de comportamento entre aplicações se libs compartilhadas não forem bem versionadas.
- Complexidade inicial de configuração do monorepo Nx para dois apps.

### Referências

- BRIEF.md §2, decisão #5 — Portal como aplicação separada (`ui` + `api`).
- ADR-004 — Autenticação com user pools separados (core x portal).
- ADR-011 — Monorepo Nx.

---

## ADR-006: Armazenamento de arquivos exclusivamente em S3

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se custo de S3 + CloudFront superar alternativa EFS por fator > 3x em cenário de produção real com volumes conhecidos.

---

### Contexto

O SGP gera e consome um volume expressivo de arquivos binários:

- **Documentos funcionais**: dossiê do servidor (CPF, RG, CTPS, atos de nomeação, laudos, termos de posse) — centenas de PDFs por servidor.
- **Saídas de folha**: contracheques individuais e em massa, relatórios financeiros, batimentos — gerados mensalmente para todos os servidores de todos os tenants.
- **Integrações**: arquivos CNAB de remessa/retorno bancário, XMLs eSocial, SIPREV, DIRF — produzidos em ciclos regulares.
- **Saúde ocupacional**: laudos periciais, prontuários, exames — documentos médicos com retenção legal de longo prazo.
- **Fotos e imagens**: foto de perfil do servidor, logotipos dos tenants.

O legado armazena arquivos em filesystem local do servidor de aplicação, o que cria: acoplamento entre instâncias de app, ausência de versionamento, risco de perda em falha de disco, impossibilidade de uso com containers stateless.

### Decisão

**Armazenamento S3-compatible exclusivamente**, sem fallback para disco local ou qualquer outro sistema de arquivos. Produção e homologação usam AWS S3; testes sem S3 configurado podem usar MiniIO em Docker conforme ADR-017. Estrutura adotada:

**Organização de buckets:**

- `sgp-{env}-tenant-{tenant_id}` — arquivos por tenant (documentos, fotos, anexos).
- `sgp-{env}-outputs` — saídas oficiais (contracheques, relatórios, integrações); estrutura de chave: `{tenant_id}/outputs/{dominio}/{ano}/{mes}/{id}.{ext}`.
- `sgp-{env}-imports` — arquivos de importação (CNAB, consignado, verbas); deletados após processamento.

**Segurança e compliance:**

- **SSE-KMS** com chave CMK por tenant (isolamento criptográfico).
- **Bucket policies** restringem acesso ao papel IAM do ECS Task (princípio do menor privilégio).
- **Presigned URLs** com TTL de 15 minutos para download — nunca URLs públicas permanentes.
- **Object Lock (COMPLIANCE mode)** em `sgp-{env}-outputs` para contracheques e documentos oficiais — imutabilidade garantida para auditoria e obrigações legais.
- **Versioning habilitado** em todos os buckets de documentos.
- **CloudFront** na frente do bucket de outputs para aceleração de download de PDFs.

**Lifecycle rules por tipo:**

- Documentos funcionais ativos: retenção indefinida.
- Saídas de folha: transition para S3 Glacier Instant Retrieval após 2 anos; delete após 10 anos.
- Arquivos de importação temporários: delete automático após 30 dias.
- Logs de acesso S3: delete após 90 dias.

### Alternativas consideradas

**Opção A — Filesystem no EC2/ECS com EBS**

- Prós: latência mínima; sem egress cost.
- Contras: stateful; impossível com múltiplas instâncias; backup manual; sem versionamento nativo; perda de dados em falha de instância.

**Opção B — Amazon EFS (NFS gerenciado)**

- Prós: filesystem POSIX compartilhado entre instâncias.
- Contras: custo significativamente mais alto que S3 para grandes volumes; latência superior ao EBS; operação mais complexa; sem Object Lock nativo.

**Opção C — Azure Blob Storage**

- Prós: feature parity com S3.
- Contras: stack inteiramente AWS; egress entre clouds; latência adicional; custo de transferência; compliance de dados públicos em cloud não-BR questionável.

**Opção D — Armazenamento híbrido (S3 para outputs, EFS para docs ativos)**

- Prós: otimiza custo por tipo de arquivo.
- Contras: dois sistemas para gerenciar; complexidade de módulo `arquivos`; risco de inconsistência; código mais complexo.

### Consequências

**Positivas:**

- Stateless total da camada de aplicação — qualquer instância ECS acessa qualquer arquivo.
- Durabilidade 99.999999999% (11 noves) garantida pela AWS.
- Object Lock para documentos oficiais atende requisitos de arquivo público imutável.
- Presigned URLs eliminam proxying de binários pela aplicação — download direto do S3/CloudFront.
- Custo por GB armazenado muito inferior a EBS/EFS.
- Isolamento criptográfico por tenant via KMS CMK.

**Negativas:**

- Egress cost de S3: downloads frequentes de PDFs grandes têm custo — mitigado pelo CloudFront (menor custo de egress).
- Presigned URLs expiram: sistema deve regenerar URLs em documentos de longa sessão.
- Módulo `arquivos` (abstração NestJS) é camada obrigatória — nenhum serviço acessa S3 diretamente.
- Testes de integração requerem S3 mock (LocalStack) ou bucket de dev dedicado.

### Referências

- BRIEF.md §2, decisão #6 — S3 exclusivo.
- BRIEF.md §7 — Saídas oficiais e chave determinística S3.
- ADR-014 — Observabilidade (inclui logs de acesso S3).

---

## ADR-007: eSocial suporta apenas layout S-1.2

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Imediatamente após publicação de portaria regulamentando o layout S-1.3 como obrigatório. Estimar prazo máximo de 6 meses para implementação após publicação.

---

### Contexto

O eSocial é o sistema de escrituração digital das obrigações fiscais, previdenciárias e trabalhistas. Para entes públicos (administração direta e indireta), os eventos relevantes incluem: tabelas de estabelecimento, rubricas, cargos, lotações, vínculos trabalhistas, folha de pagamento mensal e eventos não-periódicos (admissão, desligamento, afastamento, etc.).

O eSocial possui múltiplos layouts em produção e em transição:

- **S-1.0**: substituído, não mais aceito pelo webservice.
- **S-1.2**: layout atual regulamentado e obrigatório para entes públicos.
- **S-1.3**: versão em elaboração/consulta pública, sem prazo definido de obrigatoriedade.

Implementar suporte multi-layout em paralelo implicaria: duplicação de código de serialização XML, dois conjuntos de schemas XSD para validação, dois fluxos de Step Function distintos, ambiguidade em relatórios de status, e dificuldade de manutenção.

### Decisão

**Suportar exclusivamente o layout eSocial S-1.2** no MVP e nas versões subsequentes até que S-1.3 seja formalmente regulamentado como obrigatório.

Eventos implementados (S-1.2):

- **Tabelas**: S-1000 (Empregador), S-1005 (Estabelecimento), S-1010 (Rubricas), S-1020 (Lotações), S-1030 (Cargos/Empregos), S-1035 (Carreiras), S-1040 (Funções/Cargos em Comissão), S-1050 (Horários de Trabalho), S-1060 (Ambientes de Trabalho), S-1070 (Processos Administrativos/Judiciais), S-1080 (Op. Portuárias).
- **Não-periódicos (S-2xxx)**: S-2200 (Cadastramento), S-2205 (Alteração Dados Cadastrais), S-2206 (Alteração Contrato), S-2230 (Afastamento Temporário), S-2240 (Cond. Ambiente Trabalho), S-2298 (Reintegração), S-2299 (Desligamento), S-2400 (Cadastramento Benefícios), S-2405 (Alteração Benefícios), S-2410 (Cadastramento Beneficiário), S-2416 (Alteração Beneficiário), S-2420 (Cessação Benefício).
- **Periódicos (S-1200, S-1202, S-1207, S-1210, S-1280, S-1295, S-1299)**: folha mensal e fechamento de período.
- **Exclusão (S-3000)**: cancelamento de eventos enviados.

**Arquitetura de envio**:

- Lambda de geração XML → Step Function `esocial-envio` → assinatura A1/A3 via KMS → WebService SOAP → poll de status → gravação de recibo.
- Fila SQS `esocial.evento.pendente` com retry até 3, backoff exponencial.
- Certificado digital A1 armazenado cifrado no S3 + Secrets Manager para senha.

**Plano para S-1.3**:

- Feature flag `esocial.layout_version` controla qual serializador usar.
- Quando S-1.3 for obrigatório, implementar novos serializers sem remover S-1.2 (período de coexistência de 90 dias conforme cronograma regulatório).

### Alternativas consideradas

**Opção A — Suporte multi-layout paralelo (S-1.2 e S-1.3 simultaneamente)**

- Prós: cliente pode migrar para S-1.3 antecipadamente.
- Contras: duplicação de código antes de S-1.3 ser regulamentado; custo de desenvolvimento e teste sem benefício imediato; aumenta superfície de bugs; S-1.3 ainda não tem XSD final aprovado.

**Opção B — Suporte apenas à versão mais recente (S-1.3 quando regulamentado)**

- Prós: código mais moderno desde o início.
- Contras: entes públicos são obrigados a usar S-1.2 até a transição formal; sistema seria inoperante na obrigação legal imediata.

### Consequências

**Positivas:**

- Código de serialização XML simples e testável — apenas um schema XSD.
- Step Function de envio mais clara, sem ramificações por versão.
- Clientes adotam S-1.2 conforme obrigação legal vigente — sem necessidade de configuração.
- Menor superfície de bugs em integração crítica com Receita Federal e previdência.

**Negativas:**

- Quando S-1.3 for regulamentado, haverá sprint dedicada de migração — custo previsto e planejado.
- Clientes que queiram antecipar S-1.3 voluntariamente não serão atendidos até a regulamentação.
- Mudança de layout pode exigir atualização de XSD, mapeamentos e testes — custo de manutenção futuro.

### Referências

- BRIEF.md §2, decisão #7 — eSocial apenas S-1.2.
- BRIEF.md §6 — Tabela de integrações externas (eSocial).
- BRIEF.md §8 — Fila SQS `esocial.evento.pendente`, Step Function `esocial-envio`.

---

## ADR-008: Fórmulas de folha compiladas para SQL via DSL

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se o compilador DSL→SQL introduzir mais de 3 bugs críticos de cálculo em 12 meses de produção, ou se a curva de aprendizado da DSL impedir onboarding de novos configuradores em menos de 2 semanas.

---

### Contexto

As verbas (rubricas) da folha de pagamento têm valores calculados por fórmulas que dependem de:

- Atributos do funcionário (salário base, nível, jornada, dependentes, tempo de serviço).
- Tabelas de alíquotas (INSS, IRRF, Previdência Própria) com faixas progressivas.
- Resultados de outras verbas já calculadas na mesma competência (ex.: IRRF depende do provento bruto já calculado).
- Parâmetros globais (salário mínimo, teto INSS, valor por dependente IRRF).
- Valores históricos de competências anteriores (ex.: décimo terceiro acumula proventos do ano).

O legado utiliza um **interpretador JavaScript in-process** que avalia as fórmulas como strings de código JS em runtime. Problemas identificados:

- Performance ruim em lote: cada verba de cada contracheque é uma execução JS separada, sem aproveitamento do poder de processamento paralelo do PostgreSQL.
- Impossibilidade de explain plan: não dá para saber por que uma fórmula está lenta.
- Segurança: eval de JS em servidor é vetor de injeção.
- Testabilidade limitada: difícil isolar e testar uma fórmula sem instanciar o contexto completo de cálculo.

### Decisão

**DSL declarativa custom** para definição de fórmulas de verbas, com **compilador que transpila para SQL CTE**, executado diretamente no PostgreSQL via `sgp-payroll-engine`.

**Estrutura da DSL (exemplo):**

```
VERBA INSS_EMPREGADO
  BASE: salario_base + adicional_insalubridade
  TABELA: aliquota[tributo=INSS, ano=@competencia_ano]
  RESULTADO: progressivo(BASE, TABELA)
  MAXIMO: teto_inss
  TIPO: DESCONTO
```

**SQL gerado (CTE simplificado):**

```sql
WITH base_inss AS (
  SELECT
    f.id AS funcionario_id,
    (f.salario_base + COALESCE(af.adicional_insalubridade, 0)) AS base
  FROM funcionario f
  LEFT JOIN atributo_formula af ON af.funcionario_id = f.id
  WHERE f.folha_pagamento_id = $1
),
resultado_inss AS (
  SELECT
    b.funcionario_id,
    LEAST(
      calc_progressivo(b.base, a.faixas),
      p.teto_inss
    ) AS valor
  FROM base_inss b
  CROSS JOIN aliquota a
  CROSS JOIN parametro_global p
  WHERE a.tributo = 'INSS' AND a.ano = $2
    AND p.chave = 'TETO_INSS'
)
INSERT INTO lancamento (contracheque_id, verba_id, valor_calculado, memoria_calculo)
SELECT
  c.id, $3, r.valor, jsonb_build_object('base', b.base, 'aliquota', a.faixas, 'resultado', r.valor)
FROM resultado_inss r
JOIN base_inss b ON b.funcionario_id = r.funcionario_id
JOIN contracheque c ON c.funcionario_id = r.funcionario_id ...
```

**Fluxo de compilação:**

1. Administrador edita fórmula via UI (editor de DSL com validação sintática em tempo real).
2. Compilador valida semântica: atributos existem em `atributo_formula`, tipos compatíveis.
3. SQL gerado é armazenado em `formula.texto_sql_compilado`.
4. Engine executa o SQL compilado em batch — todos os funcionários elegíveis de uma vez.

**Shadow mode**: antes de ativar nova versão de fórmula, sistema roda ambas as versões em paralelo e compara resultados (diff JSONB), alertando divergências antes do fechamento.

**Atributos de fórmula**: tabela `atributo_formula` mapeia chaves DSL a colunas reais do banco (`path_semantico`, `origem_tabela`, `origem_coluna`) — o compilador usa essa tabela para validar e transpor referências.

### Alternativas consideradas

**Opção A — Interpretador JS (manter legado)**

- Prós: zero reescrita; time conhece o modelo.
- Contras: performance O(N) sequencial; eval inseguro; não aproveita paralelismo PostgreSQL; impossível explain plan; difícil de testar isoladamente.

**Opção B — Eval Groovy (JVM)**

- Prós: linguagem mais rica que JS; sandboxing razoável.
- Contras: introduz JVM no stack Node.js; overhead de inicialização; mesmos problemas de performance do interpretador.

**Opção C — Motor de regras externo (Drools, Easy Rules)**

- Prós: linguagem de negócio matura; suporte a RETE network.
- Contras: Java-centric; serialização/deserialização de contexto volumoso; latência de rede para motor externo; nenhuma das vantagens do SQL batch.

**Opção D — CEP/CQRS puro (eventos por verba)**

- Prós: auditoria natural; rastreabilidade por evento.
- Contras: explosão de eventos para folha com 200 verbas × 10.000 funcionários = 2M eventos/mês; latência de processamento sequencial de dependências entre verbas.

### Consequências

**Positivas:**

- Performance massiva: batch SQL processa 10.000 funcionários em uma única query CTE.
- Explain plan do PostgreSQL disponível para diagnóstico de performance.
- `memoria_calculo` JSONB gerado automaticamente pelo SQL — rastreabilidade completa por verba.
- Fórmulas testáveis isoladamente com fixtures SQL simples.
- Shadow mode permite validação de novas fórmulas sem risco ao fechamento.
- Segurança: nenhum `eval` de código não-verificado.

**Negativas:**

- DSL custom exige documentação e treinamento — configuradores de folha precisam aprender nova linguagem (estimativa: 1 semana).
- Compilador é código crítico: bug no compilador pode gerar SQL incorreto — cobertura de testes rigorosa obrigatória.
- Fórmulas muito complexas (ex.: progressões com múltiplas tabelas aninhadas) podem gerar SQL verbose e difícil de debugar.
- Ferramental limitado: não há IDE com suporte à DSL custom (autocompletar, highlight) — deve ser desenvolvido como parte do produto.

### Referências

- BRIEF.md §2, decisão #8 — Fórmulas compiladas para SQL.
- BRIEF.md §5.2 — Entidades de folha: `formula`, `atributo_formula`.
- Documentos legados: `52-folha-verbas-formulas-atributos.md`.
- ADR-002 — Motor de folha como microsserviço.

---

## ADR-009: Auditoria apenas para domínios sensíveis

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se requisito regulatório ou auditoria externa exigir rastreabilidade de domínios atualmente não cobertos. Rever lista de domínios semestralmente.

---

### Contexto

Em um ERP de folha pública, toda operação de dados poderia, em tese, ser auditável. No entanto, auditar cada INSERT/UPDATE/DELETE de todas as ~300 tabelas do SGP geraria:

- Volume estimado de 50–500 milhões de registros de auditoria por ano por tenant médio.
- I/O adicional de 30–60% em todas as operações de escrita.
- Custo de armazenamento proibitivo para retenção de 5+ anos.
- Tabela `audit_log` se tornando o maior gargalo de performance do sistema.

Ao mesmo tempo, existem domínios em que a rastreabilidade é **obrigação legal** (transparência pública, lei de acesso à informação, controle externo por TCE/TCU) ou **risco de negócio crítico** (folha com valores errados, alteração indevida de papel de usuário, manipulação de resultado de perícia).

### Decisão

**Auditoria seletiva** — registrar em `audit_log` somente operações nos seguintes domínios sensíveis:

| Domínio                                                                       | Justificativa                                                              |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Folha de pagamento (`lancamento`, `contracheque`, `verba`)                    | Valores pagos são obrigação pública; alterações manuais precisam de rastro |
| Verbas e fórmulas (`formula`, `atributo_formula`, `aliquota`)                 | Mudança de fórmula afeta pagamentos de todos os servidores                 |
| Vida funcional (`situacao_funcional`, `transferencia`, `posse`)               | Atos administrativos com efeito jurídico                                   |
| Processos previdenciários (`aposentadoria`, `pensao`, `compensacao`)          | Benefícios vitalícios; fraude tem impacto financeiro permanente            |
| Recadastramento (`recadastramento`, `prova_vida_externa`)                     | Obrigação de controle de benefício ativo                                   |
| Perícia médica (`prontuario_pericia`, `licenca_medica`)                       | Decisão médico-pericial com efeito em situação funcional e benefício       |
| Usuários e papéis (`usuario`, `papel`, `perfil`, `usuario_papel`)             | Alteração de acesso é vetor de fraude                                      |
| Parâmetros críticos (`parametro_sistema`, `parametro_global`, `feature_flag`) | Mudança de parâmetro afeta cálculos de todo o tenant                       |

**Estrutura do `audit_log`:**

```sql
CREATE TABLE audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id  UUID,
  dominio     TEXT NOT NULL,
  entidade    TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  acao        TEXT NOT NULL CHECK (acao IN ('CREATE','UPDATE','DELETE','LOGIN','EXPORT','PRINT')),
  diff_jsonb  JSONB,
  ip          INET,
  user_agent  TEXT,
  request_id  UUID
) PARTITION BY RANGE (timestamp);
```

Particionamento mensal de `audit_log` para manutenção de retenção e performance.

**Implementação NestJS**: decorador `@Auditable('DOMINIO')` nos services sensíveis; interceptor `AuditInterceptor` captura `before`/`after` do objeto e publica em fila SQS `audit.evento.criado` (consumidor grava assincronamente, sem impacto no I/O da operação principal).

**Retenção**: mínimo 5 anos conforme Lei de Acesso à Informação (LAI); Glacier para registros > 2 anos; delete automático após 7 anos (configurável por tenant).

### Alternativas consideradas

**Opção A — Auditoria completa (todo INSERT/UPDATE/DELETE)**

- Prós: rastreabilidade total; nenhum domínio descoberto.
- Contras: I/O 30–60% maior; tabela de auditoria maior que todas as outras combinadas; custo de armazenamento inviável; queries de auditoria lentas por volume.

**Opção B — Nenhuma auditoria estruturada (apenas logs de aplicação)**

- Prós: zero overhead.
- Contras: não atende LAI; sem capacidade de responder "quem alterou o salário deste servidor?"; inaceitável para entes públicos sujeitos a controle externo.

**Opção C — CDC com Debezium (Change Data Capture via WAL do PostgreSQL)**

- Prós: captura mudanças sem alterar código de aplicação; zero overhead em escrita; capture de todas as tabelas.
- Contras: infraestrutura adicional (Kafka/MSK + Debezium connector); latência eventual; complexidade de operação; volume ainda explosivo se capturar tudo; custo de Kafka MSK.

**Opção D — Triggers PostgreSQL por tabela auditada**

- Prós: captura garantida em nível de banco, mesmo para operações que bypass a aplicação.
- Contras: overhead de trigger em cada operação; dificulta migrations (trigger precisa ser mantida); lógica de auditoria no banco dificulta testabilidade; sem contexto de request HTTP (user_agent, request_id).

### Consequências

**Positivas:**

- I/O adicional limitado a ~15% do volume total de escrita (apenas domínios sensíveis).
- Tabela `audit_log` dimensionada para retença viável de 5+ anos.
- Rastreabilidade completa nos domínios com obrigação legal ou risco de negócio crítico.
- `diff_jsonb` permite responder "o que mudou" sem reconstruir estado de múltiplos registros.
- Consumo assíncrono via SQS: não atrasa a operação principal em caso de pico de auditoria.

**Negativas:**

- Domínios não listados ficam sem rastreabilidade — qualquer alteração de escopo exige atualização da lista.
- Auditoria assíncrona tem janela de perda em caso de falha da fila antes do consumo (mitigado por SQS com DLQ).
- `diff_jsonb` pode expor dados sensíveis (ex.: CPF, conta bancária) no log — necessidade de mascaramento de campos configuráveis.

### Referências

- BRIEF.md §2, decisão #9 — Auditoria em domínios sensíveis.
- BRIEF.md §5.10 — Entidade `audit_log`.
- BRIEF.md §8 — Fila SQS `audit.evento.criado`.
- Lei n. 12.527/2011 (LAI) — Lei de Acesso à Informação.

---

## ADR-010: Artefatos documentais completos antes de codar

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Após a entrega do primeiro módulo completo (estimado: 90 dias), reavaliar se a documentação prévia reduziu retrabalho conforme esperado.

---

### Contexto

O SGP reimplementado é um sistema de alta complexidade de domínio:

- 11 módulos funcionais com regras de negócio densas e interdependentes.
- Integrações externas com contratos formais e rígidos (eSocial, SIPREV, DIRF, CNAB).
- Saídas oficiais com formato regulamentado (contracheques, certidões, laudos).
- Fórmulas de cálculo de folha que precisam produzir resultados centavo a centavo idênticos ao legado.
- Regras previdenciárias com fundamento legal (modalidades de aposentadoria, tempo de contribuição, compensação).

Em projetos de reimplementação de ERP público, o padrão de **"descoberta por codificação"** (codar e descobrir requisitos ao encontrar problemas) é especialmente custoso porque:

- O legado Java/AngularJS tem comportamentos implícitos em 192 controladores que não estão documentados.
- eSocial, SIPREV e CNAB têm especificações de 300+ páginas com casos de borda não óbvios.
- Fórmulas de verbas interagem entre si — descobrir uma dependência ausente no meio da sprint quebra o sprint inteiro.
- Saídas oficiais (PDF, XML) com erros de formatação são recusadas pelos órgãos e exigem retrabalho de integração.

### Decisão

**Produzir artefatos documentais formais completos antes de iniciar a implementação de cada módulo**. Os artefatos obrigatórios por módulo são:

1. **Diagrama ER lógico** (Mermaid): todas as entidades, relacionamentos e campos relevantes.
2. **Especificação de casos de uso**: fluxos principais e alternativos, regras de negócio, pré/pós-condições.
3. **Contratos de API OpenAPI 3.1**: endpoints, DTOs de request/response, erros possíveis.
4. **Especificação de integrações externas**: leiautes de arquivo, sequência de chamadas, tratamento de erros, exemplos de XML/TXT.
5. **Catálogo de saídas oficiais**: template de cada documento, campos obrigatórios, regras de preenchimento.
6. **Cenários de regressão** (golden scenarios): casos de teste derivados do comportamento do legado.
7. **ADRs adicionais** para decisões técnicas específicas do módulo (ex.: algoritmo de cálculo de 13º salário proporcional).

A documentação é produzida a partir de: análise dos 62 documentos legados, inspeção do código Java/AngularJS do legado, entrevistas com especialistas de domínio (configuradores de folha, previdenciaristas).

**Critério de "documentação pronta"**: todos os 7 artefatos acima revisados e aprovados pelo PO e pelo tech lead antes de qualquer implementação do módulo ser iniciada.

### Alternativas consideradas

**Opção A — Pair-programming from day 1 (codar junto ao especialista de domínio)**

- Prós: descoberta de requisitos em tempo real; especialista valida implementação imediatamente.
- Contras: apenas um desenvolvedor efetivamente codando; conhecimento não fica registrado; próximo desenvolvedor começa do zero; bugs de requisito descobertos tarde são mais caros de corrigir.

**Opção B — MVP walking skeleton (infraestrutura primeiro, features depois)**

- Prós: prove de conceito técnico rápido; equipe ganha confiança no stack.
- Contras: sem requisitos de domínio formalizados, o skeleton pode ser construído com premissas erradas (ex.: modelo de dados que precisa ser refatorado quando o domínio real é descoberto).

**Opção C — Spike-first (explorar código legado por módulo antes de documentar)**

- Prós: entendimento empírico do legado; descobre comportamentos não documentados.
- Contras: spike sem artefato formal não transfere conhecimento; dois sprints de spike = dois sprints sem output utilizável.

**Opção D — Documentação iterativa (doc alongside code)**

- Prós: doc sempre reflete código real; menos risco de doc desatualizada.
- Contras: em áreas de alta incerteza (eSocial, SIPREV), descobrir requisito ao codar exige refatorar código já escrito — custo muito maior do que descobrir na documentação.

### Consequências

**Positivas:**

- Requisitos de domínio formalizados antes de qualquer linha de código — mudanças são feitas em markdown, não em TypeScript.
- Contratos de API definidos antecipadamente permitem desenvolvimento paralelo de frontend e backend.
- Leiautes de integração validados com especialistas antes de implementar — sem surpresas na homologação com eSocial ou TCE.
- Knowledge base permanente: qualquer desenvolvedor futuro consulta a documentação para entender o domínio.
- Onboarding acelerado de novos membros da equipe.

**Negativas:**

- Investimento inicial de 4–8 semanas de documentação antes do primeiro commit de feature.
- Risco de documentação "stale" se não for mantida atualizada com mudanças de implementação — processo de update deve ser parte do Definition of Done.
- Alguns requisitos só são descobertos ao implementar — documentação prévia reduz mas não elimina descobertas tardias.
- Pressão de stakeholders por velocidade de entrega pode questionar o período de documentação.

### Referências

- BRIEF.md §2, decisão #10 — i18n e terminologia (implica documentação formal de parâmetros).
- BRIEF.md §12 — Referências cruzadas com 62 documentos legados.
- Documentos legados: `06-modulos-prioritarios-detalhados.md`, `52-folha-verbas-formulas-atributos.md`, `59-integracoes-e-contratos-estaticos.md`.

---

## ADR-011: Workspace npm autoritativo, com Nx adiado

- **Status**: Reconciliado com estado atual
- **Data**: 2026-04-21
- **Revisão**: 2026-05-03
- **Decisores**: Arquitetura SGP
- **Marcador de CI**: ADR-011-CURRENT-STATE

---

### Contexto

O desenho inicial previa Nx para coordenar múltiplos runtimes. O estado implementado do SGP v0.0.1, porém, é um monorepo npm com dois workspaces (`frontend` e `backend`) e comandos autoritativos no dispatcher `scripts/run.mjs`.

Runtimes NestJS são entrypoints dentro de `backend/src/`:

- `main.ts` para `sgp-core-api`;
- `main-portal.ts` para `sgp-portal-api`;
- `main-payroll-engine.ts` para `sgp-payroll-engine`;
- `main-esocial-worker.ts` para `sgp-esocial-worker`;
- `main-integrations-worker.ts` para `sgp-integrations-worker`;
- `main-report-worker.ts` para `sgp-report-worker`;
- `main-report-service.ts` para `sgp-report-service`.

Frontends Angular vivem em `frontend/src/` e `frontend/portal/src/`. O repositório ainda não possui `nx.json`, `project.json` por app/lib, `eslint-plugin-nx`, nem árvore `apps/`/`libs/` instalada.

### Decisão

Para v0.0.1, a autoridade operacional é:

- npm workspaces em `package.json`;
- Node 24 e npm 11.12.1 fixados nos manifests;
- `scripts/run.mjs` e `scripts/lib/workspace-commands.mjs` como superfície única de comandos;
- evidência local e CI por `npm run lint:check`, `npm run format:check`, `npm run typecheck`, `npm run test:*`, `npm run governance:check`, `npm run evidence:check`;
- OpenAPI gerado e versionado em `frontend/src/app/core/api/generated/` e `frontend/portal/src/app/core/api/generated/`.

Nx fica adiado. Ele só deve ser reintroduzido por nova ADR quando houver necessidade comprovada de `affected`, cache distribuído ou boundaries formais entre pacotes internos que justifiquem migrar a estrutura atual.

### Consequências

**Positivas:**

- O estado documentado passa a refletir a árvore real do repositório.
- A superfície de comandos permanece pequena, auditável e compatível com npm workspaces.
- O gate de governança consegue validar scripts e caminhos sem pressupor Nx inexistente.

**Negativas:**

- O repositório não tem `nx affected` nem cache distribuído.
- Boundaries entre domínios continuam sendo disciplina de código, lint e módulo Nest/Angular, não constraints Nx.
- Uma futura migração para Nx exigirá ADR própria e atualização coordenada de scripts, CI e docs.

### Referências

- `package.json`
- `scripts/run.mjs`
- `scripts/lib/workspace-commands.mjs`
- `docs/gov/runtime-topology.json`

---

## ADR-012: PostgreSQL 16 como único SGBD

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar adição de OpenSearch quando volume de `audit_log` + consultas textuais complexas superar capacidade comprovada do `pg_trgm` (ex.: query > 2 s em índices tuned).

---

### Contexto

Projetos de ERP modernos frequentemente adotam múltiplos bancos de dados especializados: MongoDB para documentos flexíveis, Redis para cache, Elasticsearch para busca textual, etc. ("polyglot persistence"). No SGP, avaliamos se essa complexidade adicional é justificada.

O SGP é eminentemente relacional: dados de folha, vínculos, benefícios, perícias — tudo tem relacionamentos fortes com integridade referencial. Modelos flexíveis (MongoDB) seriam inadequados para o núcleo do negócio. Buscas textuais são necessárias, mas para nomes, CPFs e matrículas — não para texto livre complexo.

### Decisão

**PostgreSQL 16+ como único SGBD** para dados primários. Extensões utilizadas:

- `pg_trgm` para busca textual por similaridade em `pessoa.nome`, `pessoa.cpf`, `funcionario.matricula`.
- `tsvector` + `tsquery` para busca full-text em documentos (limitado a campos específicos).
- `uuid-ossp` / `gen_random_uuid()` para PKs UUID.
- `pgcrypto` para hash de dados sensíveis em auditoria.
- Particionamento nativo por range (tabelas `contracheque`, `lancamento`, `audit_log` por ano/mês).
- JSONB para `memoria_calculo`, `diff_jsonb` em auditoria, `criterios_json` em progressão.

**Redis**: usado **exclusivamente** como cache de sessão e rate limiting via ElastiCache — nunca como banco de dados primário. Nenhum dado de negócio reside apenas no Redis.

**MongoDB**: não utilizado. Dados semiestruturados são armazenados como JSONB no PostgreSQL com índices GIN.

**Elasticsearch / OpenSearch**: não utilizado no MVP. `pg_trgm` com índice GIN cobre os casos de busca do SGP adequadamente. Caso de adição futura: se volume de `audit_log` exigir busca full-text avançada por texto livre, OpenSearch pode ser adicionado como índice derivado (CDC ou ETL periódico), nunca como fonte da verdade.

**Justificativa da escolha única:**

- RLS, particionamento, JSONB, `pg_trgm` e `tsvector` resolvem os casos de uso identificados.
- Operação de um único cluster RDS Multi-AZ é dramaticamente mais simples que polyglot persistence.
- Custo de infra menor: sem clusters MongoDB, ES ou Kafka adicionais.
- Migrations Flyway/Prisma Migrate cobrem todo o schema em um único lugar.
- Backup, point-in-time recovery e DR em um único serviço.

### Consequências

**Positivas:**

- Infra mais simples: um cluster RDS para operar, monitorar, fazer backup e restaurar.
- Transações ACID entre módulos (ex.: posse atualiza `funcionario` + cria `situacao_funcional` atomicamente).
- RLS, particionamento e JSONB disponíveis sem serviço adicional.
- Equipe com expertise concentrada em PostgreSQL.

**Negativas:**

- `pg_trgm` é menos poderoso que Elasticsearch para busca full-text complexa — limitação aceitável para o MVP.
- Redis como cache cria segunda dependência de infraestrutura (mitigado por ser stateless/substituível).
- Se necessidade de busca avançada emergir, adicionar OpenSearch é trabalho não planejado.

### Referências

- BRIEF.md §2 — Stack: PostgreSQL 16+ com RLS, JSONB, `pg_trgm`, particionamento.
- ADR-001 — Multi-tenant com RLS.
- ADR-009 — Auditoria com `audit_log` particionado.

---

## ADR-013: Event-driven via EventBridge + SNS + SQS + Step Functions

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar se volume de eventos ultrapassar 10 milhões/mês de forma sustentada por mais de 6 meses, tornando Kafka MSK economicamente competitivo.

---

### Contexto

O SGP possui vários processos assíncronos interdependentes:

- Cálculo de folha em lote (processamento massivo, paralelizável por filial).
- Envio de eventos eSocial (sequência de passos com retry, timeout e recibo).
- Geração de PDFs (contracheques em massa, relatórios).
- Processamento de remessa/retorno bancário.
- Auditoria assíncrona.
- Jobs periódicos (fechamento de competência programado, prova de vida, desligamento de estagiário).

Esses processos precisam de: filas com dead-letter queue, retry com backoff, orquestração de múltiplos passos, e visibilidade de estado. A escolha do mecanismo de mensageria determina custo operacional, complexidade e lock-in.

### Decisão

**Stack AWS-native de mensageria**:

| Serviço                   | Uso                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Amazon EventBridge**    | Barramento central de eventos de domínio; roteamento por regras; integração nativa com CloudWatch e Lambda |
| **Amazon SNS**            | Fan-out de notificações (ex.: `folha.calculada` → múltiplos consumidores)                                  |
| **Amazon SQS**            | Filas de trabalho com DLQ; consumo por `sgp-payroll-engine`, workers eSocial, geração de relatórios        |
| **AWS Step Functions**    | Orquestração de fluxos complexos multi-passo: `payroll-lote`, `esocial-envio`                              |
| **EventBridge Scheduler** | Jobs cron (substitui cron in-process ou ECS task scheduling)                                               |

**Filas SQS configuradas** (conforme BRIEF §8):

- `folha.calculo.solicitada` (padrão, visibilidade 30min, DLQ após 3 tentativas).
- `folha.calculo.concluida` (padrão).
- `contracheque.gerar.pdf` (padrão, visibilidade 10min).
- `esocial.evento.pendente` (FIFO por evento para garantir ordem dentro do mesmo empregador, DLQ após 3 tentativas com backoff exponencial).
- `remessa.gerar` / `retorno.processar` (padrão).
- `audit.evento.criado` (padrão, high throughput, DLQ).

### Alternativas consideradas

**Opção A — Apache Kafka / AWS MSK**

- Prós: throughput massivo (milhões/s); retenção de log; replay de eventos; ecossistema maduro (Kafka Connect, KSQL).
- Contras: custo de MSK (instâncias EC2 permanentes); complexidade operacional (brokers, ZooKeeper/KRaft, partições, offsets); over-engineering para volume esperado do SGP (< 500K eventos/mês); sem serverless option estável.

**Opção B — RabbitMQ (Amazon MQ)**

- Prós: protocolo AMQP bem conhecido; suporte a routing key e exchanges flexíveis.
- Contras: stateful; Amazon MQ tem custo de instância permanente; sem integração nativa com Step Functions; NATS é mais moderno para o mesmo caso de uso.

**Opção C — NATS**

- Prós: ultra-baixa latência; levíssimo; JetStream para persistência.
- Contras: self-managed no ECS; sem integração nativa AWS; menos maduro para casos de uso de auditoria e retry gerenciado.

**Opção D — Bull/BullMQ (Redis-based)**

- Prós: simples; in-process com o NestJS; UI de monitoramento.
- Contras: Redis como dependência de missão crítica; sem orquestração de múltiplos serviços; fila isolada por app — não serve para comunicação entre `sgp-core-api` e `sgp-payroll-engine`.

### Consequências

**Positivas:**

- Zero infra para gerenciar: SQS/SNS/EventBridge são serverless gerenciados.
- Step Functions provê visualização de estado de fluxos complexos (eSocial, lote de folha) no console AWS.
- EventBridge Scheduler elimina cron in-process — mais confiável e monitorável.
- DLQ nativa em SQS: mensagens com falha ficam retidas para reprocessamento manual.
- Integração nativa com CloudWatch: métricas de profundidade de fila sem código extra.

**Negativas:**

- Lock-in AWS: migrar para outro provider exige reescrever toda a camada de mensageria.
- SQS não garante ordem estrita (exceto FIFO, que tem throughput limitado a 300 TPS por grupo de mensagens).
- EventBridge tem latência de ~100ms — inaceitável para comunicação síncrona (não usar para isso).
- Custo cresce linearmente com volume de mensagens (vs. Kafka que tem custo fixo de instância).

### Referências

- BRIEF.md §2 — Stack: SNS/SQS/EventBridge, Step Functions.
- BRIEF.md §8 — Filas, tópicos e Step Functions do SGP.
- ADR-002 — Motor de folha (consome SQS).
- ADR-007 — eSocial (Step Function de envio).

---

## ADR-014: Observabilidade com OpenTelemetry + CloudWatch + X-Ray

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Reavaliar Datadog ou Grafana Cloud se custo de CloudWatch superar $2.000/mês por ambiente de produção, ou se necessidade de alertas avançados de SLO/SLA não for atendida pelo CloudWatch nativo.

---

### Contexto

O SGP é um sistema de missão crítica — fechamento de folha, envio de eventos eSocial e recadastramento de aposentados não podem falhar silenciosamente. A equipe precisa de visibilidade completa sobre:

- **Rastreamento distribuído**: uma requisição de cálculo de folha passa por `sgp-core-api` → SQS → `sgp-payroll-engine` → RDS Read Replica → SQS → `sgp-core-api`. Onde está o gargalo?
- **Métricas de negócio**: folhas fechadas/mês, contracheques emitidos, eventos eSocial pendentes/enviados/com erro, tempo médio de cálculo por contracheque.
- **Logs estruturados**: correlação entre log, trace e métrica via `trace_id` / `request_id`.
- **Alertas proativos**: SQS DLQ com mensagens > 0, RDS CPU > 80%, tempo de cálculo de lote > SLA.

O custo de observabilidade é relevante: Datadog cobra por host e por log volume — em uma plataforma multi-tenant com dezenas de tenants e picos de fechamento de folha, o custo poderia superar $10.000/mês.

### Decisão

**OpenTelemetry (OTel) como camada de instrumentação**, com exportadores para:

- **AWS X-Ray**: rastreamento distribuído; integração nativa com ECS, RDS, SQS, Step Functions; visualização de service map.
- **Amazon CloudWatch Metrics**: métricas custom de negócio e de infraestrutura; dashboards; alarmes com SNS.
- **Amazon CloudWatch Logs**: logs estruturados JSON com embedded metrics format (EMF) para métricas derivadas de logs.

**Instrumentação NestJS**:

- `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` para HTTP, banco, SQS automáticos.
- Spans customizados em: cálculo de fórmula por verba, envio de evento eSocial, geração de PDF.
- `trace_id` propagado em headers HTTP e em mensagens SQS (atributo de mensagem).
- Logs JSON sempre incluem: `tenant_id`, `trace_id`, `span_id`, `request_id`, `usuario_id`, `nivel`, `mensagem`, `duracao_ms`.

**Métricas de negócio obrigatórias** (namespace CloudWatch `SGP/Negocio`):

- `FolhasFechadas` (count por tenant/competência).
- `ContrachequeEmitidos` (count por tipo).
- `EventosESocial` (count por status: ENVIADO, ERRO, PENDENTE).
- `TempoCaculoLote` (histogram em segundos por filial).
- `RecadastramentosVencendo` (gauge).

**Grafana Cloud (opcional)**: exportador OTel adicional para Grafana Cloud pode ser habilitado por feature flag para tenants que exijam dashboards mais ricos — sem custo para o SGP se o tenant banciar.

### Alternativas consideradas

**Opção A — Datadog**

- Prós: melhor DX de observabilidade; APM nativo; log management avançado; alertas SLO.
- Contras: custo proibitivo — $23/host/mês × N instâncias ECS + ingestão de logs por GB; estimativa $5.000–15.000/mês em produção; dados saem do ambiente AWS.

**Opção B — ELK Stack self-managed (Elasticsearch + Logstash + Kibana)**

- Prós: open-source; customizável; sem custo de licença.
- Contras: operação pesada de cluster Elasticsearch; não resolve traces distribuídos sem Jaeger/Zipkin adicional; custo de infra similar ao CloudWatch.

**Opção C — Apenas logs CloudWatch sem OTel**

- Prós: zero configuração adicional (ECS já envia logs para CloudWatch).
- Contras: sem rastreamento distribuído; impossível correlacionar log de `sgp-core-api` com log de `sgp-payroll-engine` na mesma requisição; debugging de problemas de performance inviável.

### Consequências

**Positivas:**

- OTel como padrão aberto: exportadores podem ser trocados sem alterar código de instrumentação.
- X-Ray service map visualiza o grafo completo de dependências do SGP.
- CloudWatch EMF permite métricas de negócio derivadas de logs sem código adicional.
- Custo controlado: CloudWatch cobra por ingestão e retenção — configurar retenção de 30 dias para logs de debug, 1 ano para logs de auditoria.
- Sem dados saindo do ambiente AWS (compliance de dados públicos).

**Negativas:**

- CloudWatch Insights queries têm sintaxe própria, menos poderosa que Kibana ou Datadog.
- X-Ray tem sampling de traces (não 100% dos traces são capturados por padrão) — pode perder eventos raros.
- Custo de CloudWatch Logs pode ser alto em ambiente com muitos tenants e logs verbosos — necessário configurar log levels por ambiente.

### Referências

- BRIEF.md §2 — Stack: OpenTelemetry → CloudWatch/X-Ray.
- ADR-002 — Motor de folha (trace distribuído cross-serviço).
- ADR-013 — EventBridge/SQS (integração nativa X-Ray).

---

## ADR-015: Estratégia de versionamento de API `v1` e deprecation policy

- **Status**: Aceito
- **Data**: 2026-04-21
- **Decisores**: Arquitetura SGP
- **Revisão**: Quando a primeira breaking change for necessária (a política entra em vigor nesse momento).

---

### Contexto

O SGP expõe APIs consumidas por:

1. **Frontend interno** (`sgp-admin`, `sgp-portal-ui`) — controlado pelo time SGP, pode ser atualizado junto com a API.
2. **Sistemas externos de tenants** (prefeituras, consignatárias, portais de transparência) — integrados via `ROLE_EXTERNAL_SYSTEM`; atualizações são custosas e exigem coordenação com o cliente.
3. **Integrações próprias** (`sgp-payroll-engine`, `sgp-esocial-worker`) — controladas pelo time SGP, mas comunicação via contratos explícitos.

Breaking changes sem versionamento adequado causam: falhas silenciosas em sistemas de terceiros, janelas de manutenção emergenciais, erosão de confiança dos clientes. O SGP legado não tinha política formal de API — mudanças eram feitas sem comunicação antecipada.

### Decisão

**Prefixo `/api/v1/` em todos os endpoints** desde o primeiro deploy. Política formal de versionamento:

**O que constitui breaking change (exige `v2`):**

- Remoção de campo obrigatório de request ou response.
- Alteração de tipo de campo (ex.: `string` → `number`).
- Remoção de endpoint.
- Alteração de semântica de operação existente (ex.: POST que antes criava passa a retornar 409 em caso já existente).
- Alteração de códigos de erro documentados.

**O que NÃO é breaking change (pode ser feito em `v1`):**

- Adição de campo opcional em response (consumidores devem ignorar campos desconhecidos).
- Adição de novo endpoint.
- Adição de campo opcional em request.
- Correção de bug que muda comportamento incorreto documentado como incorreto.

**Ciclo de deprecation:**

1. Nova versão `v2` disponível em paralelo com `v1`.
2. Header `Deprecation: true` + `Sunset: <data>` em todas as respostas `v1` a partir do anúncio.
3. **Mínimo 6 meses** de coexistência `v1` + `v2` antes de desligar `v1`.
4. Notificação por e-mail para todos os `ROLE_EXTERNAL_SYSTEM` registrados com pelo menos 3 meses de antecedência.
5. Monitoramento de uso: se `v1` ainda tiver > 5% de chamadas no mês anterior ao sunset, prazo é estendido automaticamente por 30 dias.

**Estrutura de URLs:**

```
/api/v1/<recurso>           # endpoints administrativos (sgp-admin)
/api/portal/v1/<recurso>    # endpoints do Portal do Funcionário (servidos pelo sgp-portal-api)
/api/external/v1/<recurso>  # endpoints para sistemas externos
/api/admin/v1/<recurso>     # endpoints de administração da plataforma
```

**OpenAPI**: cada versão tem spec dedicada (`/api/v1/openapi.json`, `/api/v2/openapi.json`); geração automática via `@nestjs/swagger` com decoradores por versão.

**Changelog**: arquivo `CHANGELOG-API.md` atualizado a cada release com seções `Breaking Changes`, `New Features`, `Deprecations`.

### Alternativas consideradas

**Opção A — Versionamento por header (`Accept: application/vnd.sgp.v2+json`)**

- Prós: URLs mais limpas; padrão REST puro.
- Contras: menos descobrível; dificulta testes via browser/curl; ferramentas de gateway e cache mais complexas de configurar.

**Opção B — Sem versionamento (manter compatibilidade para sempre)**

- Prós: zero overhead de manutenção de versões paralelas.
- Contras: impossível evolução da API sem riscos; acumula dívida técnica indefinidamente; campos obsoletos permanecem para sempre.

**Opção C — Deprecation de 3 meses (mais curto)**

- Prós: ciclo de evolução mais rápido.
- Contras: sistemas de terceiros em entes públicos têm ciclos de homologação longos (TI municipal pode demorar 2–3 meses para agendar uma atualização); 3 meses é insuficiente na prática do setor público.

### Consequências

**Positivas:**

- Clientes externos têm garantia contratual de estabilidade mínima de 6 meses.
- Breaking changes podem ser feitas sem medo de quebrar produção de clientes.
- Header `Sunset` padronizado (RFC 8594) permite automação de alertas nos clientes.
- Monitoramento de uso garante que versões não sejam desligadas com clientes ainda dependentes.

**Negativas:**

- Manutenção de duas versões em paralelo por até 6 meses aumenta carga de desenvolvimento.
- Risco de "v1 para sempre" se clientes nunca migrarem — política de sunset deve ser enforçada.
- OpenAPI spec por versão aumenta superfície de documentação a manter.

### Referências

- BRIEF.md §11 — Convenções REST: `/api/v1/<recurso>`, paginação, erros RFC 7807.
- RFC 8594 — The Sunset HTTP Header Field.
- ADR-004 — Cognito (client_credentials para sistemas externos afetados por versionamento).

---

## ADR-016: Admin e identidade instalados posteriormente

- **Status**: Aceito temporariamente
- **Data**: 2026-04-26
- **Decisores**: Product Owner / Arquitetura SGP
- **Revisão**: Antes de retomar a árvore frontend do `sgp-admin`, rotas backend administrativas, OAuth/Cognito/Gov.br ou gestão administrativa de usuários/perfis/permissões.

### Contexto

A árvore frontend do `sgp-admin`, rotas `/api/v1/admin`, rotas `/api/admin/v1`, OAuth/Cognito/Gov.br e gestão administrativa corporativa serão instaladas oportunamente em versão posterior. Qualquer código já presente para navegação ou workspace administrativo é oportunístico e não deve ser usado como evidência de aceite do pacote atual.

### Decisão

Classificar a árvore frontend do `sgp-admin`, rotas backend administrativas e identidade como `ADMIN_INSTALL_LATER` ou `IDENTITY_INSTALL_LATER` nos artefatos de alinhamento.

### Consequências

- Falhas de rotas backend administrativas, navegação/menu frontend do `sgp-admin` ou token exchange OAuth não entram como gap corrente.
- O alinhamento deve ignorar registros atuais de `admin_menu` como evidência de aceite enquanto `ADMIN_INSTALL_LATER` estiver vigente.
- O alinhamento de rotas deve separar rotas correntes de rotas postergadas.
- A retomada exige nova decisão e atualização coordenada de docs, rotas, UI, autorização e testes.

---

## ADR-017: MiniIO em Docker para testes sem S3 configurado

- **Status**: Aceito
- **Data**: 2026-04-26
- **Decisores**: Product Owner / Arquitetura SGP
- **Revisão**: Ao definir a estratégia definitiva de ambiente de CI.

### Contexto

O BRIEF exige S3 para documentos oficiais, mas testes locais/CI nem sempre têm bucket S3 real configurado. O fallback anterior para disco local não preservava o contrato S3-compatible.

### Decisão

Produção e homologação continuam exigindo S3 real. Em testes (`NODE_ENV=test` ou `MINIO_TEST_STORAGE_ENABLED=true`) sem `S3_DOCUMENTS_BUCKET`/`S3_REGION`, o runtime usa MiniIO em Docker como substituto S3-compatible com endpoint padrão `http://127.0.0.1:9000` e bucket `sgp-test-documents`.

### Consequências

- Não há fallback de documento gerado para disco local no runtime.
- Testes preservam semântica S3-compatible sem depender de AWS real.
- Ambientes de CI devem subir MiniIO quando exercitarem operações reais de storage.

---

## ADR-018: eSocial stubado como provedor externo

- **Status**: Aceito temporariamente
- **Data**: 2026-04-26
- **Decisores**: Product Owner / Arquitetura SGP
- **Revisão**: Antes de homologação oficial eSocial.

### Contexto

eSocial depende de certificados, ambiente de homologação externo e regras operacionais fora do controle do código local.

### Decisão

Manter eSocial como provedor externo stubado/sandbox no pacote atual. O runtime deve gerar payloads, registrar eventos e exercitar o fluxo interno; transmissão real, certificados produtivos e homologação externa ficam postergados.

### Consequências

- Ausência de envio real eSocial não é gap corrente.
- Testes devem validar geração/estado interno e o contrato do adapter stub.
- A integração real exigirá novo ADR ou revisão deste ADR.

---

## ADR-019: Estratégia `./infra` temporariamente aberta

- **Status**: Aceito temporariamente
- **Data**: 2026-04-26
- **Decisores**: Product Owner / Arquitetura SGP
- **Revisão**: Antes de qualquer release produtiva.

### Contexto

Os documentos anteriores assumiam Terraform ou templates CloudFormation, mas a decisão final de provisionamento ainda não foi tomada.

### Decisão

Afrouxar temporariamente a exigência de `./infra`. CloudFormation, Terraform, AWS SDK e scripts AWS CLI são opções válidas até decisão futura. A escolha definitiva deve preservar revisão humana, segregação por ambiente, controle de estado e proteção de segredos.

### Consequências

- Templates placeholder em `./infra` não são gap corrente.
- Nenhum caminho específico de IaC é obrigatório nesta reavaliação.
- A decisão final precisa atualizar BRIEF, arquitetura, runbooks e pipelines.

---

## ADR-020: Gates de governança postergados

- **Status**: Aceito temporariamente
- **Data**: 2026-04-26
- **Decisores**: Product Owner / Arquitetura SGP
- **Revisão**: Antes de release candidate.

### Contexto

Pact broker/provider, GitHub Actions completos, scanners, observabilidade produtiva e gates de release são importantes, mas não devem bloquear a reavaliação funcional atual.

### Decisão

Postergar implementação dos gates de governança. Permanecem como alvo de release e devem ficar documentados, mas não contam como gap aberto do pacote corrente.

### Consequências

- Ausência de `.github` workflows, Pact broker e scanners não é gap corrente.
- Cobertura unitária, build, DB smoke e alinhamento de rotas continuam sendo gates técnicos locais.
- A retomada dos gates exige plano próprio antes de release candidate.

---

_Fim do documento — 20 ADRs — SGP Moderno v1.0 — 2026-04-26_
