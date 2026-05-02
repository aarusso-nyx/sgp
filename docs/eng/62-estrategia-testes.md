# Estratégia de Qualidade e Testes — SGP Moderno

**Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Draft
**Escopo:** todos os bounded contexts | **Depende de:** BRIEF.md, 35-cenarios-dourados-de-regressao-funcional.md, 40-roteiro-de-homologacao-executiva-por-dominio.md, 60-validacoes-testes-edge-cases-locais.md.

---

## Sumário

1. [Pirâmide de testes](#1-pirâmide-de-testes)
2. [Testes por módulo](#2-testes-por-módulo)
3. [Golden scenarios detalhados](#3-golden-scenarios-detalhados)
4. [Shadow mode do motor de folha](#4-shadow-mode-do-motor-de-folha)
5. [Dados de teste](#5-dados-de-teste)
6. [CI/CD — pipelines e gates](#6-cicd--pipelines-e-gates)
7. [Ambientes](#7-ambientes)
8. [Observabilidade de testes](#8-observabilidade-de-testes)
9. [Homologação por domínio](#9-homologação-por-domínio)
10. [Checklist de release](#10-checklist-de-release)
11. [Regressão legado → novo](#11-regressão-legado--novo)

---

## Decisões temporárias de gate (2026-04-26)

- Paridade de `sgp-admin`, rotas administrativas e fluxos OAuth/Cognito/Gov.br não bloqueia o pacote atual; esses itens são classificados como `ADMIN_INSTALL_LATER` ou `IDENTITY_INSTALL_LATER` nos artefatos de alinhamento.
- O gate `api:alignment:check` passa a validar também paridade de domínio, workflow e menu: todos os 11 domínios devem ter evidência backend corrente; os menus do portal devem estar cobertos; a árvore do admin é registrada como postergada.
- Em testes sem `S3_DOCUMENTS_BUCKET`/`S3_REGION`, o runtime pode usar MiniIO em Docker como substituto S3-compatible. Produção e homologação continuam exigindo S3 real.
- GitHub Actions passa a ter gate baseline da raiz do repositório com Node 24, npm, PostgreSQL 16, lint/format não mutantes, typecheck, alinhamento de rotas, alinhamento de banco, health JSON, testes, build e cobertura.
- Pact broker/provider, scanners, observabilidade produtiva e gates de release/homologação continuam postergados. Devem continuar documentados como alvo de release, mas não são bloqueadores de reavaliação do código atual.

---

## 1. Pirâmide de testes

### 1.1 Visão geral

```mermaid
graph TD
    A["🔼 Carga (k6)\n~10 cenários de pico"] --> B
    B["E2E Playwright\n~50 jornadas críticas"] --> C
    C["Cenários dourados A–G\nRegressão funcional"] --> D
    D["Contrato (Pact / JSON Schema)\nsgp-core-api ↔ workers"] --> E
    E["Integração Jest + Testcontainers\nPostgres 16 + LocalStack + MiniIO"] --> F
    F["Unit Jest\n≥ 85 % cobertura runtime global"]

    style A fill:#c0392b,color:#fff
    style B fill:#e67e22,color:#fff
    style C fill:#f39c12,color:#fff
    style D fill:#27ae60,color:#fff
    style E fill:#2980b9,color:#fff
    style F fill:#1abc9c,color:#fff
```

### 1.2 Unitários (Jest)

#### Cobertura alvo por módulo / app

| Módulo / pacote             | Cobertura mínima | Justificativa                                                              |
| --------------------------- | ---------------- | -------------------------------------------------------------------------- |
| `@sgp/payroll-engine`       | **≥ 85 %**       | Motor de cálculo com alto risco fiscal; fórmulas de verba em SQL compilado |
| `@sgp/previdenciario`       | **≥ 85 %**       | Regras de aposentadoria, simulação e SIPREV com impacto legal              |
| `@sgp/saude`                | **≥ 85 %**       | Lifecycle de perícia com exclusões mútuas e dias de afastamento acumulados |
| `@sgp/rh`                   | **≥ 85 %**       | Cadastro funcional, lifecycle do vínculo, posse, transferência             |
| `@sgp/folha`                | **≥ 85 %**       | Abertura/fechamento de competência, cálculo de lote, contracheque          |
| `@sgp/recrutamento`         | **≥ 85 %**       | Pipeline de requisição, ciclo de estágio                                   |
| `@sgp/gestao`               | **≥ 85 %**       | Parametrizações, feature flags                                             |
| `@sgp/auth`                 | **≥ 85 %**       | Tenant/RBAC guards atuais; OAuth/Cognito fica como alvo posterior          |
| `@sgp/integracoes`          | **≥ 85 %**       | Builders eSocial, SIPREV, DIRF, CNAB                                       |
| Demais módulos transversais | **≥ 85 %**       |                                                                            |

#### Configuração Jest

```jsonc
// jest.config.base.ts
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/main*.ts",
    "!src/**/*.controller.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.module.ts",
    "!src/config/environment.ts",
    "!src/common/pagination/paged-response.ts",
    "!src/common/errors/standard-exception.filter.ts",
  ],
  "coverageThreshold": {
    "global": { "lines": 85, "branches": 85, "functions": 85 },
  },
  "coverageReporters": ["lcov", "text-summary", "cobertura"],
}
```

No pacote backend, `npm run test:backend` permanece restrito aos specs unitários em `src/**/*.spec.ts`. O gate canônico de cobertura do workspace é `npm run test:coverage`; ele delega para o `test:cov` do backend, executa os specs unitários e e2e cobertos, aplica limiares globais de 85 % para linhas, branches e funções, e coleta cobertura de runtime em `src/**/*.ts`. DTOs, controllers, modules, bootstrap/config e artefatos de metadados Nest/Swagger ficam fora do gate global de branches porque são verificados por contrato/e2e e geram branches instrumentados sem decisão de negócio.

O enforcement corrente é orquestrado pelo `scripts/run.mjs` a partir da raiz do workspace. O script backend `test:cov` executa Jest, inclui specs unitários e e2e cobertos, aplica `coverageThreshold.global` de 85 % para `lines`, `branches` e `functions`, e gera `lcov`, `text-summary` e `cobertura`. Não há `jest.config.ts` raiz nem thresholds por `projects` no pacote atual; qualquer corte por módulo deve ser adicionado em decisão futura antes de ser tratado como gate.

O gate agregado corrente é `npm run evidence:check` no workspace root. Ele executa alinhamento de rotas, alinhamento de banco, health JSON, geração do cliente OpenAPI, build, lint, testes Angular admin/portal, testes unitários backend, e2e backend, smoke DB, cobertura backend e smoke QA. Os passos `backend-e2e`, `db-smoke` e `backend-coverage` exigem `DATABASE_URL`. O smoke QA exige URLs vivos e falha como evidência bloqueada quando as variáveis de base URL não estão configuradas. A ordem e os requisitos do gate vivem no registro compartilhado em `scripts/lib/`.

#### O que testar unitariamente

- Regras de negócio puras em services (validações, transições de estado, cálculos).
- DSL de fórmulas de verbas: compilação SQL → resultado numérico com casos de borda (faixa IRRF, consignado, décimo terceiro).
- Alíquotas INSS/IRRF para anos distintos (séries históricas de 2023 e 2025 já mapeadas no legado).
- Guards de autorização: `TenantGuard`, `PermissionsGuard`, `AuthGuard`.
- Fábricas de domínio, mapeadores DTO ↔ entidade.
- Jobs de cron (funções puras de verificação de data/situação).

### 1.3 Integração (Jest + Testcontainers + LocalStack + MiniIO)

#### Ferramentas

| Ferramenta                      | Versão alvo | Uso                                                                            |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `@testcontainers/postgresql`    | 10.x        | Banco PostgreSQL 16 isolado por suite                                          |
| `@testcontainers/localstack`    | 3.x         | SQS, SNS, EventBridge, Secrets Manager                                         |
| MiniIO em Docker                | RELEASE.x   | S3-compatible para documentos quando S3 real não estiver configurado em testes |
| `npm run db:migrate` (test env) | —           | SQL canônico v0.0.1 + seeds de catálogo                                        |
| `supertest`                     | 6.x         | Chamadas HTTP integradas ao NestJS test app                                    |
| `@nestjs/testing`               | LTS         | Módulo de teste do NestJS                                                      |

#### Escopo

- Fluxos de persistência com RLS ativa: verificar que `tenant_id` de outro tenant não vaza.
- Ciclos completos de folha: criar competência → criar folha → calcular → fechar; validar estado da base.
- Filas SQS: publicar evento `folha.calculo.solicitada`, consumir no worker e confirmar resultado no banco.
- Upload/download S3-compatible: `sgp-arquivos` contra S3 real configurado ou MiniIO em Docker nos testes locais/CI sem S3.
- Contagem de registros paginados com `pg_trgm`.
- Banco: rodar `npm run db:migrate` e validar schema esperado.

#### Padrão de setup

```typescript
// test/setup/testcontainer.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { LocalstackContainer } from '@testcontainers/localstack';

export async function setupTestInfra() {
  const pg = await new PostgreSqlContainer('postgres:16')
    .withDatabase('sgp_test')
    .withUsername('sgp')
    .withPassword('sgp')
    .start();

  const ls = await new LocalstackContainer('localstack/localstack:3')
    .withServices(['s3', 'sqs', 'sns', 'events', 'secretsmanager'])
    .start();

  return { pg, ls };
}
```

### 1.4 Contrato (Pact / JSON Schema)

#### Pares de contrato

| Consumer                 | Provider                  | Ferramenta                    | Eventos / endpoints                                             |
| ------------------------ | ------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `sgp-core-api`           | `sgp-payroll-engine`      | **Pact** (HTTP)               | `POST /v1/folha/calcular`, `POST /v1/folha/lote`                |
| `sgp-core-api`           | `sgp-esocial-worker`      | **Pact** (mensagem SNS)       | `esocial.evento.pendente` (S-2200, S-2299, S-2230)              |
| `sgp-core-api`           | `sgp-integrations-worker` | **Pact** (mensagem SQS)       | `remessa.gerar`, `retorno.processar`                            |
| `sgp-portal`             | `sgp-core-api`            | **JSON Schema**               | `/api/portal/v1/contracheque`, `/api/portal/v1/recadastramento` |
| API externa / prefeitura | `sgp-core-api`            | **OpenAPI 3.1 + JSON Schema** | `/api/external/v1/*`, `/publico/prefeitura/*`                   |

#### Pact Broker

- Instância self-hosted no ambiente `qa` (Docker `pactfoundation/pact-broker`).
- Contratos publicados no pipeline de PR; verificação do provider no pipeline de `develop`.
- Tag de versão segue `{app}@{git-sha}`.

#### Critério de quebra de contrato

Qualquer mudança em campo obrigatório, remoção de campo, alteração de tipo ou mudança em enum de evento bloqueia merge. Adição de campos opcionais é não-breaking.

### 1.5 E2E (Playwright)

#### Escopo de jornadas

| Jornada                                    | App                        | Prioridade |
| ------------------------------------------ | -------------------------- | ---------- |
| Login Cognito → seleção de tenant          | `sgp-admin`                | Postergado |
| Admissão completa de servidor              | `sgp-admin`                | P0         |
| Abertura de competência + cálculo de folha | `sgp-admin`                | P0         |
| Download de contracheque                   | `sgp-admin` + `sgp-portal` | P0         |
| Agendamento e atendimento pericial         | `sgp-admin`                | P0         |
| Recadastramento de aposentado              | `sgp-admin`                | P0         |
| Requisição de pessoal → nomeação           | `sgp-admin`                | P1         |
| Exportação SIPREV                          | `sgp-admin`                | P1         |
| eSocial: gerar e consultar evento stubado  | `sgp-admin`                | P1         |
| Portal: prova de vida via self-service     | `sgp-portal`               | P1         |
| Acessibilidade (Axe) em 10 telas-chave     | ambos                      | P1         |
| Responsividade mobile no portal            | `sgp-portal`               | P2         |

#### Configuração base

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['allure-playwright']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

#### Acessibilidade (Axe)

```typescript
import AxeBuilder from '@axe-core/playwright';

test('tela de contracheque não tem violações WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/contracheque/123');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toHaveLength(0);
});
```

Axe é executado em pelo menos 10 rotas: login, dashboard, contracheque, ficha funcional, folha, agendamento, recadastramento, requisição, relatório e portal.

#### Contratos operacionais base

Rota contratual: `GET /api/v1`

Rota contratual: `GET /api/v1/master-data`

Rota contratual: `GET /api/v1/master-data/{resource}`

Rota contratual: `POST /api/v1/master-data/{resource}`

Rota contratual: `PATCH /api/v1/master-data/{resource}/{id}`

Rota contratual: `DELETE /api/v1/master-data/{resource}/{id}`

Rota contratual: `GET /api/v1/rh/afastamentos`

Rota contratual: `POST /api/v1/rh/afastamentos`

Rota contratual: `PATCH /api/v1/rh/afastamentos/{id}`

Rota contratual: `DELETE /api/v1/rh/afastamentos/{id}`

Rota contratual: `GET /api/v1/rh/processos`

Rota contratual: `POST /api/v1/rh/processos`

Rota contratual: `PATCH /api/v1/rh/processos/{id}`

Rota contratual: `DELETE /api/v1/rh/processos/{id}`

Rota contratual: `GET /api/v1/rh/processos-funcao`

Rota contratual: `POST /api/v1/rh/processos-funcao`

Rota contratual: `PATCH /api/v1/rh/processos-funcao/{id}`

Rota contratual: `DELETE /api/v1/rh/processos-funcao/{id}`

Rota contratual: `GET /api/v1/employees/{employeeId}/rh-workflows/dependentes-beneficio`

Rota contratual: `POST /api/v1/employees/{employeeId}/rh-workflows/dependentes-beneficio`

Rota contratual: `PATCH /api/v1/employees/{employeeId}/rh-workflows/dependentes-beneficio/{id}`

Rota contratual: `DELETE /api/v1/employees/{employeeId}/rh-workflows/dependentes-beneficio/{id}`

Rota contratual: `GET /api/v1/employees/{employeeId}/rh-workflows/contribuicoes-sindicais`

Rota contratual: `POST /api/v1/employees/{employeeId}/rh-workflows/contribuicoes-sindicais`

Rota contratual: `PATCH /api/v1/employees/{employeeId}/rh-workflows/contribuicoes-sindicais/{id}`

Rota contratual: `DELETE /api/v1/employees/{employeeId}/rh-workflows/contribuicoes-sindicais/{id}`

Rota contratual: `GET /api/v1/employees/{employeeId}/rh-workflows/exercicios`

Rota contratual: `POST /api/v1/employees/{employeeId}/rh-workflows/exercicios`

Rota contratual: `PATCH /api/v1/employees/{employeeId}/rh-workflows/exercicios/{id}`

Rota contratual: `DELETE /api/v1/employees/{employeeId}/rh-workflows/exercicios/{id}`

Rota contratual: `GET /api/v1/employees/{employeeId}/rh-workflows/pensoes-alimenticias`

Rota contratual: `POST /api/v1/employees/{employeeId}/rh-workflows/pensoes-alimenticias`

Rota contratual: `PATCH /api/v1/employees/{employeeId}/rh-workflows/pensoes-alimenticias/{id}`

Rota contratual: `DELETE /api/v1/employees/{employeeId}/rh-workflows/pensoes-alimenticias/{id}`

Rota contratual: `GET /api/v1/employees/{employeeId}/rh-workflows/vales-transporte`

Rota contratual: `POST /api/v1/employees/{employeeId}/rh-workflows/vales-transporte`

Rota contratual: `PATCH /api/v1/employees/{employeeId}/rh-workflows/vales-transporte/{id}`

Rota contratual: `DELETE /api/v1/employees/{employeeId}/rh-workflows/vales-transporte/{id}`

Rota contratual: `GET /api/v1/folhas`

Rota contratual: `POST /api/v1/folhas`

Rota contratual: `PATCH /api/v1/folhas/{folha_id}/status`

Rota contratual: `POST /api/v1/folhas/{folha_id}/calcular`

Rota contratual: `POST /api/v1/folhas/{folha_id}/massa`

Rota contratual: `POST /api/v1/folhas/{folha_id}/adiantamentos`

Rota contratual: `GET /api/v1/folhas/catalogos`

Rota contratual: `GET /api/v1/folhas/catalogos/{resource}`

Rota contratual: `POST /api/v1/folhas/catalogos/{resource}`

Rota contratual: `PATCH /api/v1/folhas/catalogos/{resource}/{id}`

Rota contratual: `DELETE /api/v1/folhas/catalogos/{resource}/{id}`

Rota contratual: `GET /api/v1/folhas/contabilidade`

Rota contratual: `POST /api/v1/folhas/contabilidade`

Rota contratual: `PATCH /api/v1/folhas/contabilidade/{id}`

Rota contratual: `DELETE /api/v1/folhas/contabilidade/{id}`

Rota contratual: `GET /api/v1/folha/{id}/remessa`

Rota contratual: `POST /api/v1/folha/{id}/remessa`

Rota contratual: `POST /api/v1/folha/{id}/retorno`

Rota contratual: `POST /api/v1/gfip/gerar`

Rota contratual: `GET /api/v1/avaliacao/desempenhos`

Rota contratual: `POST /api/v1/avaliacao/desempenhos`

Rota contratual: `PATCH /api/v1/avaliacao/desempenhos/{id}`

Rota contratual: `GET /api/v1/avaliacao/progressoes`

Rota contratual: `POST /api/v1/avaliacao/progressoes`

Rota contratual: `GET /api/v1/avaliacao/simulacoes`

Rota contratual: `POST /api/v1/avaliacao/simulacoes`

Rota contratual: `GET /api/v1/avaliacao/planos-cargos`

Rota contratual: `POST /api/v1/avaliacao/planos-cargos`

Rota contratual: `PATCH /api/v1/avaliacao/planos-cargos/{id}`

Rota contratual: `POST /api/v1/avaliacao/desempenhos/{id}/ficha`

Rota contratual: `POST /api/v1/avaliacao/ciclos/{periodo}/relatorio`

Rota contratual: `GET /api/v1/consultas/ficha-financeira`

Rota contratual: `GET /api/v1/consultas/ficha-funcional`

Rota contratual: `GET /api/v1/consultas/relatorios-situacao`

Rota contratual: `GET /api/v1/consultas/pagamentos-bloqueados`

Rota contratual: `GET /api/v1/consultas/historico-operacional`

Rota contratual: `GET /api/v1/consultas/dashboards`

Rota contratual: `GET /api/v1/previdenciario/regras`

Rota contratual: `POST /api/v1/previdenciario/regras`

Rota contratual: `PATCH /api/v1/previdenciario/regras/{id}`

Rota contratual: `GET /api/v1/previdenciario/simulacoes`

Rota contratual: `POST /api/v1/previdenciario/simulacoes`

Rota contratual: `GET /api/v1/previdenciario/aposentadorias`

Rota contratual: `POST /api/v1/previdenciario/aposentadorias`

Rota contratual: `GET /api/v1/previdenciario/pensoes`

Rota contratual: `POST /api/v1/previdenciario/pensoes`

Rota contratual: `GET /api/v1/previdenciario/certidoes-tempo`

Rota contratual: `POST /api/v1/previdenciario/certidoes-tempo`

Rota contratual: `POST /api/v1/previdenciario/certidoes-tempo/{id}/emitir`

Rota contratual: `GET /api/v1/previdenciario/declaracoes`

Rota contratual: `POST /api/v1/previdenciario/declaracoes`

Rota contratual: `POST /api/v1/previdenciario/declaracoes/{id}/emitir`

Rota contratual: `GET /api/v1/previdenciario/compensacoes`

Rota contratual: `POST /api/v1/previdenciario/compensacoes`

Rota contratual: `PATCH /api/v1/previdenciario/compensacoes/{id}`

Rota contratual: `GET /api/v1/previdenciario/recadastramentos/campanhas`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/campanhas`

Rota contratual: `GET /api/v1/previdenciario/recadastramentos/beneficiarios`

Rota contratual: `GET /api/v1/previdenciario/recadastramentos/pendencias`

Rota contratual: `GET /api/v1/previdenciario/recadastramentos/historico`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/beneficiarios`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/atos`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/historico`

Rota contratual: `POST /api/v1/previdenciario/provas-vida`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/convocacoes`

Rota contratual: `POST /api/v1/previdenciario/recadastramentos/relatorios`

Rota contratual: `POST /api/v1/previdenciario/transferencia-siprev/exportar`

### 1.6 Golden Scenarios (regressão funcional)

Os cenários A–G (ver §3) são executados como suíte separada no Playwright + scripts SQL de setup, rotulados com `@golden`. Rodam nocturnamente no ambiente `homologacao` contra dados sanitizados do legado. Cada cenário produz evidência em Allure (screenshot, PDF comparado, diff JSONB).

### 1.7 Carga (k6)

#### Cenários de carga

| Cenário                                   | VUs | Duração | Meta (p95)            | Limiar de erro |
| ----------------------------------------- | --- | ------- | --------------------- | -------------- |
| Fechamento de folha: cálculo de lote      | 50  | 10 min  | < 8 s por lote de 200 | < 0,5 %        |
| Envio eSocial em massa (S-2200 × 500)     | 100 | 15 min  | < 3 s por evento      | < 0,1 %        |
| Consulta de contracheque individual       | 200 | 5 min   | < 800 ms              | < 0,1 %        |
| Geração de PDF contracheque em massa      | 30  | 10 min  | < 5 s por PDF         | < 1 %          |
| Listagem paginada de servidores (pg_trgm) | 150 | 5 min   | < 500 ms              | < 0,1 %        |
| Login + autorização Cognito               | 100 | 5 min   | < 1 s                 | Postergado     |

```javascript
// k6/scenarios/folha-calculo.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    folha_lote: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '6m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<8000'],
        http_req_failed: ['rate<0.005'],
      },
    },
  },
};

export default function () {
  const res = http.post(
    `${__ENV.BASE_URL}/api/v1/folha/lote`,
    JSON.stringify({
      competenciaId: __ENV.COMPETENCIA_ID,
      filiais: ['filial-uuid-1'],
      tipoProcessamento: 'MENSAL',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.TOKEN}`,
      },
    },
  );
  check(res, { 'status 202': (r) => r.status === 202 });
  sleep(1);
}
```

### 1.8 Segurança

| Ferramenta                                             | Escopo                            | Frequência                      |
| ------------------------------------------------------ | --------------------------------- | ------------------------------- |
| **OWASP ZAP** (baseline + active scan)                 | APIs HTTP públicas e autenticadas | A cada deploy em `homologacao`  |
| `nest-security` (helmet, rate-limit, CORS, CSRF guard) | Configuração do NestJS            | Revisado em cada PR             |
| `eslint-plugin-security`                               | Análise estática TypeScript       | Cada PR (lint stage)            |
| `npm audit` / `pnpm audit`                             | Dependências com CVE              | Cada PR + semanalmente          |
| `trivy` (imagens Docker)                               | Imagens de container ECS/Fargate  | Cada build de imagem            |
| Revisão manual de RLS                                  | Queries Prisma com `tenant_id`    | A cada PR que toca repositórios |
| Revisão de Cognito scopes                              | Claims JWT e client credentials   | Na entrega de cada módulo       |

#### Gate de segurança

- Vulnerabilidade **CRÍTICA** ou **ALTA** no ZAP → bloqueia deploy em `staging`.
- CVE com score ≥ 7 em dependências → bloqueia merge se pacote em runtime.
- Falha de `eslint-plugin-security` regra `no-eval`, `detect-object-injection`, `detect-non-literal-regexp` → bloqueia PR.

### 1.9 Acessibilidade (Axe)

- Zero violações WCAG 2.1 nível AA nas 10 telas-chave (ver §1.5) para ir a staging.
- Relatório Axe exportado como artefato Allure.
- Revisão manual de leitores de tela (NVDA/VoiceOver) para contracheque e formulário de recadastramento antes de cada release.

---

## 2. Testes por módulo

### Legenda

| Símbolo | Significado                        |
| ------- | ---------------------------------- |
| U       | Unit (Jest)                        |
| I       | Integração (Jest + Testcontainers) |
| C       | Contrato (Pact / JSON Schema)      |
| E       | E2E (Playwright)                   |
| G       | Golden scenario                    |
| K       | Carga (k6)                         |

### 2.1 Matriz de tipos de teste por módulo

| Módulo                 | U              | I                  | C               | E              | G          | K          | Ferramenta / observação especial                                |
| ---------------------- | -------------- | ------------------ | --------------- | -------------- | ---------- | ---------- | --------------------------------------------------------------- |
| `@sgp/payroll-engine`  | ✅ ≥85%        | ✅ PostgreSQL real | ✅ Pact HTTP    | ✅ 3 jornadas  | ✅ B, F    | ✅ Sim     | Testes de fórmula SQL por verba; série histórica IRRF/INSS      |
| `@sgp/folha`           | ✅ ≥85%        | ✅                 | —               | ✅             | ✅ B, F    | ✅ Sim     | Lifecycle competência; lote; remessa CNAB                       |
| `@sgp/previdenciario`  | ✅ ≥85%        | ✅                 | —               | ✅             | ✅ D       | —          | Simulação aposentadoria; SIPREV XML schema                      |
| `@sgp/saude`           | ✅ ≥85%        | ✅                 | —               | ✅             | ✅ F       | —          | Transições de status pericial; réplica multi-matrícula          |
| `@sgp/rh`              | ✅ ≥85%        | ✅                 | —               | ✅             | ✅ A       | —          | Lifecycle vínculo; CPF único; matrícula automática              |
| `@sgp/recrutamento`    | ✅ ≥85%        | ✅                 | —               | ✅             | ✅ G       | —          | Pipeline requisição; ciclo estágio                              |
| `@sgp/gestao`          | ✅ ≥85%        | ✅                 | —               | ✅             | —          | —          | ParametroSistema; feature flags; i18n                           |
| `@sgp/auth`            | ✅ ≥85%        | ✅                 | C JWT           | ✅ G           | ✅ G       | —          | Guards; RBAC; multi-tenant isolation                            |
| `@sgp/integracoes`     | ✅ ≥85%        | ✅ LocalStack      | ✅ Pact SNS/SQS | ✅             | ✅ F       | ✅ eSocial | eSocial XML, SIPREV, DIRF, CNAB, Neoconsig                      |
| `@sgp/pessoa`          | ✅ ≥85%        | ✅                 | —               | —              | ✅ A       | —          | CPF/PIS único; documentos                                       |
| `@sgp/arquivos`        | ✅ ≥85%        | ✅ MiniIO / S3     | —               | —              | —          | —          | Presigned URL; validação de formato; path safety                |
| `@sgp/notificacoes`    | ✅ ≥85%        | ✅ LocalStack SNS  | —               | —              | —          | —          | E-mail, push, in-app                                            |
| `@sgp/convenio`        | ✅ ≥85%        | ✅                 | —               | —              | —          | —          | Desconto em folha; vigência                                     |
| `@sgp/auditoria`       | ✅ ≥85%        | ✅                 | —               | —              | —          | —          | diff JSONB; partição por mês                                    |
| `sgp-admin` (Angular)  | Postergado     | —                  | Postergado      | Postergado     | Postergado | —          | `ADMIN_INSTALL_LATER`; árvore admin não bloqueia o pacote atual |
| `sgp-portal` (Angular) | ✅ Jest (unit) | —                  | C JSON Schema   | ✅ 10 jornadas | ✅ C, F    | —          | Playwright + Axe; Gov.br mock                                   |

### 2.2 Métricas de qualidade de pipeline por módulo

| Módulo                | Tempo máximo de unit suite | Tempo máximo de integração suite | Flakiness alvo |
| --------------------- | -------------------------- | -------------------------------- | -------------- |
| `@sgp/payroll-engine` | 3 min                      | 8 min                            | < 0,5 %        |
| `@sgp/folha`          | 2 min                      | 8 min                            | < 0,5 %        |
| Demais backends       | 2 min                      | 5 min                            | < 1 %          |
| `sgp-admin` E2E       | —                          | 20 min (nightly)                 | < 2 %          |
| `sgp-portal` E2E      | —                          | 10 min (nightly)                 | < 2 %          |

---

## 3. Golden scenarios detalhados

> Os cenários abaixo expandem os grupos A–G do BRIEF §10 e do documento `35-cenarios-dourados-de-regressao-funcional.md` em roteiros passo-a-passo com payloads reais, asserts precisos e procedimentos de cleanup.

### Convenções

- `T1` = tenant de teste (`tenant_id: "00000000-0000-0000-0000-000000000001"`).
- UUIDs ilustrativos terminados em `…-0001`, `…-0002` etc.
- Tolerâncias monetárias: diferença absoluta ≤ R$ 0,02 por lançamento (arredondamento ABNT).
- Todos os cenários devem ser precedidos pelo seed de catálogos mínimos (ver §5.3).

---

### Cenário A — Admissão → primeira folha → contracheque

**Identificador:** GS-A | **Módulos:** `@sgp/rh`, `@sgp/folha`, `@sgp/payroll-engine`

#### A.0 Pré-condição

| Dado                   | Valor                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Tenant                 | T1                                                                                 |
| `matricula_automatica` | `true`, formato `######`, prefixo vazio                                            |
| Cargo                  | `cargo_id: "cargo-0001"`, código `ANA001`, denominação "Analista Administrativo"   |
| Vínculo tipo           | `EFETIVO`                                                                          |
| Tipo de folha          | `tipo_folha_id: "tpf-0001"` → `MENSAL`                                             |
| Verba salário base     | `verba_id: "vrb-0001"`, código `001`, tipo `PROVENTO`, recorrência `MENSAL`        |
| Verba INSS             | `verba_id: "vrb-inss"`, tipo `DESCONTO`                                            |
| Verba IRRF             | `verba_id: "vrb-irrf"`, tipo `DESCONTO`                                            |
| Alíquota INSS 2026     | tabela progressiva carregada via seed                                              |
| Filial                 | `filial_id: "filial-0001"`                                                         |
| Competência            | `2026-04` (mês atual do cenário)                                                   |
| Usuário executor       | `usuario_id: "usr-rh-0001"`, papel `ROLE_RH_CADASTRAR`, `ROLE_FOLHA_DE_PGT.GESTAO` |

#### A.1 Etapa 1 — Cadastro da pessoa e vínculo

**Passo 1.1 — Criar pessoa**

```http
POST /api/v1/pessoas
Authorization: Bearer {jwt_T1}
Content-Type: application/json

{
  "cpf": "012.345.678-90",
  "nome": "Maria da Silva Santos",
  "dataNascimento": "1985-03-15",
  "sexo": "F",
  "estadoCivil": "SOLTEIRO",
  "racaCor": "PARDA",
  "grauInstrucao": "SUPERIOR_COMPLETO",
  "filiacaoMae": "Ana Santos",
  "nacionalidade": "BRASILEIRO"
}
```

**Assert 1.1:**

- HTTP 201.
- `pessoa.cpf` normalizado (`01234567890`).
- `pessoa.tenantId === T1`.

**Passo 1.2 — Criar vínculo/funcionário**

```http
POST /api/v1/funcionarios
Authorization: Bearer {jwt_T1}

{
  "pessoaId": "{pessoa_id}",
  "filialId": "filial-0001",
  "cargoId": "cargo-0001",
  "vinculoTipo": "EFETIVO",
  "tipoIngresso": "CONCURSO_PUBLICO",
  "tipoFolhaId": "tpf-0001",
  "cargaHoraria": 40,
  "turnoId": "turno-0001",
  "bancoId": "banco-0001",
  "agencia": "0001",
  "conta": "123456-7",
  "tipoContaBanco": "CORRENTE"
}
```

**Assert 1.2:**

- HTTP 201.
- `funcionario.matricula` gerado automaticamente (6 dígitos, sequencial).
- `funcionario.situacaoFuncional` = `CADASTRO_BASE`.
- `audit_log` contém `{ acao: "CREATE", dominio: "rh", entidade: "funcionario" }`.

#### A.2 Etapa 2 — Posse efetiva

**Passo 2.1 — Registrar posse**

```http
POST /api/v1/funcionarios/{funcionario_id}/posse
Authorization: Bearer {jwt_T1}

{
  "dataPosse": "2026-04-01",
  "dataExercicio": "2026-04-01",
  "nivelSalarialId": "ns-0001",
  "referenciaSalarialId": "ref-0001",
  "opcaoRemuneracao": "REGIME_PROPRIO",
  "bensDeclarados": false
}
```

**Assert 2.1:**

- HTTP 200.
- `funcionario.situacaoFuncional` = `ATIVO`.
- `historico_situacao` contém registro com `tipo = ATIVO`, `dataInicio = 2026-04-01`.
- `posse.dataPosse = 2026-04-01`.

**Passo 2.2 — Registrar verba individual**

```http
POST /api/v1/funcionarios/{funcionario_id}/verbas
Authorization: Bearer {jwt_T1}

{
  "verbaId": "vrb-0001",
  "tipoValor": "FIXO",
  "valor": 5800.00,
  "recorrencia": "MENSAL",
  "tipoFolhaId": "tpf-0001",
  "competenciaInicialMes": 4,
  "competenciaInicialAno": 2026
}
```

**Assert 2.2:**

- HTTP 201.
- `funcionario_verba.valor === 5800.00`.
- `funcionario_verba.parcelasTotais === null` (recorrente).

#### A.3 Etapa 3 — Primeira folha

**Passo 3.1 — Abrir competência**

```http
POST /api/v1/competencias
Authorization: Bearer {jwt_T1}

{ "mes": 4, "ano": 2026 }
```

**Assert 3.1:** `competencia.estado === "ABERTA"`.

**Passo 3.2 — Criar folha**

```http
POST /api/v1/folhas
Authorization: Bearer {jwt_T1}

{
  "competenciaId": "{competencia_id}",
  "filialId": "filial-0001",
  "tipoProcessamentoId": "{tp_mensal_id}",
  "periodoInicial": "2026-04-01",
  "periodoFinal": "2026-04-30"
}
```

**Assert 3.2:**

- `folha.status === "DESBLOQUEADO"`.
- `folha.situacao === "PENDENTE"`.

**Passo 3.3 — Incluir servidor na massa**

```http
POST /api/v1/folhas/{folha_id}/massa
Authorization: Bearer {jwt_T1}

{ "replaceCalculatedItems": true }
```

**Passo 3.4 — Calcular lote**

```http
POST /api/v1/folhas/{folha_id}/calcular
Authorization: Bearer {jwt_T1}

{ "modo": "TOTAL" }
```

**Assert 3.4 (polling até `situacao === "CALCULADO"`):**

- `folha.situacao === "CALCULADO"` em até 30 s.
- Contracheque criado com `situacao = "CONCLUIDO"`.

**Passo 3.5 — Verificar contracheque**

```http
GET /api/v1/contracheques/{contracheque_id}
```

**Assert 3.5 (valores com tolerância ≤ R$ 0,02):**

| Lançamento              | Valor esperado                                                             | Observação                     |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------ |
| Salário base (vrb-0001) | R$ 5.800,00                                                                | 30 dias corridos em abril      |
| INSS faixa 1 (7,5 %)    | R$ 435,00                                                                  | sobre R$ 5.800,00, tabela 2026 |
| Base IRRF               | R$ 5.365,00                                                                | salário − INSS                 |
| IRRF calculado          | conforme tabela 2026                                                       | deducao de dependentes = 0     |
| Líquido                 | salário − INSS − IRRF                                                      |                                |
| `memoria_calculo` JSONB | não-nulo, contém `{"verba":"vrb-0001","formula":"...","resultado":5800.0}` |                                |

**Passo 3.6 — Download PDF contracheque**

```http
GET /api/v1/contracheques/{contracheque_id}/pdf
```

**Assert 3.6:**

- HTTP 200, `Content-Type: application/pdf`.
- Tamanho > 5 KB.
- Sem marca d'água (competência não fechada; parametrizar `marca_dagua_flag = false` em teste).

#### A.4 Etapa 4 — Fechamento de competência

**Passo 4.1 — Fechar competência**

```http
POST /api/v1/competencias/{competencia_id}/fechar
Authorization: Bearer {jwt_T1}
```

**Assert 4.1:**

- `competencia.estado === "FECHADA"`.
- `folha.status === "BLOQUEADO"`.
- Nova tentativa de inclusão na massa retorna HTTP 422 com `"status": "BLOQUEADO"`.

#### A.5 Cleanup

```sql
-- Executar no schema do T1
DELETE FROM lancamento WHERE contracheque_id = '{contracheque_id}';
DELETE FROM contracheque WHERE id = '{contracheque_id}';
DELETE FROM folha_pagamento WHERE id = '{folha_id}';
UPDATE competencia SET estado = 'ABERTA' WHERE id = '{competencia_id}';
DELETE FROM funcionario_verba WHERE funcionario_id = '{funcionario_id}';
DELETE FROM posse WHERE funcionario_id = '{funcionario_id}';
DELETE FROM funcionario WHERE id = '{funcionario_id}';
DELETE FROM pessoa WHERE id = '{pessoa_id}';
```

---

### Cenário B — Fechamento de competência + reprocessamento retroativo

**Identificador:** GS-B | **Módulos:** `@sgp/folha`, `@sgp/payroll-engine`

#### B.0 Pré-condição

- Competência `2026-03` já FECHADA com 3 servidores calculados (criados via factory `FolhaFactory.competenciaFechada`).
- Um dos servidores (`funcionario_id: "func-retroativo"`) tinha verba errada (`vrb-0002`, valor R$ 1.000,00 a mais por engano).

#### B.1 Reabrir competência anterior

```http
POST /api/v1/competencias/{competencia_2026_03_id}/reabrir
Authorization: Bearer {jwt_T1}

{ "justificativa": "Correção de verba retroativa — processo n. 001/2026" }
```

**Assert:**

- `competencia.estado === "ABERTA"`.
- `folha.status === "DESBLOQUEADO"`.
- `audit_log` registra `{ acao: "UPDATE", diff: { estado: ["FECHADA","ABERTA"] } }`.

#### B.2 Corrigir lançamento manual

```http
DELETE /api/v1/funcionarios/{func_retroativo}/verbas/{funcionario_verba_id}
```

```http
POST /api/v1/funcionarios/{func_retroativo}/verbas
{ "verbaId": "vrb-0002", "valor": 0.00, "recorrencia": "UNICA", ... }
```

#### B.3 Reprocessar seletivamente

```http
POST /api/v1/folhas/{folha_id}/calcular
{ "modo": "SELETIVO", "funcionarioIds": ["{func_retroativo}"] }
```

**Assert:**

- Apenas contracheque de `func_retroativo` tem `situacao = "CONCLUIDO"` atualizado.
- Os outros 2 contracheques permanecem inalterados (`updated_at` não muda).
- Diferença de líquido ≤ R$ 0,02 em relação ao valor esperado (R$ 1.000,00 a menos).

#### B.4 Refechamento

```http
POST /api/v1/competencias/{competencia_2026_03_id}/fechar
```

**Assert:** `competencia.estado === "FECHADA"` novamente.

#### B.5 Cleanup

Restaurar fixtures da competência 2026-03 a partir do snapshot pré-teste.

---

### Cenário C — Rescisão + pagamento de verbas rescisórias + S-2299

**Identificador:** GS-C | **Módulos:** `@sgp/rh`, `@sgp/folha`, `@sgp/integracoes` (eSocial)

#### C.0 Pré-condição

- Servidor `func-rescisao` ATIVO, admitido em `2024-01-01`, 30 meses de serviço.
- Feature flag `esocial.enabled = true`.
- Provedor eSocial stub/sandbox configurado no tenant T1; certificado digital real fica fora do gate atual.
- Motivo rescisão: `PEDIDO_EXONERACAO`.
- Verbas rescisórias configuradas: saldo salário, férias proporcionais + 1/3, 13º proporcional.

#### C.1 Registrar desligamento

Rota contratual: `POST /api/v1/funcionarios/{func_rescisao}/desligamento`

```http
POST /api/v1/funcionarios/{func_rescisao}/desligamento
{
  "dataDesligamento": "2026-04-15",
  "motivoDesligamentoId": "{motivo_exoneracao_id}",
  "justificativa": "Pedido voluntário — protocolo n. 002/2026",
  "gerarFolhaRescisao": true
}
```

**Assert:**

- `funcionario.situacaoFuncional === "DESLIGAMENTO"`.
- Folha de tipo `RESCISAO` criada automaticamente para `filial-0001`, competência `2026-04`.

#### C.2 Calcular folha de rescisão

Rota contratual: `POST /api/v1/folhas/{folha_rescisao_id}/calcular`

```http
POST /api/v1/folhas/{folha_rescisao_id}/calcular
{ "modo": "TOTAL" }
```

**Assert (valores com tolerância R$ 0,02):**

| Verba                | Cálculo esperado                        |
| -------------------- | --------------------------------------- |
| Saldo salário        | (5.800,00 / 30) × 15 dias = R$ 2.900,00 |
| Férias proporcionais | (5.800,00 / 12) × meses_proporcional    |
| 1/3 férias           | férias_prop / 3                         |
| 13º proporcional     | (5.800,00 / 12) × meses_proporcional    |
| FGTS (se aplicável)  | 8 % do bruto rescisório                 |

#### C.3 Gerar evento eSocial S-2299

Rota contratual: `POST /api/v1/esocial/eventos`

```http
POST /api/v1/esocial/eventos
{
  "tipo": "S-2299",
  "referencia": "funcionario/{func_rescisao}",
  "competencia": "2026-04"
}
```

**Assert:**

- Evento `S-2299` gerado com status `PENDENTE_ENVIO`.
- XML validado contra schema XSD oficial S-1.2.
- Evento publicado em fila `esocial.evento.pendente` (SQS LocalStack verificado).
- Após processamento do worker stubado: status `STUBBED`/`AGUARDANDO_RETORNO` sem transmissão externa real.
- `audit_log` registra geração do evento.

#### C.4 Cleanup

Desfazer desligamento (reativar funcionário via script SQL); deletar folha de rescisão; deletar evento eSocial.

---

### Cenário D — Concessão de aposentadoria (simulação → efetivação → SIPREV)

**Identificador:** GS-D | **Módulos:** `@sgp/previdenciario`, `@sgp/integracoes`

#### D.0 Pré-condição

| Dado                | Valor                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Servidor            | `func-aposent`, ATIVO, 35 anos de contribuição, 65 anos de idade        |
| Regra aposentadoria | `regra_id: "regra-vol-integral"`, critério: 35 anos contrib. OU 65 anos |
| Tipo benefício      | `APOSENTADORIA_VOLUNTARIA_INTEGRAL`                                     |
| SIPREV habilitado   | `true` em `ParametroGlobal`                                             |

#### D.1 Simulação

```http
POST /api/v1/previdenciario/simulacoes
{
  "funcionarioId": "{func_aposent}",
  "regraId": "regra-vol-integral",
  "dataReferencia": "2026-04-21"
}
```

**Assert:**

- `simulacao.elegivel === true`.
- `simulacao.resultado.tempoContribuicao >= 35` anos.
- `simulacao.resultado.proventoEstimado > 0`.
- `simulacao.detalheJson` contém lista de critérios atendidos.

#### D.2 Efetivação da aposentadoria

```http
POST /api/v1/previdenciario/aposentadorias
{
  "funcionarioId": "{func_aposent}",
  "regraId": "regra-vol-integral",
  "dataConcessao": "2026-05-01",
  "fundamento": "Art. 3º Lei n. 9.717/1998",
  "atoNomeacao": "Portaria n. 001/2026"
}
```

**Assert:**

- `aposentadoria.status === "CONCEDIDA"`.
- `funcionario.situacaoFuncional === "DESLIGAMENTO"` (motivo aposentadoria).
- Pensionista/aposentado criado em `beneficiario_recadastramento` com status `NAO_RECADASTRADO`.
- Próxima data de recadastramento = `dataConcessao + 6 meses`.

#### D.3 Exportação SIPREV

```http
POST /api/v1/integracoes/siprev/exportar
{
  "competencia": "2026-05",
  "incluirAposentados": true
}
```

**Assert:**

- HTTP 200, `Content-Type: application/xml` ou resposta com `s3_key`.
- XML válido conforme schema SIPREV vigente.
- `aposentadoria` de `func_aposent` aparece no XML com `cpf`, `nome`, `dataConcessao`, `valorProvento`.
- Arquivo salvo em `s3://{tenant}/outputs/previdenciario/2026/05/siprev-{id}.xml`.

#### D.4 Cleanup

```sql
DELETE FROM aposentadoria WHERE funcionario_id = '{func_aposent}';
UPDATE funcionario SET situacao_funcional = 'ATIVO' WHERE id = '{func_aposent}';
DELETE FROM simulacao_aposentadoria WHERE funcionario_id = '{func_aposent}';
DELETE FROM beneficiario_recadastramento WHERE pessoa_id = (SELECT pessoa_id FROM funcionario WHERE id = '{func_aposent}');
```

---

### Cenário E — Recadastramento anual (convocação → atendimento → validação)

**Identificador:** GS-E | **Módulos:** `@sgp/previdenciario`

#### E.0 Pré-condição

| Dado             | Valor                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Aposentado       | `pessoa_id: "pessoa-recad"`, status `NAO_RECADASTRADO`, vencimento `2026-04-01`          |
| Campanha ativa   | `campanha_id: "camp-aposent-2026"`, tipo `APOSENTADO`, ciclo `2026-01-01` a `2026-12-31` |
| Usuário operador | `usr-previd-0001`, papel `ROLE_RECADASTRAMENTO.GESTAO`                                   |

#### E.1 Verificar beneficiário vencido

```http
GET /api/v1/recadastramento/beneficiarios?status=NAO_RECADASTRADO&tipo=APOSENTADO
```

**Assert:**

- `pessoa-recad` aparece na lista.
- `proximaData <= 2026-04-21` (vencido).

#### E.2 Iniciar atendimento presencial

```http
POST /api/v1/recadastramento/atendimentos
{
  "beneficiarioId": "pessoa-recad",
  "campanhaId": "camp-aposent-2026",
  "dataAtendimento": "2026-04-21",
  "operadorId": "usr-previd-0001",
  "dadosAtualizados": {
    "endereco": { "cep": "01001-000", "logradouro": "Praça da Sé", "numero": "1", "bairro": "Sé", "uf": "SP", "municipioId": "3550308" },
    "telefone": "(11) 99999-0001",
    "estadoCivil": "VIUVO"
  },
  "comprovantesAnexos": [{ "tipo": "IDENTIDADE", "s3Key": "test/comprovante-id.pdf" }]
}
```

**Assert:**

- HTTP 200.
- `recadastramento.status === "RECADASTRADO"`.
- `beneficiario_recadastramento.status === "RECADASTRADO"`.
- `proximaData === dataAtendimento + 1 ano` (aposentado = anual).
- `pessoa.endereco` atualizado com o novo CEP.
- Comprovante disponível: `GET /api/v1/recadastramento/{recadastramento_id}/comprovante` → HTTP 200 PDF.

#### E.3 Pensionista universitário — alerta de 25 anos

**Pré-condição extra:** beneficiário pensionista `pessoa-pens-univ`, 24 anos 11 meses.

```http
GET /api/v1/recadastramento/beneficiarios/{pessoa_pens_univ}/alertas
```

**Assert:**

- Alerta `PROX_25_ANOS` presente com `diasRestantes <= 31`.
- Status não bloqueado (configurável `alertaBloqueante = false`).

#### E.4 Diligência por telefone

```http
POST /api/v1/recadastramento/beneficiarios/{pessoa_recad}/ligacoes
{
  "data": "2026-04-21T14:30:00-03:00",
  "usuarioId": "usr-previd-0001",
  "observacao": "Beneficiário atendeu. Informado prazo de comparecimento até 30/04."
}
```

**Assert:**

- `historico_ligacao` criado.
- Tentativa sem `observacao` retorna HTTP 422.

#### E.5 Cleanup

```sql
UPDATE beneficiario_recadastramento SET status = 'NAO_RECADASTRADO', proxima_data = '2026-04-01'
  WHERE pessoa_id = 'pessoa-recad';
DELETE FROM recadastramento WHERE beneficiario_id = 'pessoa-recad' AND data = '2026-04-21';
DELETE FROM historico_ligacao WHERE beneficiario_id = 'pessoa-recad' AND data::date = '2026-04-21';
```

---

### Cenário F — Perícia (agendamento → atendimento → laudo → licença → S-2230)

**Identificador:** GS-F | **Módulos:** `@sgp/saude`, `@sgp/integracoes` (eSocial S-2230)

#### F.0 Pré-condição

| Dado               | Valor                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Servidor           | `func-pericia`, ATIVO, sem afastamento em curso                       |
| Médico             | `medico_id: "med-0001"`, CRM 12345/SP, especialidade `CLINICA_MEDICA` |
| Agenda             | slot disponível `2026-04-22 09:00`                                    |
| CID principal      | `J06.0` — Laringite aguda                                             |
| Motivo afastamento | `DOENCA_PROPRIO`                                                      |
| `esocial.enabled`  | `true`                                                                |

#### F.1 Agendar perícia

Rota contratual: `POST /api/v1/pericia/agendamentos`

```http
POST /api/v1/pericia/agendamentos
{
  "funcionarioId": "{func_pericia}",
  "especialidadeId": "esp-clinica-medica",
  "agendaId": "agenda-med-0001",
  "janelaId": "janela-20260422-0900",
  "data": "2026-04-22",
  "hora": "09:00",
  "telefoneContato": "(11) 99000-0001",
  "anexoInstrutor": { "s3Key": "test/atestado.pdf", "tipo": "ATESTADO" }
}
```

**Assert:**

- HTTP 201.
- `agendamento.status === "AGENDADO"`.
- Slot `janela-20260422-0900` marcado como ocupado.
- Tentativa de novo agendamento no mesmo slot retorna HTTP 409.

**Pré-condição negativa:** Tentativa de agendar `func-pericia` em situação `AFASTAMENTO` retorna HTTP 422 com mensagem "Funcionário não se encontra em exercício".

#### F.2 Registrar comparecimento

Rota contratual: `PATCH /api/v1/pericia/agendamentos/{agendamento_id}`

```http
PATCH /api/v1/pericia/agendamentos/{agendamento_id}
{ "status": "COMPARECEU" }
```

#### F.3 Registrar atendimento e emitir laudo

Rota contratual: `POST /api/v1/pericia/prontuarios`

```http
POST /api/v1/pericia/prontuarios
{
  "agendamentoId": "{agendamento_id}",
  "medicoId": "med-0001",
  "motivo": "Quadro de infecção das vias aéreas superiores com afastamento necessário.",
  "hda": "Tosse produtiva há 5 dias, febre 38,5°C, disfonia.",
  "exameFisico": "Orofaringe hiperemiada, gânglios cervicais palpáveis.",
  "diagnostico": "Laringite aguda — CID J06.0",
  "acaoPericial": "RETORNO",
  "tipoLaudo": "AFASTAMENTO",
  "situacaoLaudo": "PENDENTE_ENVIO",
  "cidPrincipalId": "cid-J060",
  "equipeMultiprofissional": [{ "profissionalId": "prof-0001", "papel": "MEDICO_PERITO" }],
  "licenca": {
    "tipoAvaliacao": "PERICIA_MEDICA",
    "beneficioPrevidenciario": null,
    "motivoAfastamentoId": "{motivo_doenca_proprio_id}",
    "cidId": "cid-J060",
    "diasConcedidos": 15,
    "dataInicio": "2026-04-22",
    "dataFim": "2026-05-06"
  }
}
```

**Assert:**

- `prontuario.situacaoLaudo === "PENDENTE_ENVIO"`.
- `licenca_medica` criada com `diasConcedidos = 15`.
- `funcionario.situacaoFuncional === "AFASTAMENTO"` (efeito administrativo).
- Tentativa de agendar outra perícia enquanto em afastamento retorna HTTP 422.

#### F.4 Validar laudo

Rota contratual: `PATCH /api/v1/pericia/prontuarios/{prontuario_id}/validar`

```http
PATCH /api/v1/pericia/prontuarios/{prontuario_id}/validar
{
  "decisao": "APROVAR",
  "coordenadorId": "usr-coord-saude"
}
```

**Assert:**

- `prontuario.situacaoLaudo === "APROVADO"`.
- PDF do laudo disponível em `GET /api/v1/pericia/prontuarios/{id}/laudo/pdf`.

#### F.5 Gerar evento S-2230

Rota contratual: `POST /api/v1/esocial/eventos`

```http
POST /api/v1/esocial/eventos
{
  "tipo": "S-2230",
  "referencia": "licenca_medica/{licenca_id}",
  "competencia": "2026-04"
}
```

**Assert:**

- XML `S-2230` válido contra XSD.
- Campo `<motDesafc>` = código do motivo de afastamento mapeado.
- Campo `<dtIniAfast>` = `2026-04-22`.
- Evento publicado em SQS e processado pelo worker.

#### F.6 Réplica multi-matrícula

Rota contratual: `POST /api/v1/pericia/prontuarios/{prontuario_id}/replicar`

**Pré-condição:** `func-pericia` tem segunda matrícula `func-pericia-vinculo2` em filial diferente.

```http
POST /api/v1/pericia/prontuarios/{prontuario_id}/replicar
{ "matriculasAlvo": ["{func_pericia_vinculo2}"] }
```

**Assert:**

- `func-pericia-vinculo2.situacaoFuncional === "AFASTAMENTO"` com mesmas datas.
- Segundo evento `S-2230` gerado para o segundo vínculo.

#### F.7 Cleanup

```sql
UPDATE funcionario SET situacao_funcional = 'ATIVO' WHERE id IN ('{func_pericia}', '{func_pericia_vinculo2}');
DELETE FROM licenca_medica WHERE prontuario_id = '{prontuario_id}';
DELETE FROM prontuario_pericia WHERE id = '{prontuario_id}';
UPDATE agendamento_pericia SET status = 'PENDENTE' WHERE id = '{agendamento_id}';
```

---

### Cenário G — Recrutamento (requisição → edital → inscrição → classificação → nomeação)

**Identificador:** GS-G | **Módulos:** `@sgp/recrutamento`, `@sgp/rh`

#### G.0 Pré-condição

| Dado               | Valor                                                        |
| ------------------ | ------------------------------------------------------------ |
| Solicitante        | `usr-gestor-rh`, papel `ROLE_RECRUTAMENTO_SELECAO.CADASTRAR` |
| Lotação destino    | `lotacao_0001`                                               |
| Função requisitada | `funcao-analista-rh`                                         |
| Vagas              | 2                                                            |
| Candidatos         | 3 pessoas cadastradas no banco de talentos                   |

#### G.1 Criar requisição de pessoal

Rota contratual: `POST /api/v1/recrutamento/requisicoes`

```http
POST /api/v1/recrutamento/requisicoes
{
  "solicitanteId": "usr-gestor-rh",
  "filialId": "filial-0001",
  "lotacaoId": "lotacao-0001",
  "motivo": "AUMENTO_QUADRO",
  "justificativa": "Crescimento da demanda de atendimento ao servidor.",
  "dataEntrada": "2026-04-21",
  "dataLimite": "2026-05-30",
  "funcoesRequisitadas": [{
    "funcaoId": "funcao-analista-rh",
    "tipoContratacao": "EFETIVO",
    "quantidadeVagas": 2,
    "requisitos": "Graduação em Administração ou Direito",
    "turnoId": "turno-0001"
  }]
}
```

**Assert:**

- `requisicao.situacao === "RASCUNHO"`.
- Apenas `usr-gestor-rh` pode editá-la neste estado.

#### G.2 Encaminhar para gestão RH

Rota contratual: `PATCH /api/v1/recrutamento/requisicoes/{requisicao_id}/encaminhar`

```http
PATCH /api/v1/recrutamento/requisicoes/{requisicao_id}/encaminhar
```

**Assert:**

- `requisicao.situacao === "EM_PROCESSO"`.
- Notificação enviada ao RH (evento `notificacoes.requisicao.encaminhada` na fila).

#### G.3 Vincular candidatos

Rota contratual: `POST /api/v1/recrutamento/requisicoes/{requisicao_id}/candidatos`

```http
POST /api/v1/recrutamento/requisicoes/{requisicao_id}/candidatos
{
  "candidatos": [
    { "pessoaId": "cand-001", "curriculoS3Key": "test/curriculo-cand-001.pdf" },
    { "pessoaId": "cand-002", "curriculoS3Key": "test/curriculo-cand-002.pdf" },
    { "pessoaId": "cand-003", "curriculoS3Key": "test/curriculo-cand-003.pdf" }
  ]
}
```

**Assert:**

- 3 candidatos com `situacao = "PENDENTE"`.
- S3 key persistida; remoção de candidato deleta currículo no backend S3-compatible (MiniIO em testes quando S3 real não estiver configurado).

#### G.4 Análise curricular e classificação

Rota contratual: `PATCH /api/v1/recrutamento/candidatos/{candidato_id}`

```http
PATCH /api/v1/recrutamento/candidatos/{candidato_id}
{ "situacao": "APROVADO", "comentarioAnalise": "Perfil aderente. Experiência > 3 anos." }

PATCH /api/v1/recrutamento/candidatos/{candidato_id_2}
{ "situacao": "APROVADO", "comentarioAnalise": "Perfil adequado." }

PATCH /api/v1/recrutamento/candidatos/{candidato_id_3}
{ "situacao": "REPROVADO", "comentarioAnalise": "Não atende requisito de formação." }
```

#### G.5 Concluir análise → nomeação

Rota contratual: `PATCH /api/v1/recrutamento/requisicoes/{requisicao_id}/concluir`

```http
PATCH /api/v1/recrutamento/requisicoes/{requisicao_id}/concluir
```

**Assert:**

- `requisicao.situacao === "CONCLUIDO"`.
- Notificação ao solicitante disparada.
- Candidatos aprovados (cand-001, cand-002) elegíveis para nomeação.

**Passo de nomeação (início do Cenário A para cada nomeado):** criar funcionário para `cand-001` e `cand-002` usando dados do banco de talentos.

#### G.6 Cleanup

```sql
DELETE FROM candidato_requisicao WHERE requisicao_id = '{requisicao_id}';
DELETE FROM funcao_requisitada WHERE requisicao_id = '{requisicao_id}';
DELETE FROM requisicao_pessoal WHERE id = '{requisicao_id}';
```

---

## 4. Shadow mode do motor de folha

### 4.1 Objetivo

Validar que o `sgp-payroll-engine` novo produz resultados idênticos (ou aceitavelmente próximos) ao motor legado Java durante o período de migração, sem expor o resultado novo a servidores reais.

### 4.2 Arquitetura do shadow mode

```mermaid
flowchart LR
    API[sgp-core-api\nrequesição de cálculo]
    LEG[Motor Legado\nJava/Spring]
    NEW[sgp-payroll-engine\nNestJS]
    COMP[Comparador\nsgp-shadow-comparator]
    STORE[shadow_comparison\ntabela PostgreSQL]
    DASH[Dashboard\nGrafana / CloudWatch]

    API -->|fan-out síncrono| LEG
    API -->|fan-out assíncrono| NEW
    LEG -->|resultado legado| COMP
    NEW -->|resultado novo| COMP
    COMP -->|diff JSONB| STORE
    STORE --> DASH
```

### 4.3 Ativação por feature flag

```typescript
// folha.service.ts
if (featureFlags.get('SHADOW_MODE_PAYROLL')) {
  const [legadoResult, novoResult] = await Promise.all([
    this.legadoPayrollAdapter.calcular(payload),
    this.payrollEngineClient.calcular(payload),
  ]);
  await this.shadowComparatorService.comparar(legadoResult, novoResult, payload.contrachequeId);
  return legadoResult; // resultado real = legado durante shadow
}
```

### 4.4 Estrutura da tabela de comparação

```sql
CREATE TABLE shadow_comparison (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  contracheque_id  UUID NOT NULL,
  competencia      DATE NOT NULL,
  funcionario_id   UUID NOT NULL,
  legado_json      JSONB NOT NULL,
  novo_json        JSONB NOT NULL,
  diff_json        JSONB,                   -- campos divergentes
  status           TEXT NOT NULL            -- 'IGUAL', 'DIVERGENCIA_TOLERADA', 'DIVERGENCIA_CRITICA'
                   CHECK (status IN ('IGUAL','DIVERGENCIA_TOLERADA','DIVERGENCIA_CRITICA')),
  max_diff_abs     NUMERIC(12,4),           -- maior diferença absoluta em R$
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON shadow_comparison (tenant_id, competencia, status);
CREATE INDEX ON shadow_comparison (status) WHERE status = 'DIVERGENCIA_CRITICA';
```

### 4.5 Tolerâncias

| Tipo de divergência                                 | Critério                    | Classificação          |
| --------------------------------------------------- | --------------------------- | ---------------------- |
| Diferença em qualquer lançamento ≤ R$ 0,02          | Arredondamento              | `DIVERGENCIA_TOLERADA` |
| Diferença ≤ 0,01 % do valor da verba (mín. R$ 0,02) | Arredondamento proporcional | `DIVERGENCIA_TOLERADA` |
| Diferença > R$ 0,02 em qualquer lançamento          | Erro de cálculo             | `DIVERGENCIA_CRITICA`  |
| Campo presente num resultado e ausente no outro     | Verba faltante              | `DIVERGENCIA_CRITICA`  |
| Líquido final diverge em qualquer valor             | Erro crítico                | `DIVERGENCIA_CRITICA`  |

### 4.6 Relatório de divergências

O job `daily:shadow-divergencia-report` gera um relatório por tenant/competência:

```typescript
interface ShadowDivergenciaReport {
  tenant: string;
  competencia: string;
  totalContracheques: number;
  iguais: number;
  divergenciasToleradas: number;
  divergenciasCriticas: number;
  percentualEquivalencia: number; // meta: ≥ 99,9 %
  topDivergencias: ShadowDivergenciaItem[];
}
```

### 4.7 Critério de cutover

O motor novo só substitui o legado como resultado oficial quando:

- `percentualEquivalencia >= 99,9 %` em 3 competências consecutivas.
- Zero `DIVERGENCIA_CRITICA` nos últimos 30 dias.
- Aprovação formal do responsável de folha do tenant.

### 4.8 Auditoria do shadow

Toda divergência crítica gera um `audit_log` com `acao = "SHADOW_DIVERGENCIA"` para rastreabilidade futura.

---

## 5. Dados de teste

### 5.1 Fábricas de dados (factory-bot style)

```typescript
// packages/test-factories/src/pessoa.factory.ts
import { faker } from '@faker-js/faker/locale/pt_BR';
import { cpf as cpfGenerator } from 'cpf-cnpj-validator';

export const PessoaFactory = {
  build: (overrides: Partial<PessoaDto> = {}): PessoaDto => ({
    cpf: cpfGenerator.generate(true),
    nome: faker.person.fullName(),
    dataNascimento: faker.date
      .birthdate({ min: 18, max: 65, mode: 'age' })
      .toISOString()
      .split('T')[0],
    sexo: faker.helpers.arrayElement(['M', 'F']),
    estadoCivil: faker.helpers.arrayElement(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO']),
    racaCor: faker.helpers.arrayElement(['BRANCA', 'PARDA', 'PRETA', 'AMARELA', 'INDIGENA']),
    grauInstrucao: 'SUPERIOR_COMPLETO',
    nacionalidade: 'BRASILEIRO',
    ...overrides,
  }),
};

export const FuncionarioFactory = {
  build: (overrides = {}) => ({
    vinculoTipo: 'EFETIVO',
    tipoIngresso: 'CONCURSO_PUBLICO',
    cargaHoraria: 40,
    tipoContaBanco: 'CORRENTE',
    ...overrides,
  }),
};

export const FolhaFactory = {
  competenciaAberta: (mes: number, ano: number) => ({
    mes,
    ano,
    estado: 'ABERTA',
  }),
  competenciaFechada: (mes: number, ano: number) => ({
    mes,
    ano,
    estado: 'FECHADA',
  }),
  contrachequeCompleto: (funcionarioId: string, overrides = {}) => ({
    funcionarioId,
    template: 'SERVIDOR',
    situacao: 'CONCLUIDO',
    lancamentos: [
      { verbaId: 'vrb-0001', valor: 5800.0, tipo: 'CALCULADO' },
      { verbaId: 'vrb-inss', valor: -435.0, tipo: 'CALCULADO' },
    ],
    ...overrides,
  }),
};

export const PericiaMedicaFactory = {
  agendamento: (funcionarioId: string, overrides = {}) => ({
    funcionarioId,
    especialidadeId: 'esp-clinica-medica',
    agendaId: 'agenda-med-0001',
    status: 'AGENDADO',
    ...overrides,
  }),
};
```

### 5.2 Fixtures por domínio

```
packages/test-fixtures/
├── tenants/
│   └── tenant-t1.json          # T1 com todos parâmetros
├── catalogos/
│   ├── cargos.json
│   ├── verbas-minimas.json     # vrb-0001, vrb-inss, vrb-irrf + fórmulas
│   ├── aliquotas-inss-2026.json
│   ├── aliquotas-irrf-2026.json
│   ├── motivos-afastamento.json
│   ├── especialidades-medicas.json
│   └── municipios-ibge.json
├── servidores/
│   ├── func-ativo.json         # servidor padrão para GS-A
│   ├── func-retroativo.json    # GS-B
│   ├── func-rescisao.json      # GS-C
│   ├── func-aposent.json       # GS-D
│   └── func-pericia.json       # GS-F
├── previdenciario/
│   ├── aposentado-recad.json   # GS-E
│   └── regras-aposentadoria.json
└── recrutamento/
    ├── candidatos.json         # GS-G
    └── banco-talentos.json
```

### 5.3 Catálogos mínimos por cenário

| Cenário | Catálogos obrigatórios                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------- |
| GS-A    | cargos, verbas-minimas, alíquotas INSS/IRRF 2026, tipo_folha, tipo_processamento MENSAL, banco, turno |
| GS-B    | GS-A + competência 2026-03 com 3 funcionários calculados                                              |
| GS-C    | GS-A + motivos rescisão, certificado A1 mock, eSocial XSD S-2299                                      |
| GS-D    | GS-A + regras_aposentadoria, parâmetro SIPREV habilitado                                              |
| GS-E    | aposentado com histórico, campanha_recadastramento ativa                                              |
| GS-F    | GS-A + médico, agenda, CID J06.0, eSocial XSD S-2230                                                  |
| GS-G    | filial, lotação, função, banco_talentos com 3 candidatos                                              |

### 5.4 Anonimização de dump legado

Para uso de dados reais sanitizados (ambiente `homologacao` e `shadow`):

```sql
-- Script de anonimização aplicado sobre dump do legado SQL Server
-- após conversão para PostgreSQL via pgloader

-- 1. Pessoas
UPDATE pessoa SET
  nome             = 'SERVIDOR ' || id::text,
  cpf              = generate_anonimized_cpf(id),   -- função custom que garante CPF válido único
  email_pessoal    = 'anonimizado_' || id::text || '@sgp.test',
  telefone         = '(00) 00000-0000',
  filiacao_mae     = 'MAE ANONIMIZADA',
  filiacao_pai     = 'PAI ANONIMIZADO';

-- 2. Contas bancárias
UPDATE funcionario SET
  agencia = '0001',
  conta   = LPAD((ROW_NUMBER() OVER ())::text, 8, '0') || '-' ||
            (FLOOR(RANDOM() * 9 + 1))::text;

-- 3. Documentos
UPDATE documento_pessoa SET numero = 'ANONIMIZADO-' || id::text;

-- 4. Prontuários (saúde)
UPDATE prontuario_pericia SET
  hda          = '[ANONIMIZADO]',
  exame_fisico = '[ANONIMIZADO]',
  diagnostico  = '[ANONIMIZADO]',
  observacao   = NULL;

-- 5. Remover dados de e-mail corporativo
UPDATE contato SET email_corporativo = NULL, email_pessoal = NULL;
```

**Política:** o dump anonimizado é gerado mensalmente, criptografado em S3 (bucket `sgp-testdata-anon`, SSE-KMS), e acessível apenas pelos ambientes `homologacao` e `shadow` via role IAM específica.

---

## 6. CI/CD — pipelines e gates

### 6.1 Diagrama de pipeline

```mermaid
flowchart TD
    PR[Pull Request aberto / atualizado]
    PR --> LINT[lint + typecheck\n~2 min]
    LINT --> UNIT[unit tests + cobertura\n~5 min]
    UNIT --> PACT_C[pact consumer\n~2 min]
    PACT_C --> GATE_PR{Gate PR}

    GATE_PR -->|aprovado| MERGE[Merge para develop]

    MERGE --> INT[testes de integração\nTestcontainers\n~15 min]
    INT --> PACT_P[pact provider verify\n~5 min]
    PACT_P --> BUILD[build + docker image\n~8 min]
    BUILD --> GATE_DEV{Gate develop}

    GATE_DEV -->|aprovado| DEPLOY_QA[Deploy em QA]
    DEPLOY_QA --> ZAP_QA[ZAP baseline scan\n~10 min]
    ZAP_QA --> GATE_QA{Gate QA}

    GATE_QA -->|aprovado| TAG[Tag de release candidate]
    TAG --> E2E_NOITE[E2E nightly + golden scenarios\nhomologacao\n~60 min]
    E2E_NOITE --> AXE[Axe accessibility\n~10 min]
    AXE --> GATE_HC{Gate homologação}

    GATE_HC -->|aprovado| STAGING[Deploy em staging]
    STAGING --> ZAP_FULL[ZAP active scan\n~30 min]
    ZAP_FULL --> GATE_STG{Gate staging}
    GATE_STG -->|aprovado| PROD[Deploy em producao]
    PROD --> SMOKE[smoke tests\n~5 min]

    style GATE_PR fill:#2980b9,color:#fff
    style GATE_DEV fill:#2980b9,color:#fff
    style GATE_QA fill:#27ae60,color:#fff
    style GATE_HC fill:#f39c12,color:#fff
    style GATE_STG fill:#c0392b,color:#fff
```

### 6.2 GitHub Actions — workflows

#### Workflow baseline atual (`source-ci.yml`)

O workflow corrente roda a partir da raiz do repositório e executa os comandos de aplicação diretamente nesse workspace. Ele usa `actions/setup-node@v4` com Node 24, cache npm em `package-lock.json`, um único lockfile de workspace e serviço PostgreSQL 16 para os gates com banco real.

Etapas obrigatórias:

1. `npm ci`
2. `npm run lint:check`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm run api:alignment:check -- --json`
6. `npm run db:alignment:check -- --json`
7. `npm run health:json`
8. `npm run test`
9. `npm run test:db`
10. `npm run test:e2e`
11. `npm run build`
12. `npm run test:coverage`
13. `npm run governance:check`

Este baseline não exige S3 real, Cognito real, Gov.br real, eSocial produção restrita ou Pact Broker. Esses itens permanecem gates de release futura.

#### Workflow PR (`ci-pr.yml`)

```yaml
name: CI — Pull Request
on: [pull_request]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx run-many --target=lint --all
      - run: pnpm nx run-many --target=typecheck --all
      - run: pnpm audit --audit-level=high

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx run-many --target=test --all --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  security-static:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx run-many --target=lint:security --all
        # executa eslint-plugin-security como target separado

  pact-consumer:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx run-many --target=test:pact-consumer --all
      - run: pnpm pact-broker publish --broker-base-url=${{ secrets.PACT_BROKER_URL }}
```

#### Workflow develop (`ci-develop.yml`)

```yaml
name: CI — develop
on:
  push:
    branches: [develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: sgp, POSTGRES_DB: sgp_test }
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:db
        env:
          DATABASE_URL: postgresql://postgres:sgp@localhost:5432/sgp_test
          LOCALSTACK_ENDPOINT: http://localhost:4566

  pact-provider-verify:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - run: pnpm nx run-many --target=test:pact-provider --all

  build-images:
    runs-on: ubuntu-latest
    needs: pact-provider-verify
    steps:
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.ECR_REGISTRY }}/sgp-core-api:${{ github.sha }}
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/sgp-core-api:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: '1'

  deploy-qa:
    needs: build-images
    environment: qa
    runs-on: ubuntu-latest
    steps:
      - run: aws ecs update-service --cluster sgp-qa --service sgp-core-api --force-new-deployment
      - run: pnpm zap-baseline-scan --target https://api.qa.sgp.internal
```

#### Workflow nightly E2E (`ci-nightly.yml`)

```yaml
name: E2E nightly — homologacao
on:
  schedule:
    - cron: '0 2 * * *' # 02:00 BRT
  workflow_dispatch:

jobs:
  e2e-golden:
    runs-on: ubuntu-latest
    environment: homologacao
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm nx run sgp-admin-e2e:e2e --grep @golden
        env:
          E2E_BASE_URL: ${{ secrets.HOMOLOGACAO_URL }}
          E2E_AUTH_TOKEN: ${{ secrets.HOMOLOGACAO_TOKEN }}
      - uses: simple-elf/allure-publish-action@v2
        with:
          allure_results: allure-results
          allure_report: allure-report
          report_url: https://allure.sgp.internal

  axe-accessibility:
    runs-on: ubuntu-latest
    needs: e2e-golden
    steps:
      - run: pnpm nx run sgp-admin-e2e:e2e --grep @axe
```

#### Workflow de carga semanal (`ci-load.yml`)

```yaml
name: Load tests — weekly
on:
  schedule:
    - cron: '0 4 * * 0' # domingo 04:00 BRT
  workflow_dispatch:

jobs:
  k6-load:
    runs-on: ubuntu-latest
    environment: load
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/scenarios/folha-calculo.js
          flags: --out influxdb=${{ secrets.INFLUXDB_URL }}
        env:
          BASE_URL: ${{ secrets.LOAD_ENV_URL }}
          TOKEN: ${{ secrets.LOAD_ENV_TOKEN }}
```

### 6.3 Matriz de gates

| Etapa                | O que bloqueia                                             | Tipo de bloqueio    |
| -------------------- | ---------------------------------------------------------- | ------------------- |
| **PR merge**         | Falha de lint ou typecheck                                 | Bloqueio automático |
| **PR merge**         | Cobertura unitária abaixo do limiar por módulo             | Bloqueio automático |
| **PR merge**         | Falha de `eslint-plugin-security` em regras críticas       | Bloqueio automático |
| **PR merge**         | CVE ≥ 7 em dependência runtime                             | Bloqueio automático |
| **PR merge**         | Quebra de contrato Pact (consumer)                         | Bloqueio automático |
| **Merge develop**    | Falha em qualquer teste de integração                      | Bloqueio automático |
| **Merge develop**    | Verificação Pact provider falha                            | Bloqueio automático |
| **Merge develop**    | Imagem Docker com CVE CRÍTICA (trivy)                      | Bloqueio automático |
| **Deploy QA**        | ZAP baseline scan: alerta HIGH ou CRITICAL                 | Bloqueio automático |
| **Deploy staging**   | Falha em qualquer golden scenario E2E                      | Bloqueio automático |
| **Deploy staging**   | Violação WCAG 2.1 AA no Axe                                | Bloqueio automático |
| **Deploy staging**   | ZAP active scan: alerta HIGH ou CRITICAL                   | Bloqueio automático |
| **Release producao** | Homologação formal não concluída por domínio (ver §9)      | Bloqueio manual     |
| **Release producao** | Checklist de release incompleto (ver §10)                  | Bloqueio manual     |
| **Release producao** | `percentualEquivalencia` shadow < 99,9 % (se shadow ativo) | Bloqueio manual     |

---

## 7. Ambientes

### 7.1 Tabela de ambientes

| Ambiente        | Propósito                                            | Branch / trigger     | Dados                                                     | Acesso                       |
| --------------- | ---------------------------------------------------- | -------------------- | --------------------------------------------------------- | ---------------------------- |
| **dev**         | Desenvolvimento local e testes unitários/integração  | Feature branch       | Testcontainers efêmeros, LocalStack local e MiniIO local  | Desenvolvedor                |
| **qa**          | Validação contínua pós-merge para develop            | `develop` push       | Fixtures mínimas + seed de catálogos; reset a cada deploy | Dev + QA                     |
| **homologacao** | Golden scenarios, E2E nightly, homologação funcional | Tag RC nightly       | Dump legado anonimizado (atualizado mensalmente)          | QA + RH funcional + Negócio  |
| **shadow**      | Shadow mode do motor de folha em paralelo ao legado  | Configuração manual  | Cópia anonimizada de produção (real sanitizado)           | Equipe de folha + Engenharia |
| **staging**     | Pré-produção, ZAP full scan, aprovação final         | Tag release          | Cópia anonimizada de produção (mais recente)              | Gestão de projeto + TI       |
| **producao**    | Ambiente real multi-tenant                           | Tag release aprovada | Dados reais; RLS habilitada; MFA obrigatório              | Operações + clientes         |

### 7.2 Infraestrutura por ambiente

| Componente    | dev               | qa                | homologacao         | shadow             | staging                 | producao                  |
| ------------- | ----------------- | ----------------- | ------------------- | ------------------ | ----------------------- | ------------------------- |
| PostgreSQL    | Testcontainers    | RDS t3.medium     | RDS t3.large        | RDS r6g.xlarge     | RDS r6g.xlarge Multi-AZ | RDS r6g.2xlarge Multi-AZ  |
| ECS / Fargate | Local Docker      | 1 task            | 2 tasks             | 2 tasks            | 2 tasks                 | Auto Scaling 2–10         |
| S3            | MiniIO            | Bucket `qa`       | Bucket `homolog`    | Bucket `shadow`    | Bucket `staging`        | Buckets por tenant (prod) |
| SQS / SNS     | LocalStack        | AWS real          | AWS real            | AWS real           | AWS real                | AWS real                  |
| Cognito       | Mock / LocalStack | User Pool `qa`    | User Pool `homolog` | User Pool `shadow` | User Pool `staging`     | User Pool `prod`          |
| CloudWatch    | —                 | Básico            | Básico              | Logs detalhados    | Logs detalhados         | Full + alarms             |
| WAF           | —                 | —                 | —                   | —                  | Habilitado              | Habilitado + Shield       |
| KMS           | —                 | CMK compartilhada | CMK compartilhada   | CMK própria        | CMK própria             | CMK por tenant            |

### 7.3 Política de dados por ambiente

- **dev/qa:** apenas fixtures e dados gerados por fábricas. Nunca dados reais ou CPFs reais.
- **homologacao/shadow:** dump legado anonimizado. CPFs e dados pessoais substituídos (ver §5.4). Bucket S3 com versionamento e lifecycle de 90 dias.
- **staging:** cópia do dump anonimizado mais recente. Dados de integração (eSocial, banco) em modo sandbox.
- **producao:** dados reais. Acesso restrito; rotação de credenciais a cada 90 dias; auditoria CloudTrail ativa.

---

## 8. Observabilidade de testes

### 8.1 Allure Report

- Instância Allure Server hospedada em `https://allure.sgp.internal`.
- Suítes separadas por ambiente: `qa`, `homologacao`, `staging`.
- Cada execução E2E gera artefatos: screenshot, vídeo, trace Playwright, PDF comparado (golden scenarios).
- Histórico de 90 dias; trend chart de pass/fail/flaky por cenário.

### 8.2 Dashboard de flakiness

```mermaid
graph LR
    CI[GitHub Actions\nexecuções] --> ALLURE[Allure Server\nresultados brutos]
    ALLURE --> FLAKE[sgp-flakiness-tracker\nserviço interno]
    FLAKE --> GRAFANA[Grafana\ndashboard]
    FLAKE --> SLACK[Notificação Slack\n#sgp-qa-alerts]
```

**Métricas de flakiness rastreadas:**

| Métrica                                   | Alvo     | Alarme          |
| ----------------------------------------- | -------- | --------------- |
| Taxa de flakiness por cenário E2E         | < 2 %    | > 5 % em 7 dias |
| Taxa de flakiness por teste de integração | < 1 %    | > 2 % em 7 dias |
| Cenários golden com falha não-flaky       | 0        | Qualquer falha  |
| Tempo médio de suite E2E                  | < 20 min | > 30 min        |
| Tempo médio de suite unitária             | < 5 min  | > 8 min         |
| Tempo médio de suite integração           | < 15 min | > 20 min        |

### 8.3 SLAs de pipeline

| Stage               | SLA de duração | Ação se ultrapassar                            |
| ------------------- | -------------- | ---------------------------------------------- |
| Lint + typecheck    | 3 min          | Alerta no PR; investigar divisão de targets nx |
| Unit tests          | 6 min          | Alerta; candidato a paralelização              |
| Integração          | 18 min         | Alerta; candidato a Testcontainers reuse       |
| E2E nightly (total) | 75 min         | Alerta; considerar sharding Playwright         |
| Golden scenarios    | 45 min         | Alerta prioritário                             |
| ZAP active scan     | 40 min         | Alerta; revisar configuração                   |

### 8.4 Métricas de negócio em testes

O pipeline de golden scenarios coleta métricas de negócio para rastrear regressões:

```typescript
// Exemplo de métrica coletada no GS-A
test.afterEach(async ({}, testInfo) => {
  await publishMetric('golden_scenario_result', {
    scenario: 'GS-A',
    duration_ms: testInfo.duration,
    passed: testInfo.status === 'passed',
    contracheque_liquido: extractedLiquido,
    inss_calculado: extractedInss,
  });
});
```

### 8.5 Integração com observabilidade de produção

- Traces OpenTelemetry dos testes de integração são enviados para X-Ray no ambiente QA, permitindo comparação com traces de produção.
- `correlation_id` dos testes é propagado como header `X-Test-Correlation-Id` para facilitar rastreamento em logs CloudWatch.

---

## 9. Homologação por domínio

### 9.1 Matriz de homologação

| Domínio                              | Tipo de homologação                 | Critério de aceite                                                                        | Papel responsável   | Etapa (doc 40) |
| ------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- | -------------- |
| **Parametrização e acesso**          | Funcional + Autorização             | Usuário certo vê menu certo; terminologia institucional correta                           | TI + Gestão         | Etapa 1        |
| **Cadastro funcional (Módulo RH)**   | Funcional + Documental              | Pessoa, vínculo, posse e dossiê reproduzidos com equivalência                             | RH Funcional        | Etapa 2        |
| **Folha de Pagamento**               | Funcional + Documental + Cálculo    | Cálculo equivalente ao legado; contracheque idêntico em campos; remessa/retorno aprovados | Folha / Previdência | Etapa 3        |
| **Previdenciário e Recadastramento** | Funcional + Documental + Integração | Prazos, comprovantes, SIPREV e certidões aprovados                                        | Folha / Previdência | Etapa 4        |
| **Saúde Ocupacional e Perícia**      | Funcional + Documental              | Prontuário, laudo PDF e efeito administrativo aprovados                                   | Saúde Ocupacional   | Etapa 5        |
| **Recrutamento e Estágio**           | Funcional                           | Pipeline de estados e relatórios aprovados                                                | RH Funcional        | Etapa 6        |
| **eSocial**                          | Integração + Documental             | XML validado; leiaute S-1.2 correto; eventos transmitidos e recebidos                     | TI / Integrações    | Etapa 7        |
| **DIRF**                             | Documental + Integração             | Arquivo TXT correto; validação PGD-DIRF sem erros                                         | Folha               | Etapa 7        |
| **Remessa / Retorno bancário**       | Integração + Documental             | CNAB válido; retorno refletido na trilha                                                  | TI                  | Etapa 7        |
| **Portal do Servidor**               | Funcional + Acessibilidade          | Jornadas de contracheque e prova de vida aprovadas; Axe sem violações AA                  | RH + TI             | Etapa 2–4      |
| **Auditoria**                        | Funcional                           | Trilha de auditoria reproduzida para domínios sensíveis                                   | TI                  | Transversal    |
| **Convênio**                         | Funcional                           | Descontos refletidos em folha corretamente                                                | Folha               | Etapa 3        |
| **Avaliação e Progressão**           | Funcional                           | Progressão e avaliação reproduzidas; plano de cargos correto                              | RH Funcional        | Etapa 2        |

### 9.2 Evidências obrigatórias por domínio

| Domínio            | Evidências exigidas                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Folha de Pagamento | Screenshots de contracheque legado vs. novo; diff JSONB de lançamentos; PDF aprovado por responsável |
| Previdenciário     | Comprovante PDF; XML SIPREV validado manualmente; timeline de recadastramento                        |
| Saúde              | PDF laudo pericial; print de situação funcional antes/depois                                         |
| eSocial            | XML gerado; protocolo de envio (sandbox); print de status no portal eSocial                          |
| Autorização        | Gravação de sessão mostrando menus por perfil                                                        |

### 9.3 Critério de go-live por domínio

Um domínio é declarado **apto para go-live** quando **todos** os seguintes forem verdade:

1. Todos os golden scenarios do grupo correspondente passaram em `homologacao`.
2. Zero divergência crítica de cálculo (se folha) ou de documento (se documental).
3. Nenhuma lacuna crítica de autorização.
4. Aprovação formal registrada pelo responsável de negócio (assinatura eletrônica no Allure ou e-mail formal para o gestor de QA).
5. Sem pendência `BLOQUEANTE` aberta no issue tracker do projeto.

---

## 10. Checklist de release

### 10.1 Pre-release (T-7 dias)

- [ ] Todos os golden scenarios passando em `homologacao` nos últimos 3 dias consecutivos.
- [ ] Zero falha crítica no ZAP active scan de `staging`.
- [ ] Cobertura mínima runtime atingida (`lines`, `branches` e `functions` ≥ 85 % no backend NestJS).
- [ ] Zero vulnerabilidade CRÍTICA/ALTA em dependências runtime (`pnpm audit`).
- [ ] Zero imagem Docker com CVE CRÍTICA (trivy).
- [ ] Contratos Pact verificados com sucesso entre todos os pares.
- [ ] Migrations de banco testadas em `staging` com dump anonimizado.
- [ ] Feature flags de rollout configuradas para release gradual (% de tenants).
- [ ] Shadow mode com `percentualEquivalencia >= 99,9 %` (se ativo).
- [ ] Documentação de release notes redigida e revisada.
- [ ] Runbook de rollback atualizado.

### 10.2 Release (dia D)

- [ ] Deploy em `producao` via pipeline automatizado (sem deploy manual).
- [ ] Smoke tests passando em produção (< 5 min).
- [ ] Dashboards CloudWatch sem alarmes críticos (5 min pós-deploy).
- [ ] Teste de login end-to-end com usuário de smoke test por tenant ativo.
- [ ] Verificação de filas SQS/SNS: zero mensagens em DLQ.
- [ ] Confirmação de que RLS está ativa em produção (`SHOW row_security` → `on`).
- [ ] Certificados A1/A3 eSocial válidos (> 30 dias de validade).
- [ ] Notificação enviada aos tenants afetados.

### 10.3 Post-release (T+24h, T+72h)

- [ ] T+24h: sem degradação de performance (p95 de endpoints críticos dentro do SLA).
- [ ] T+24h: zero erros 5xx acima da linha de base.
- [ ] T+24h: shadow mode comparação da primeira folha calculada em produção.
- [ ] T+72h: revisão de logs de auditoria para detectar acessos anômalos.
- [ ] T+72h: validação de pelo menos 1 contracheque real emitido por tenant.
- [ ] T+7d: retrospectiva de qualidade com análise de flakiness do pipeline.

### 10.4 Critérios de rollback

| Condição                                                      | Ação                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| Taxa de erro 5xx > 1 % por 5 min                              | Rollback automático via ECS task definition anterior |
| Smoke test falha em produção                                  | Rollback imediato                                    |
| Divergência crítica no shadow mode (primeiro cálculo real)    | Suspender motor novo; escalar para time de folha     |
| CVE crítica descoberta pós-deploy                             | Patch de emergência em < 4h ou rollback              |
| Falha de RLS detectada (vazamento cross-tenant)               | Rollback imediato + incidente P0                     |
| Contracheque gerado com valor errado (notificado pelo tenant) | Rollback imediato + reprocessamento                  |

### 10.5 Rollback procedure

```bash
# 1. Reverter para task definition anterior no ECS
aws ecs update-service \
  --cluster sgp-prod \
  --service sgp-core-api \
  --task-definition sgp-core-api:${PREVIOUS_REVISION}

# 2. Se SQL canônico foi aplicado — restaurar snapshot/backup do banco anterior
# Alterações destrutivas no SQL canônico requerem aprovação manual antes de release

# 3. Notificar tenants afetados via SNS tópico de incidentes
aws sns publish \
  --topic-arn arn:aws:sns:sa-east-1:{account}:sgp-incidents \
  --message "Rollback em andamento — SGP versão ${VERSION}. Previsão de normalização: ${ETA}"
```

---

## 11. Regressão legado → novo

### 11.1 Objetivo

Provar equivalência funcional entre o SGP legado (Java/Spring) e o SGP novo (NestJS) para cada saída oficial, cálculo de folha histórica e jornada de domínio.

### 11.2 Checklist por saída oficial

#### Contracheque

| Verificação                          | Método                                 | Critério de aceite                                         |
| ------------------------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Campos obrigatórios presentes        | Comparação de schema PDF               | Todos os campos do template SERVIDOR/PENSIONISTA presentes |
| Valores de proventos                 | Diff numérico por verba                | Diferença ≤ R$ 0,02                                        |
| Valores de descontos                 | Diff numérico por verba                | Diferença ≤ R$ 0,02                                        |
| Líquido final                        | Diff numérico                          | Diferença ≤ R$ 0,02                                        |
| Assinatura e cabeçalho institucional | Visual + metadados PDF                 | Logo, nome do ente, competência corretos                   |
| Marca d'água (se aplicável)          | Extração de texto PDF                  | Presente quando `marca_dagua_flag = true`                  |
| Feedback de fórmula por verba        | Verificação de `memoria_calculo` JSONB | Não-nulo; valor batendo com lançamento                     |

#### SIPREV

| Verificação                           | Método                                         |
| ------------------------------------- | ---------------------------------------------- |
| Schema XML válido                     | Validação XSD SIPREV                           |
| CPF, matrícula, valor provento        | Comparação campo a campo com exportação legado |
| Todos os aposentados ativos incluídos | Contagem de registros                          |
| Data competência correta              | Verificação de campo `<competencia>`           |

#### DIRF

| Verificação                       | Método                         |
| --------------------------------- | ------------------------------ |
| Leiaute RFB vigente               | Validação com PGD-DIRF sandbox |
| Valores de IR retido por CPF      | Diff com apuração legada       |
| Rendimentos tributáveis e isentos | Diff por categoria             |
| Ausência de CPF duplicado         | Verificação de unicidade       |

#### Remessa CNAB

| Verificação                     | Método                              |
| ------------------------------- | ----------------------------------- |
| Layout CNAB 240/400 por banco   | Validação de estrutura de segmentos |
| Valor líquido de cada servidor  | Diff com relação de líquidos legada |
| Numeração sequencial de remessa | Verificação de `NUMERO_REMESSA`     |
| Dígitos verificadores           | Algoritmo por banco                 |

#### eSocial

| Verificação                    | Método                                              |
| ------------------------------ | --------------------------------------------------- |
| XML válido contra XSD S-1.2    | Validação local                                     |
| Campos obrigatórios por evento | Checklist por tipo (S-2200, S-2299, S-2230 etc.)    |
| Envio e retorno em sandbox     | Testes contra ambiente de produção restrita eSocial |

### 11.3 Recálculo de folha histórica

Para comprovar equivalência de cálculo histórica, o processo abaixo é executado mensalmente durante o shadow mode:

```mermaid
flowchart LR
    DUMP[Dump legado SQL Server\n3 competências passadas] --> CONV[pgloader\nconversão PostgreSQL]
    CONV --> ANON[Anonimização\n§5.4]
    ANON --> SHADOW_DB[shadow DB\nPostgreSQL 16]
    SHADOW_DB --> ENG_NEW[sgp-payroll-engine\nnovo]
    SHADOW_DB --> ENG_LEG[Motor legado\njava/Spring]
    ENG_NEW --> COMP[Comparador\nShadow]
    ENG_LEG --> COMP
    COMP --> RPT[Relatório de equivalência\n% por competência]
```

**Competências históricas de referência:** os 3 meses imediatamente anteriores ao mês corrente + o mês de dezembro (para 13º) do ano anterior.

**Meta:** `percentualEquivalencia >= 99,9 %` por competência de referência antes do cutover do motor.

### 11.4 Reprodução de dossiê

Para cada servidor na massa de validação (amostra de 50 servidores por tenant de piloto):

1. Exportar dossiê completo do legado (`GET /funcionario/{id}/dossie`).
2. Exportar dossiê do novo (`GET /api/v1/funcionarios/{id}/dossie`).
3. Comparar estrutura de arquivos (lista de documentos por tipo).
4. Comparar metadados de cada documento (data emissão, número, observação).
5. Verificar que links S3 retornam arquivos íntegros (HTTP 200, tamanho > 0).

**Critério:** zero documento do legado ausente no novo para servidores da amostra validada.

### 11.5 Checklist de equivalência funcional por domínio

| Domínio            | Verificações de equivalência                                          | Status |
| ------------------ | --------------------------------------------------------------------- | ------ |
| Cadastro funcional | CPF/matrícula únicos; lifecycle do vínculo; historico de situação     | —      |
| Folha de pagamento | Valores de contracheque por verba; líquido; fórmulas SQL; incidências | —      |
| Previdenciário     | Regras de aposentadoria; simulação; SIPREV; recadastramento           | —      |
| Saúde / Perícia    | Transições de status; dias concedidos; réplica multi-matrícula        | —      |
| Recrutamento       | States do pipeline; notificações; ciclo de estágio                    | —      |
| Autorização        | Menus por papel; ações por módulo; feature flags                      | —      |
| Portal do Servidor | Contracheque, recadastramento, autenticação Gov.br                    | —      |

> A coluna **Status** é preenchida durante a execução da homologação (ver §9) e deve atingir **100 % APROVADO** antes do go-live.

### 11.6 Inventário de mensagens de validação legadas

Com base no levantamento do documento `60-validacoes-testes-edge-cases-locais.md`, as mensagens de validação abaixo **devem ser reproduzidas** exatamente pelo novo sistema (texto pode ser parametrizado por i18n, mas semântica idêntica):

| Contexto                                     | Mensagem legada                                                                             | Reproduzida no novo? |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| Perícia — servidor inativo                   | "Funcionário não se encontra em exercício!"                                                 | —                    |
| Progressão — cancelamento sem justificativa  | "Informe a justificativa do cancelamento!"                                                  | —                    |
| Situação funcional — sem ativo parametrizado | "Necessário cadastrar nas situações funcionais uma situação que indique funcionário ativo." | —                    |
| Competência — folha não encontrada           | `ResourceNotFoundException("Competência", "Período", ...)` → HTTP 404 RFC 7807              | —                    |
| Consignado — operação inválida               | Operação deve ser `I`, `A` ou `F`                                                           | —                    |
| Consignado — duplicidade CPF/matrícula       | Erro por movimento, retornado ao operador                                                   | —                    |
| Paginação inválida                           | Erro padronizado `validatePageNumberAndSize`                                                | —                    |

---

## Apêndice A — Glossário de termos de teste

| Termo                  | Definição                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Golden scenario**    | Cenário de negócio end-to-end com resultado esperado determinístico, derivado da matriz funcional do legado |
| **Shadow mode**        | Execução paralela do motor novo sem expor resultado ao usuário, apenas para comparação                      |
| **Fixture**            | Conjunto de dados pré-carregados no banco para tornar testes reproduzíveis                                  |
| **Factory**            | Função que gera objetos de domínio com valores padrão substituíveis (inspirada em factory-bot do Ruby)      |
| **Flakiness**          | Taxa de testes que falham intermitentemente sem mudança de código                                           |
| **Cutover**            | Momento de substituição do motor legado pelo novo como resultado oficial                                    |
| **Gate**               | Critério obrigatório que bloqueia o avanço no pipeline se não for satisfeito                                |
| **Tolerância decimal** | Diferença absoluta aceita em valores monetários (R$ 0,02) por arredondamento ABNT                           |
| **RLS**                | Row-Level Security do PostgreSQL; impede vazamento de dados entre tenants                                   |
| **Pact**               | Framework de contract testing baseado em consumer-driven contracts                                          |

---

## Apêndice B — Mapa de dependências de testes

```mermaid
graph TD
    CAT[Seed de catálogos\n§5.3]
    TENANT[Fixture de tenant T1\n§5.2]
    PESSOA[Factory Pessoa\n§5.1]
    FUNC[Factory Funcionário]
    COMP[Factory Competência]
    FOLHA[Factory Folha]

    CAT --> TENANT
    TENANT --> PESSOA
    PESSOA --> FUNC
    FUNC --> COMP
    COMP --> FOLHA
    FUNC --> GS_A[GS-A\nAdmissão]
    FOLHA --> GS_A
    FOLHA --> GS_B[GS-B\nRetroativo]
    FUNC --> GS_C[GS-C\nRescisão]
    FOLHA --> GS_C
    FUNC --> GS_D[GS-D\nAposentadoria]
    TENANT --> GS_E[GS-E\nRecadastramento]
    FUNC --> GS_F[GS-F\nPerícia]
    TENANT --> GS_G[GS-G\nRecrutamento]
```

---

_Fim do documento. Versão 1.0 — 2026-04-21._
