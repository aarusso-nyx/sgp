# Modelo de Autenticação e Autorização

**Versão:** 1.0 | **Data:** 2026-04-21 | **Status:** Draft
**Escopo:** `auth`, `tenant`, cross-cutting | **Depende de:** BRIEF.md, 31-autorizacao-menu-e-capacidades-funcionais.md, 57-autorizacao-estatica-completa.md.

---

## 1. Visão Geral

### 1.1 Princípios

O modelo de segurança do SGP é construído sobre quatro princípios inegociáveis:

| Princípio                     | Descrição                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zero Trust entre serviços** | Nenhum serviço interno confia em outro por omissão. Todo token é verificado a cada chamada; não há "rede interna segura" implícita.                                            |
| **Least Privilege**           | Cada usuário, papel ou cliente de API recebe exclusivamente os escopos necessários para sua função. Papéis nunca são concedidos por conveniência operacional.                  |
| **Defense in Depth**          | A autorização é verificada em três camadas independentes: borda (API Gateway / WAF), aplicação NestJS (Guards), banco de dados (RLS). Uma falha em uma camada não expõe dados. |
| **Auditabilidade**            | Toda concessão, revogação, login, logout e falha de autorização gera registro imutável em `audit_log`. Não existem ações privilegiadas silenciosas.                            |

### 1.2 Camadas de Segurança

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cliente SPA / Portal / API Externa                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────────┐
│  AWS API Gateway + WAF                                              │
│  (rate-limit, geo-block, OWASP managed rules)                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Bearer / Cookie
┌──────────────────────────▼──────────────────────────────────────────┐
│  AUTENTICAÇÃO — AWS Cognito UserPool                                │
│  Authorization Code + PKCE (SPA)  |  Client Credentials (sistema)  │
│  Gov.br OIDC (fase 2)                                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ JWT verificado
┌──────────────────────────▼──────────────────────────────────────────┐
│  AUTORIZAÇÃO — NestJS APP_GUARD global                              │
│  PermissionGuard → JWT Cognito → @RequirePermission/default-deny    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ tenant_id + papeis
┌──────────────────────────▼──────────────────────────────────────────┐
│  MULTI-TENANCY — PostgreSQL RLS                                     │
│  SET app.current_tenant_id  →  USING (tenant_id = current_setting) │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ dados filtrados
┌──────────────────────────▼──────────────────────────────────────────┐
│  AUDITORIA — audit_log (domínio = AUTH + domínios sensíveis)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Autenticação

### 2.1 AWS Cognito UserPool

O SGP utiliza um **UserPool Cognito por tenant** (ou um UserPool compartilhado com App Client por tenant, a definir em ADR). As configurações obrigatórias estão em `ParametroSistema.cognito_user_pool_id` e `ParametroSistema.cognito_app_client_id`.

#### Fluxos suportados

| Fluxo                     | Aplicação                                  | Grant Type           |
| ------------------------- | ------------------------------------------ | -------------------- |
| Authorization Code + PKCE | `sgp-admin` SPA, `sgp-portal` SPA          | `authorization_code` |
| Client Credentials        | Sistemas externos, microsserviços internos | `client_credentials` |
| Refresh Token             | Renovação silenciosa (ambos os SPAs)       | `refresh_token`      |

#### Tokens emitidos (OIDC)

| Token                     | Vida útil | Uso                                                                                                                                                                                                 |
| ------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID Token** (JWT)        | 1 h       | Identidade do usuário; contém claims OIDC (`sub`, `email`, `name`) + claims customizadas (`custom:tenant_id`, `custom:roles`).                                                                      |
| **Access Token** (JWT)    | 1 h       | Apresentado no header `Authorization: Bearer` para o backend. Contém escopos OAuth2 e claim obrigatória `custom:tenant_id` (fallback aceito apenas para `tenant_id` em compatibilidade controlada). |
| **Refresh Token** (opaco) | 30 dias   | Troca por novo Access + ID Token via endpoint `/oauth2/token`. Revogável.                                                                                                                           |

#### Claims customizadas do Access Token

```jsonc
{
  "sub": "uuid-cognito",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/<pool-id>",
  "aud": "<app-client-id>",
  "token_use": "access",
  "scope": "openid email profile",
  "custom:tenant_id": "uuid-do-tenant",
  "custom:roles": "ROLE_FUNCIONARIO_VISUALIZAR,ROLE_FOLHA_DE_PGT_GESTAO",
  "exp": 1714000000,
  "iat": 1713996400,
}
```

> A claim `custom:roles` é populada por um **Lambda Trigger Pre Token Generation** que consulta `usuario.papeis_cache` no banco do tenant e injeta os papéis serializados. Isso mantém o JWT como fonte de verdade para o runtime, evitando round-trips ao banco em cada request.

### 2.2 MFA

| Papel / Perfil                                                | Política MFA                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ROLE_ADMIN`, `ADMIN_TENANT`, `GESTOR_FOLHA`, `ADMIN_SISTEMA` | **TOTP obrigatório** (Google Authenticator, Authy). Cognito bloqueia login sem MFA configurado. |
| Demais usuários administrativos                               | SMS OTP opcional (habilitado por feature flag `MFA_REQUIRED`).                                  |
| `SERVIDOR_PORTAL`, `PENSIONISTA_PORTAL`, `CANDIDATO_PORTAL`   | MFA não obrigatório por padrão; pode ser habilitado pelo tenant.                                |
| Client Credentials (sistemas externos)                        | MFA não aplicável.                                                                              |

A feature flag `MFA_REQUIRED=true` eleva a exigência para todos os usuários do tenant.

### 2.3 Gov.br (Fase 2)

Quando `GOV_BR_SSO_ENABLED=true`, o Cognito é configurado como **Relying Party** de um Identity Provider OIDC externo (Gov.br).

```
Usuário → SGP → Cognito → [Federated IdP: Gov.br] → redirect → Cognito → SGP
```

Atributos Gov.br mapeados para claims Cognito:

| Atributo Gov.br                    | Claim SGP             |
| ---------------------------------- | --------------------- |
| `sub` (CPF hash)                   | `custom:gov_br_sub`   |
| `nivel_acesso` (Bronze/Prata/Ouro) | `custom:gov_br_nivel` |
| `name`                             | `name`                |
| `email`                            | `email`               |

A feature flag `GOV_BR_NIVEL_MINIMO` define o nível mínimo aceito por contexto (ex.: `PRATA` para recadastramento, `OURO` para prova de vida via `PROVA_VIDA_PUBLIC_API_ENABLED`).

### 2.4 Sessão e Cookies

#### SPA (sgp-admin / sgp-portal)

```
Set-Cookie: sgp_access_token=<jwt>; HttpOnly; SameSite=Strict; Secure; Path=/api
Set-Cookie: sgp_refresh_token=<opaque>; HttpOnly; SameSite=Strict; Secure; Path=/api/v1/auth/refresh
```

- O `Access Token` é armazenado em cookie **HttpOnly + SameSite=Strict**, protegendo contra XSS e CSRF.
- O Angular **não** acessa o token via JavaScript; o cookie é enviado automaticamente pelo browser.
- Um interceptor Angular (`CsrfInterceptor`) adiciona o header `X-XSRF-TOKEN` em mutações (POST/PUT/PATCH/DELETE).

#### APIs Externas

Clientes externos usam `Authorization: Bearer <access_token>` no header HTTP. Sem cookies.

### 2.5 Renovação e Revogação de Sessão

**Renovação silenciosa:**

```typescript
// auth.worker.ts (Web Worker no sgp-admin)
setInterval(
  async () => {
    const resp = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // envia cookie refresh_token
    });
    // backend gira novo access_token no cookie; não expõe ao JS
  },
  50 * 60 * 1000,
); // 50 minutos (antes do exp de 1h)
```

**Revogação:**

```http
POST /api/v1/auth/logout
```

O backend chama `CognitoIdentityProvider.revokeToken(refreshToken)` e limpa os cookies com `Max-Age=0`.

---

## 3. Multi-Tenancy

### 3.1 Identificação do Tenant

O `tenant_id` é um UUID presente:

1. Na claim `custom:tenant_id` do Access Token JWT.
2. Em **todas** as tabelas de negócio do banco (`tenant_id UUID NOT NULL`).
3. Na variável de sessão Postgres `app.current_tenant_id`.

### 3.2 TenantGuard (NestJS)

```typescript
// tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = request.user as JwtPayload; // populado pelo AuthGuard

    const tenantId = payload['custom:tenant_id'];
    if (!tenantId) {
      throw new UnauthorizedException('tenant_id ausente no token');
    }

    request['tenantId'] = tenantId;
    return true;
  }
}
```

### 3.3 Interceptor de Sessão Postgres

```typescript
// tenant-session.interceptor.ts
@Injectable()
export class TenantSessionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const tenantId: string = request['tenantId'];

    // Garante que cada request usa uma conexão com tenant_id configurado
    await this.dataSource.query(`SET app.current_tenant_id = $1`, [tenantId]);

    return next.handle().pipe(
      finalize(async () => {
        // Reseta ao devolver a conexão ao pool
        await this.dataSource.query(`RESET app.current_tenant_id`);
      }),
    );
  }
}
```

### 3.4 Row-Level Security (Postgres)

Política aplicada a **todas** as tabelas de negócio:

```sql
-- Habilitar RLS na tabela
ALTER TABLE funcionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionario FORCE ROW LEVEL SECURITY;

-- Política de isolamento por tenant
CREATE POLICY tenant_isolation ON funcionario
  AS PERMISSIVE
  FOR ALL
  TO sgp_app_role   -- role usada pela aplicação (sem BYPASSRLS)
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

> O usuário de banco `sgp_app_role` **nunca** tem `BYPASSRLS`. Apenas o role de migração (`sgp_migration_role`) e o superusuário têm. Isso garante que nem mesmo bugs no código da aplicação permitem acesso cross-tenant.

Cobertura XCUT-03: toda tabela física com `tenant_id` em `public`, `hr`,
`payroll` e `payroll_calc` deve estar com `ENABLE ROW LEVEL SECURITY` e
`FORCE ROW LEVEL SECURITY`. Os catálogos globais sem `tenant_id` permanecem
fora desse conjunto: `public.permission` e `public.profile_permission`.
`hr.employee_dependent` usa política dedicada com
`rh.employee.read|rh.employee.write`, e `payroll_calc.formula_cache` possui
`tenant_id` materializado e política dedicada com
`folha.calc.read|folha.calc.write`, inclusive para impedir leitura de cache por
funções de cálculo executadas com contexto de tenant incorreto.

Regra de integridade: toda tabela tenant-scoped deve declarar FK de
`tenant_id` para `public.tenant(id)` com `ON DELETE RESTRICT`. Linhas com
`tenant_id` órfão são rejeitadas no banco antes de qualquer regra de aplicação.

**Verificação de saúde (smoke test de RLS):**

```sql
-- Deve retornar 0 linhas se RLS estiver correto
SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'; -- tenant inexistente
SELECT count(*) FROM funcionario; -- esperado: 0
RESET app.current_tenant_id;
```

---

## 4. Modelo RBAC

### 4.0 Catálogo canônico XCUT-05

O catálogo canônico de permissões é `database/seed/permission-catalog.json`; o arquivo TypeScript consumido pelo backend é gerado por `scripts/gen-permissions.ts` e não é editado manualmente. As chaves usam formato `dominio.acao`, sem catálogo paralelo em TS.

| Permissão              | Uso                                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| `auth.read`            | Sessão autenticada, menus e aliases de sessão do portal                         |
| `iam.read`             | Leitura do catálogo de permissões                                               |
| `gestao.read`          | Leitura de administração, segurança, parâmetros, usuários, perfis e master data |
| `gestao.write`         | Mutação de administração, segurança, parâmetros, usuários, perfis e master data |
| `rh.read`              | Leitura de dossiê, cadastro e fluxos de RH                                      |
| `rh.write`             | Mutação de dossiê, cadastro e fluxos de RH                                      |
| `folha.read`           | Leitura de folha, cálculo, contabilidade de folha e eSocial de folha            |
| `folha.write`          | Mutação de folha, cálculo, contabilidade de folha e eSocial de folha            |
| `avaliacao.read`       | Leitura de avaliação e progressão                                               |
| `avaliacao.write`      | Mutação de avaliação e progressão                                               |
| `consultas.read`       | Consultas gerenciais                                                            |
| `previdenciario.read`  | Leitura previdenciária                                                          |
| `previdenciario.write` | Mutação previdenciária                                                          |
| `recrutamento.read`    | Leitura de recrutamento                                                         |
| `recrutamento.write`   | Mutação de recrutamento                                                         |
| `saude.read`           | Leitura de saúde ocupacional e perícia                                          |
| `saude.write`          | Mutação de saúde ocupacional e perícia                                          |
| `convenio.read`        | Leitura de convênios                                                            |
| `convenio.write`       | Mutação de convênios                                                            |
| `relatorio.read`       | Catálogo e status de relatórios                                                 |
| `relatorio.generate`   | Geração e enfileiramento de relatórios                                          |
| `documents.upload`     | Sessões de upload de documentos                                                 |
| `documents.register`   | Confirmação e registro de anexos                                                |
| `documents.download`   | Download de anexos                                                              |
| `auditoria.read`       | Trilha de auditoria e exportações                                               |

O backend registra `PermissionGuard` como `APP_GUARD` nos módulos `AppModule` e `AppPortalModule`. Toda rota é negada por padrão quando não possui `@RequirePermission(...)`; endpoints públicos precisam declarar `@Public()` explicitamente. O guard valida o bearer token Cognito, resolve grupos Cognito contra `public.access_profile`/`public.profile_permission`/`public.permission` com cache curto e propaga `tenant_id` e permissões ao contexto de banco usado pelas políticas RLS.

### 4.1 Quatro Camadas

```
Tenant
  └─ Perfil  (agrupador administrativo; governa e replica papéis)
       └─ Papel  (capacidade autorizada: ROLE_<MODULO>_<ACAO>)
            └─ Usuário  (sujeito final; herda papéis via perfis e/ou diretamente)
```

**Perfil é unidade de governança; Papel é unidade de autorização; `usuario.papeis_cache` é o que o runtime usa.**

### 4.2 Modelo Físico

```sql
-- Usuário autenticável
CREATE TABLE usuario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenant(id),
  cognito_sub   TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  papeis_cache  TEXT[] NOT NULL DEFAULT '{}', -- cache desnormalizado p/ JWT trigger
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- Perfil (agrupador de papéis)
CREATE TABLE perfil (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  sistema     BOOLEAN NOT NULL DEFAULT false, -- seed imutável se true
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

-- Papel (capacidade autorizada)
CREATE TABLE papel (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  nome        TEXT NOT NULL,  -- ex.: ROLE_FUNCIONARIO_VISUALIZAR
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

-- Menu (item de navegação)
CREATE TABLE menu (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  nome        TEXT NOT NULL,
  nome_ascii  TEXT NOT NULL,
  categoria   TEXT NOT NULL,  -- MenuCategoriaEnum
  url         TEXT NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  ordem       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Associações
CREATE TABLE usuario_perfil (
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  perfil_id   UUID NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
  concedido_por UUID REFERENCES usuario(id),
  concedido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, perfil_id)
);

CREATE TABLE perfil_papel (
  perfil_id   UUID NOT NULL REFERENCES perfil(id) ON DELETE CASCADE,
  papel_id    UUID NOT NULL REFERENCES papel(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, papel_id)
);

CREATE TABLE papel_menu (
  papel_id    UUID NOT NULL REFERENCES papel(id) ON DELETE CASCADE,
  menu_id     UUID NOT NULL REFERENCES menu(id) ON DELETE CASCADE,
  PRIMARY KEY (papel_id, menu_id)
);

CREATE TABLE usuario_papel_direto (
  usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  papel_id    UUID NOT NULL REFERENCES papel(id) ON DELETE CASCADE,
  concedido_por UUID REFERENCES usuario(id),
  concedido_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, papel_id)
);
```

### 4.3 Cache de Papéis (`papeis_cache`)

O campo `usuario.papeis_cache TEXT[]` é atualizado por trigger sempre que `perfil_papel`, `usuario_perfil` ou `usuario_papel_direto` sofrerem INSERT/UPDATE/DELETE:

```sql
CREATE OR REPLACE FUNCTION fn_rebuild_papeis_cache()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- Identifica o usuário afetado (dependendo da tabela origem)
  v_usuario_id := COALESCE(NEW.usuario_id, OLD.usuario_id);

  UPDATE usuario
  SET papeis_cache = (
    SELECT array_agg(DISTINCT p.nome ORDER BY p.nome)
    FROM papel p
    WHERE p.id IN (
      -- Papéis diretos
      SELECT papel_id FROM usuario_papel_direto WHERE usuario_id = v_usuario_id
      UNION
      -- Papéis via perfis
      SELECT pp.papel_id
      FROM usuario_perfil up
      JOIN perfil_papel pp ON pp.perfil_id = up.perfil_id
      WHERE up.usuario_id = v_usuario_id
    )
  )
  WHERE id = v_usuario_id;

  RETURN NULL;
END;
$$;
```

O Lambda **Pre Token Generation** do Cognito consulta `papeis_cache` para injetar a claim `custom:roles` no JWT — leitura O(1) por índice primário.

---

## 5. Convenção de Papéis

### 5.1 Formato canônico

```
ROLE_<MODULO>_<ACAO>
```

- `MODULO`: nome em maiúsculas do módulo funcional (ex.: `FUNCIONARIO`, `FOLHA_DE_PGT`).
- `ACAO` ∈ `{VISUALIZAR, CADASTRAR, ATUALIZAR, EXCLUIR, GESTAO}`.

### 5.2 Hierarquia de ações

| Papel detido          | Implica (frontend + backend)                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ROLE_<M>_GESTAO`     | Todas as ações do módulo (visualizar, cadastrar, atualizar, excluir, operar processos). Substitui todos os demais. |
| `ROLE_<M>_EXCLUIR`    | Excluir + atualizar + cadastrar + visualizar.                                                                      |
| `ROLE_<M>_ATUALIZAR`  | Atualizar + visualizar.                                                                                            |
| `ROLE_<M>_CADASTRAR`  | Cadastrar + visualizar.                                                                                            |
| `ROLE_<M>_VISUALIZAR` | Somente consulta/leitura; tela abre em modo detalhe sem botões de edição.                                          |

> `ROLE_ADMIN` (papel especial do tenant) implica todas as ações de todos os módulos do tenant, equivalente a `GESTAO` em tudo.

### 5.3 Módulos com autorização simplificada (somente GESTAO)

Os módulos a seguir não possuem granularidade CRUD; a única ação disponível é `GESTAO`:
`FOLHA_DE_PGT`, `RECADASTRAMENTO`, `PERICIA_MEDICA`, `AGENDA_MEDICA`, `ESPECIALIDADE_MEDICA`, `MEDICO`, `ARQUIVO_REMESSA`, `ARQUIVO_EXPORTACAO_SIPREV`, `DIRF`, `RELATORIO_FOLHA_PAGAMENTO`, `RELATORIO_BATIMENTO_FOLHA`, `RELATORIO_VERBAS`, `RELATORIO_PROVENTOS_DESCONTOS`, `RELATORIO_REPASSE_FUNDO_RH`, `RELATORIO_APOSENTADO_PENSAO`, `RELATORIO_SERV_PAG_BLOQUEADO`, `RELATORIO_GERENCIAL`, `AUDITORIA`.

---

## 6. Módulos — Papéis Completos

A tabela abaixo lista todos os módulos do SGP com os papéis disponíveis. Coluna **Tipo** indica se o módulo possui CRUD granular (`CRUD`) ou apenas gestão integral (`GESTAO`).

| Módulo                        | Tipo   | Papéis disponíveis                                                                                                                                                                                                                    |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH                          | CRUD   | `ROLE_AUTH_VISUALIZAR`, `ROLE_AUTH_CADASTRAR`, `ROLE_AUTH_ATUALIZAR`, `ROLE_AUTH_EXCLUIR`, `ROLE_AUTH_GESTAO`                                                                                                                         |
| TENANT                        | CRUD   | `ROLE_TENANT_VISUALIZAR`, `ROLE_TENANT_CADASTRAR`, `ROLE_TENANT_ATUALIZAR`, `ROLE_TENANT_EXCLUIR`, `ROLE_TENANT_GESTAO`                                                                                                               |
| USUARIO                       | CRUD   | `ROLE_USUARIO_VISUALIZAR`, `ROLE_USUARIO_CADASTRAR`, `ROLE_USUARIO_ATUALIZAR`, `ROLE_USUARIO_EXCLUIR`, `ROLE_USUARIO_GESTAO`                                                                                                          |
| PERFIL                        | CRUD   | `ROLE_PERFIL_VISUALIZAR`, `ROLE_PERFIL_CADASTRAR`, `ROLE_PERFIL_ATUALIZAR`, `ROLE_PERFIL_EXCLUIR`, `ROLE_PERFIL_GESTAO`                                                                                                               |
| PAPEL                         | CRUD   | `ROLE_PAPEL_VISUALIZAR`, `ROLE_PAPEL_CADASTRAR`, `ROLE_PAPEL_ATUALIZAR`, `ROLE_PAPEL_EXCLUIR`, `ROLE_PAPEL_GESTAO`                                                                                                                    |
| MENU                          | CRUD   | `ROLE_MENU_VISUALIZAR`, `ROLE_MENU_CADASTRAR`, `ROLE_MENU_ATUALIZAR`, `ROLE_MENU_EXCLUIR`, `ROLE_MENU_GESTAO`                                                                                                                         |
| PARAMETRO_SISTEMA             | CRUD   | `ROLE_PARAMETRO_SISTEMA_VISUALIZAR`, `ROLE_PARAMETRO_SISTEMA_CADASTRAR`, `ROLE_PARAMETRO_SISTEMA_ATUALIZAR`, `ROLE_PARAMETRO_SISTEMA_EXCLUIR`, `ROLE_PARAMETRO_SISTEMA_GESTAO`                                                        |
| PARAMETRO_GLOBAL              | CRUD   | `ROLE_PARAMETRO_GLOBAL_VISUALIZAR`, `ROLE_PARAMETRO_GLOBAL_CADASTRAR`, `ROLE_PARAMETRO_GLOBAL_ATUALIZAR`, `ROLE_PARAMETRO_GLOBAL_EXCLUIR`, `ROLE_PARAMETRO_GLOBAL_GESTAO`                                                             |
| FEATURE_FLAG                  | CRUD   | `ROLE_FEATURE_FLAG_VISUALIZAR`, `ROLE_FEATURE_FLAG_CADASTRAR`, `ROLE_FEATURE_FLAG_ATUALIZAR`, `ROLE_FEATURE_FLAG_EXCLUIR`, `ROLE_FEATURE_FLAG_GESTAO`                                                                                 |
| AUDITORIA                     | GESTAO | `ROLE_AUDITORIA_GESTAO`                                                                                                                                                                                                               |
| ARQUIVO                       | CRUD   | `ROLE_ARQUIVO_VISUALIZAR`, `ROLE_ARQUIVO_CADASTRAR`, `ROLE_ARQUIVO_ATUALIZAR`, `ROLE_ARQUIVO_EXCLUIR`, `ROLE_ARQUIVO_GESTAO`                                                                                                          |
| NOTIFICACAO                   | CRUD   | `ROLE_NOTIFICACAO_VISUALIZAR`, `ROLE_NOTIFICACAO_CADASTRAR`, `ROLE_NOTIFICACAO_ATUALIZAR`, `ROLE_NOTIFICACAO_EXCLUIR`, `ROLE_NOTIFICACAO_GESTAO`                                                                                      |
| FUNCIONARIO                   | CRUD   | `ROLE_FUNCIONARIO_VISUALIZAR`, `ROLE_FUNCIONARIO_CADASTRAR`, `ROLE_FUNCIONARIO_ATUALIZAR`, `ROLE_FUNCIONARIO_EXCLUIR`, `ROLE_FUNCIONARIO_GESTAO`                                                                                      |
| VINCULO                       | CRUD   | `ROLE_VINCULO_VISUALIZAR`, `ROLE_VINCULO_CADASTRAR`, `ROLE_VINCULO_ATUALIZAR`, `ROLE_VINCULO_EXCLUIR`, `ROLE_VINCULO_GESTAO`                                                                                                          |
| POSSE_EFETIVO                 | CRUD   | `ROLE_POSSE_EFETIVO_VISUALIZAR`, `ROLE_POSSE_EFETIVO_CADASTRAR`, `ROLE_POSSE_EFETIVO_ATUALIZAR`, `ROLE_POSSE_EFETIVO_EXCLUIR`, `ROLE_POSSE_EFETIVO_GESTAO`                                                                            |
| POSSE_COMISSIONADO            | CRUD   | `ROLE_POSSE_COMISSIONADO_VISUALIZAR`, `ROLE_POSSE_COMISSIONADO_CADASTRAR`, `ROLE_POSSE_COMISSIONADO_ATUALIZAR`, `ROLE_POSSE_COMISSIONADO_EXCLUIR`, `ROLE_POSSE_COMISSIONADO_GESTAO`                                                   |
| POSSE_CONTRATADO              | CRUD   | `ROLE_POSSE_CONTRATADO_VISUALIZAR`, `ROLE_POSSE_CONTRATADO_CADASTRAR`, `ROLE_POSSE_CONTRATADO_ATUALIZAR`, `ROLE_POSSE_CONTRATADO_EXCLUIR`, `ROLE_POSSE_CONTRATADO_GESTAO`                                                             |
| SITUACAO_FUNCIONAL            | CRUD   | `ROLE_SITUACAO_FUNCIONAL_VISUALIZAR`, `ROLE_SITUACAO_FUNCIONAL_CADASTRAR`, `ROLE_SITUACAO_FUNCIONAL_ATUALIZAR`, `ROLE_SITUACAO_FUNCIONAL_EXCLUIR`, `ROLE_SITUACAO_FUNCIONAL_GESTAO`                                                   |
| TRANSFERENCIA                 | CRUD   | `ROLE_TRANSFERENCIA_VISUALIZAR`, `ROLE_TRANSFERENCIA_CADASTRAR`, `ROLE_TRANSFERENCIA_ATUALIZAR`, `ROLE_TRANSFERENCIA_EXCLUIR`, `ROLE_TRANSFERENCIA_GESTAO`                                                                            |
| DOSSIE                        | CRUD   | `ROLE_DOSSIE_VISUALIZAR`, `ROLE_DOSSIE_CADASTRAR`, `ROLE_DOSSIE_ATUALIZAR`, `ROLE_DOSSIE_EXCLUIR`, `ROLE_DOSSIE_GESTAO`                                                                                                               |
| DEPENDENTE                    | CRUD   | `ROLE_DEPENDENTE_VISUALIZAR`, `ROLE_DEPENDENTE_CADASTRAR`, `ROLE_DEPENDENTE_ATUALIZAR`, `ROLE_DEPENDENTE_EXCLUIR`, `ROLE_DEPENDENTE_GESTAO`                                                                                           |
| PENSAO_ALIMENTICIA            | CRUD   | `ROLE_PENSAO_ALIMENTICIA_VISUALIZAR`, `ROLE_PENSAO_ALIMENTICIA_CADASTRAR`, `ROLE_PENSAO_ALIMENTICIA_ATUALIZAR`, `ROLE_PENSAO_ALIMENTICIA_EXCLUIR`, `ROLE_PENSAO_ALIMENTICIA_GESTAO`                                                   |
| REEMBOLSO                     | CRUD   | `ROLE_REEMBOLSO_VISUALIZAR`, `ROLE_REEMBOLSO_CADASTRAR`, `ROLE_REEMBOLSO_ATUALIZAR`, `ROLE_REEMBOLSO_EXCLUIR`, `ROLE_REEMBOLSO_GESTAO`                                                                                                |
| DECISAO_JUDICIAL              | CRUD   | `ROLE_DECISAO_JUDICIAL_VISUALIZAR`, `ROLE_DECISAO_JUDICIAL_CADASTRAR`, `ROLE_DECISAO_JUDICIAL_ATUALIZAR`, `ROLE_DECISAO_JUDICIAL_EXCLUIR`, `ROLE_DECISAO_JUDICIAL_GESTAO`                                                             |
| BANCO                         | CRUD   | `ROLE_BANCO_VISUALIZAR`, `ROLE_BANCO_CADASTRAR`, `ROLE_BANCO_ATUALIZAR`, `ROLE_BANCO_EXCLUIR`, `ROLE_BANCO_GESTAO`                                                                                                                    |
| AGENCIA                       | CRUD   | `ROLE_AGENCIA_VISUALIZAR`, `ROLE_AGENCIA_CADASTRAR`, `ROLE_AGENCIA_ATUALIZAR`, `ROLE_AGENCIA_EXCLUIR`, `ROLE_AGENCIA_GESTAO`                                                                                                          |
| FILIAL                        | CRUD   | `ROLE_FILIAL_VISUALIZAR`, `ROLE_FILIAL_CADASTRAR`, `ROLE_FILIAL_ATUALIZAR`, `ROLE_FILIAL_EXCLUIR`, `ROLE_FILIAL_GESTAO`                                                                                                               |
| LOTACAO                       | CRUD   | `ROLE_LOTACAO_VISUALIZAR`, `ROLE_LOTACAO_CADASTRAR`, `ROLE_LOTACAO_ATUALIZAR`, `ROLE_LOTACAO_EXCLUIR`, `ROLE_LOTACAO_GESTAO`                                                                                                          |
| CENTRO_CUSTO                  | CRUD   | `ROLE_CENTRO_CUSTO_VISUALIZAR`, `ROLE_CENTRO_CUSTO_CADASTRAR`, `ROLE_CENTRO_CUSTO_ATUALIZAR`, `ROLE_CENTRO_CUSTO_EXCLUIR`, `ROLE_CENTRO_CUSTO_GESTAO`                                                                                 |
| CARGO                         | CRUD   | `ROLE_CARGO_VISUALIZAR`, `ROLE_CARGO_CADASTRAR`, `ROLE_CARGO_ATUALIZAR`, `ROLE_CARGO_EXCLUIR`, `ROLE_CARGO_GESTAO`                                                                                                                    |
| FUNCAO                        | CRUD   | `ROLE_FUNCAO_VISUALIZAR`, `ROLE_FUNCAO_CADASTRAR`, `ROLE_FUNCAO_ATUALIZAR`, `ROLE_FUNCAO_EXCLUIR`, `ROLE_FUNCAO_GESTAO`                                                                                                               |
| NIVEL_SALARIAL                | CRUD   | `ROLE_NIVEL_SALARIAL_VISUALIZAR`, `ROLE_NIVEL_SALARIAL_CADASTRAR`, `ROLE_NIVEL_SALARIAL_ATUALIZAR`, `ROLE_NIVEL_SALARIAL_EXCLUIR`, `ROLE_NIVEL_SALARIAL_GESTAO`                                                                       |
| REFERENCIA_SALARIAL           | CRUD   | `ROLE_REFERENCIA_SALARIAL_VISUALIZAR`, `ROLE_REFERENCIA_SALARIAL_CADASTRAR`, `ROLE_REFERENCIA_SALARIAL_ATUALIZAR`, `ROLE_REFERENCIA_SALARIAL_EXCLUIR`, `ROLE_REFERENCIA_SALARIAL_GESTAO`                                              |
| FAIXA_SALARIAL                | CRUD   | `ROLE_FAIXA_SALARIAL_VISUALIZAR`, `ROLE_FAIXA_SALARIAL_CADASTRAR`, `ROLE_FAIXA_SALARIAL_ATUALIZAR`, `ROLE_FAIXA_SALARIAL_EXCLUIR`, `ROLE_FAIXA_SALARIAL_GESTAO`                                                                       |
| GRUPO_SALARIAL                | CRUD   | `ROLE_GRUPO_SALARIAL_VISUALIZAR`, `ROLE_GRUPO_SALARIAL_CADASTRAR`, `ROLE_GRUPO_SALARIAL_ATUALIZAR`, `ROLE_GRUPO_SALARIAL_EXCLUIR`, `ROLE_GRUPO_SALARIAL_GESTAO`                                                                       |
| PLANO_CARGOS                  | CRUD   | `ROLE_PLANO_CARGOS_VISUALIZAR`, `ROLE_PLANO_CARGOS_CADASTRAR`, `ROLE_PLANO_CARGOS_ATUALIZAR`, `ROLE_PLANO_CARGOS_EXCLUIR`, `ROLE_PLANO_CARGOS_GESTAO`                                                                                 |
| CONVENIO                      | CRUD   | `ROLE_CONVENIO_VISUALIZAR`, `ROLE_CONVENIO_CADASTRAR`, `ROLE_CONVENIO_ATUALIZAR`, `ROLE_CONVENIO_EXCLUIR`, `ROLE_CONVENIO_GESTAO`                                                                                                     |
| SINDICATO                     | CRUD   | `ROLE_SINDICATO_VISUALIZAR`, `ROLE_SINDICATO_CADASTRAR`, `ROLE_SINDICATO_ATUALIZAR`, `ROLE_SINDICATO_EXCLUIR`, `ROLE_SINDICATO_GESTAO`                                                                                                |
| TURNO                         | CRUD   | `ROLE_TURNO_VISUALIZAR`, `ROLE_TURNO_CADASTRAR`, `ROLE_TURNO_ATUALIZAR`, `ROLE_TURNO_EXCLUIR`, `ROLE_TURNO_GESTAO`                                                                                                                    |
| JORNADA                       | CRUD   | `ROLE_JORNADA_VISUALIZAR`, `ROLE_JORNADA_CADASTRAR`, `ROLE_JORNADA_ATUALIZAR`, `ROLE_JORNADA_EXCLUIR`, `ROLE_JORNADA_GESTAO`                                                                                                          |
| COMPETENCIA                   | CRUD   | `ROLE_COMPETENCIA_VISUALIZAR`, `ROLE_COMPETENCIA_CADASTRAR`, `ROLE_COMPETENCIA_ATUALIZAR`, `ROLE_COMPETENCIA_EXCLUIR`, `ROLE_COMPETENCIA_GESTAO`                                                                                      |
| FOLHA_DE_PGT                  | GESTAO | `ROLE_FOLHA_DE_PGT_GESTAO`                                                                                                                                                                                                            |
| CONTRACHEQUE                  | CRUD   | `ROLE_CONTRACHEQUE_VISUALIZAR`, `ROLE_CONTRACHEQUE_CADASTRAR`, `ROLE_CONTRACHEQUE_ATUALIZAR`, `ROLE_CONTRACHEQUE_EXCLUIR`, `ROLE_CONTRACHEQUE_GESTAO`                                                                                 |
| LANCAMENTO                    | CRUD   | `ROLE_LANCAMENTO_VISUALIZAR`, `ROLE_LANCAMENTO_CADASTRAR`, `ROLE_LANCAMENTO_ATUALIZAR`, `ROLE_LANCAMENTO_EXCLUIR`, `ROLE_LANCAMENTO_GESTAO`                                                                                           |
| VERBA                         | CRUD   | `ROLE_VERBA_VISUALIZAR`, `ROLE_VERBA_CADASTRAR`, `ROLE_VERBA_ATUALIZAR`, `ROLE_VERBA_EXCLUIR`, `ROLE_VERBA_GESTAO`                                                                                                                    |
| FORMULA                       | CRUD   | `ROLE_FORMULA_VISUALIZAR`, `ROLE_FORMULA_CADASTRAR`, `ROLE_FORMULA_ATUALIZAR`, `ROLE_FORMULA_EXCLUIR`, `ROLE_FORMULA_GESTAO`                                                                                                          |
| ALIQUOTA                      | CRUD   | `ROLE_ALIQUOTA_VISUALIZAR`, `ROLE_ALIQUOTA_CADASTRAR`, `ROLE_ALIQUOTA_ATUALIZAR`, `ROLE_ALIQUOTA_EXCLUIR`, `ROLE_ALIQUOTA_GESTAO`                                                                                                     |
| FUNCIONARIO_VERBA             | CRUD   | `ROLE_FUNCIONARIO_VERBA_VISUALIZAR`, `ROLE_FUNCIONARIO_VERBA_CADASTRAR`, `ROLE_FUNCIONARIO_VERBA_ATUALIZAR`, `ROLE_FUNCIONARIO_VERBA_EXCLUIR`, `ROLE_FUNCIONARIO_VERBA_GESTAO`                                                        |
| IMPORTADOR_VERBA_SERVIDOR     | CRUD   | `ROLE_IMPORTADOR_VERBA_SERVIDOR_VISUALIZAR`, `ROLE_IMPORTADOR_VERBA_SERVIDOR_CADASTRAR`, `ROLE_IMPORTADOR_VERBA_SERVIDOR_ATUALIZAR`, `ROLE_IMPORTADOR_VERBA_SERVIDOR_EXCLUIR`, `ROLE_IMPORTADOR_VERBA_SERVIDOR_GESTAO`                |
| IMPORTADOR_VERBA_PENSIONISTA  | CRUD   | `ROLE_IMPORTADOR_VERBA_PENSIONISTA_VISUALIZAR`, `ROLE_IMPORTADOR_VERBA_PENSIONISTA_CADASTRAR`, `ROLE_IMPORTADOR_VERBA_PENSIONISTA_ATUALIZAR`, `ROLE_IMPORTADOR_VERBA_PENSIONISTA_EXCLUIR`, `ROLE_IMPORTADOR_VERBA_PENSIONISTA_GESTAO` |
| IMPORTADOR_LANCAMENTO_MANUAL  | CRUD   | `ROLE_IMPORTADOR_LANCAMENTO_MANUAL_VISUALIZAR`, `ROLE_IMPORTADOR_LANCAMENTO_MANUAL_CADASTRAR`, `ROLE_IMPORTADOR_LANCAMENTO_MANUAL_ATUALIZAR`, `ROLE_IMPORTADOR_LANCAMENTO_MANUAL_EXCLUIR`, `ROLE_IMPORTADOR_LANCAMENTO_MANUAL_GESTAO` |
| IMPORTACAO_CONSIGNADO         | CRUD   | `ROLE_IMPORTACAO_CONSIGNADO_VISUALIZAR`, `ROLE_IMPORTACAO_CONSIGNADO_CADASTRAR`, `ROLE_IMPORTACAO_CONSIGNADO_ATUALIZAR`, `ROLE_IMPORTACAO_CONSIGNADO_EXCLUIR`, `ROLE_IMPORTACAO_CONSIGNADO_GESTAO`                                    |
| CONSIGNADO                    | CRUD   | `ROLE_CONSIGNADO_VISUALIZAR`, `ROLE_CONSIGNADO_CADASTRAR`, `ROLE_CONSIGNADO_ATUALIZAR`, `ROLE_CONSIGNADO_EXCLUIR`, `ROLE_CONSIGNADO_GESTAO`                                                                                           |
| LOTE_PROCESSAMENTO            | CRUD   | `ROLE_LOTE_PROCESSAMENTO_VISUALIZAR`, `ROLE_LOTE_PROCESSAMENTO_CADASTRAR`, `ROLE_LOTE_PROCESSAMENTO_ATUALIZAR`, `ROLE_LOTE_PROCESSAMENTO_EXCLUIR`, `ROLE_LOTE_PROCESSAMENTO_GESTAO`                                                   |
| RELATORIO_FINANCEIRO          | CRUD   | `ROLE_RELATORIO_FINANCEIRO_VISUALIZAR`, `ROLE_RELATORIO_FINANCEIRO_CADASTRAR`, `ROLE_RELATORIO_FINANCEIRO_ATUALIZAR`, `ROLE_RELATORIO_FINANCEIRO_EXCLUIR`, `ROLE_RELATORIO_FINANCEIRO_GESTAO`                                         |
| RELATORIO_FOLHA_PAGAMENTO     | GESTAO | `ROLE_RELATORIO_FOLHA_PAGAMENTO_GESTAO`                                                                                                                                                                                               |
| RELATORIO_BATIMENTO_FOLHA     | GESTAO | `ROLE_RELATORIO_BATIMENTO_FOLHA_GESTAO`                                                                                                                                                                                               |
| RELATORIO_VERBAS              | GESTAO | `ROLE_RELATORIO_VERBAS_GESTAO`                                                                                                                                                                                                        |
| RELATORIO_PROVENTOS_DESCONTOS | GESTAO | `ROLE_RELATORIO_PROVENTOS_DESCONTOS_GESTAO`                                                                                                                                                                                           |
| RELATORIO_REPASSE_FUNDO_RH    | GESTAO | `ROLE_RELATORIO_REPASSE_FUNDO_RH_GESTAO`                                                                                                                                                                                              |
| RELATORIO_APOSENTADO_PENSAO   | GESTAO | `ROLE_RELATORIO_APOSENTADO_PENSAO_GESTAO`                                                                                                                                                                                             |
| RELATORIO_SERV_PAG_BLOQUEADO  | GESTAO | `ROLE_RELATORIO_SERV_PAG_BLOQUEADO_GESTAO`                                                                                                                                                                                            |
| RELATORIO_GERENCIAL           | GESTAO | `ROLE_RELATORIO_GERENCIAL_GESTAO`                                                                                                                                                                                                     |
| DIRF                          | GESTAO | `ROLE_DIRF_GESTAO`                                                                                                                                                                                                                    |
| ARQUIVO_REMESSA               | GESTAO | `ROLE_ARQUIVO_REMESSA_GESTAO`                                                                                                                                                                                                         |
| ARQUIVO_EXPORTACAO_SIPREV     | GESTAO | `ROLE_ARQUIVO_EXPORTACAO_SIPREV_GESTAO`                                                                                                                                                                                               |
| SEFIP                         | CRUD   | `ROLE_SEFIP_VISUALIZAR`, `ROLE_SEFIP_CADASTRAR`, `ROLE_SEFIP_ATUALIZAR`, `ROLE_SEFIP_EXCLUIR`, `ROLE_SEFIP_GESTAO`                                                                                                                    |
| AVALIACAO_DESEMPENHO          | CRUD   | `ROLE_AVALIACAO_DESEMPENHO_VISUALIZAR`, `ROLE_AVALIACAO_DESEMPENHO_CADASTRAR`, `ROLE_AVALIACAO_DESEMPENHO_ATUALIZAR`, `ROLE_AVALIACAO_DESEMPENHO_EXCLUIR`, `ROLE_AVALIACAO_DESEMPENHO_GESTAO`                                         |
| PROGRESSAO                    | CRUD   | `ROLE_PROGRESSAO_VISUALIZAR`, `ROLE_PROGRESSAO_CADASTRAR`, `ROLE_PROGRESSAO_ATUALIZAR`, `ROLE_PROGRESSAO_EXCLUIR`, `ROLE_PROGRESSAO_GESTAO`                                                                                           |
| REQUISICAO_DE_PESSOAL         | CRUD   | `ROLE_REQUISICAO_DE_PESSOAL_VISUALIZAR`, `ROLE_REQUISICAO_DE_PESSOAL_CADASTRAR`, `ROLE_REQUISICAO_DE_PESSOAL_ATUALIZAR`, `ROLE_REQUISICAO_DE_PESSOAL_EXCLUIR`, `ROLE_REQUISICAO_DE_PESSOAL_GESTAO`                                    |
| BANCO_TALENTOS                | CRUD   | `ROLE_BANCO_TALENTOS_VISUALIZAR`, `ROLE_BANCO_TALENTOS_CADASTRAR`, `ROLE_BANCO_TALENTOS_ATUALIZAR`, `ROLE_BANCO_TALENTOS_EXCLUIR`, `ROLE_BANCO_TALENTOS_GESTAO`                                                                       |
| PROGRAMA_ESTAGIO              | CRUD   | `ROLE_PROGRAMA_ESTAGIO_VISUALIZAR`, `ROLE_PROGRAMA_ESTAGIO_CADASTRAR`, `ROLE_PROGRAMA_ESTAGIO_ATUALIZAR`, `ROLE_PROGRAMA_ESTAGIO_EXCLUIR`, `ROLE_PROGRAMA_ESTAGIO_GESTAO`                                                             |
| ESTAGIARIO                    | CRUD   | `ROLE_ESTAGIARIO_VISUALIZAR`, `ROLE_ESTAGIARIO_CADASTRAR`, `ROLE_ESTAGIARIO_ATUALIZAR`, `ROLE_ESTAGIARIO_EXCLUIR`, `ROLE_ESTAGIARIO_GESTAO`                                                                                           |
| REGRA_APOSENTADORIA           | CRUD   | `ROLE_REGRA_APOSENTADORIA_VISUALIZAR`, `ROLE_REGRA_APOSENTADORIA_CADASTRAR`, `ROLE_REGRA_APOSENTADORIA_ATUALIZAR`, `ROLE_REGRA_APOSENTADORIA_EXCLUIR`, `ROLE_REGRA_APOSENTADORIA_GESTAO`                                              |
| APOSENTADORIA                 | CRUD   | `ROLE_APOSENTADORIA_VISUALIZAR`, `ROLE_APOSENTADORIA_CADASTRAR`, `ROLE_APOSENTADORIA_ATUALIZAR`, `ROLE_APOSENTADORIA_EXCLUIR`, `ROLE_APOSENTADORIA_GESTAO`                                                                            |
| PENSAO                        | CRUD   | `ROLE_PENSAO_VISUALIZAR`, `ROLE_PENSAO_CADASTRAR`, `ROLE_PENSAO_ATUALIZAR`, `ROLE_PENSAO_EXCLUIR`, `ROLE_PENSAO_GESTAO`                                                                                                               |
| CERTIDAO_TEMPO_CONTRIBUICAO   | CRUD   | `ROLE_CERTIDAO_TEMPO_CONTRIBUICAO_VISUALIZAR`, `ROLE_CERTIDAO_TEMPO_CONTRIBUICAO_CADASTRAR`, `ROLE_CERTIDAO_TEMPO_CONTRIBUICAO_ATUALIZAR`, `ROLE_CERTIDAO_TEMPO_CONTRIBUICAO_EXCLUIR`, `ROLE_CERTIDAO_TEMPO_CONTRIBUICAO_GESTAO`      |
| COMPENSACAO_PREVIDENCIARIA    | CRUD   | `ROLE_COMPENSACAO_PREVIDENCIARIA_VISUALIZAR`, `ROLE_COMPENSACAO_PREVIDENCIARIA_CADASTRAR`, `ROLE_COMPENSACAO_PREVIDENCIARIA_ATUALIZAR`, `ROLE_COMPENSACAO_PREVIDENCIARIA_EXCLUIR`, `ROLE_COMPENSACAO_PREVIDENCIARIA_GESTAO`           |
| DECLARACAO_APOSENTADO         | CRUD   | `ROLE_DECLARACAO_APOSENTADO_VISUALIZAR`, `ROLE_DECLARACAO_APOSENTADO_CADASTRAR`, `ROLE_DECLARACAO_APOSENTADO_ATUALIZAR`, `ROLE_DECLARACAO_APOSENTADO_EXCLUIR`, `ROLE_DECLARACAO_APOSENTADO_GESTAO`                                    |
| RECADASTRAMENTO               | GESTAO | `ROLE_RECADASTRAMENTO_GESTAO`                                                                                                                                                                                                         |
| CAMPANHA_RECADASTRAMENTO      | CRUD   | `ROLE_CAMPANHA_RECADASTRAMENTO_VISUALIZAR`, `ROLE_CAMPANHA_RECADASTRAMENTO_CADASTRAR`, `ROLE_CAMPANHA_RECADASTRAMENTO_ATUALIZAR`, `ROLE_CAMPANHA_RECADASTRAMENTO_EXCLUIR`, `ROLE_CAMPANHA_RECADASTRAMENTO_GESTAO`                     |
| AGENDA_MEDICA                 | GESTAO | `ROLE_AGENDA_MEDICA_GESTAO`                                                                                                                                                                                                           |
| ESPECIALIDADE_MEDICA          | GESTAO | `ROLE_ESPECIALIDADE_MEDICA_GESTAO`                                                                                                                                                                                                    |
| MEDICO                        | GESTAO | `ROLE_MEDICO_GESTAO`                                                                                                                                                                                                                  |
| PERICIA_MEDICA                | GESTAO | `ROLE_PERICIA_MEDICA_GESTAO`                                                                                                                                                                                                          |
| LICENCA_MEDICA                | CRUD   | `ROLE_LICENCA_MEDICA_VISUALIZAR`, `ROLE_LICENCA_MEDICA_CADASTRAR`, `ROLE_LICENCA_MEDICA_ATUALIZAR`, `ROLE_LICENCA_MEDICA_EXCLUIR`, `ROLE_LICENCA_MEDICA_GESTAO`                                                                       |
| PROFISSIONAL_SAUDE            | CRUD   | `ROLE_PROFISSIONAL_SAUDE_VISUALIZAR`, `ROLE_PROFISSIONAL_SAUDE_CADASTRAR`, `ROLE_PROFISSIONAL_SAUDE_ATUALIZAR`, `ROLE_PROFISSIONAL_SAUDE_EXCLUIR`, `ROLE_PROFISSIONAL_SAUDE_GESTAO`                                                   |
| ACIDENTE_TRABALHO             | CRUD   | `ROLE_ACIDENTE_TRABALHO_VISUALIZAR`, `ROLE_ACIDENTE_TRABALHO_CADASTRAR`, `ROLE_ACIDENTE_TRABALHO_ATUALIZAR`, `ROLE_ACIDENTE_TRABALHO_EXCLUIR`, `ROLE_ACIDENTE_TRABALHO_GESTAO`                                                        |
| CID                           | CRUD   | `ROLE_CID_VISUALIZAR`, `ROLE_CID_CADASTRAR`, `ROLE_CID_ATUALIZAR`, `ROLE_CID_EXCLUIR`, `ROLE_CID_GESTAO`                                                                                                                              |
| RESTRICAO                     | CRUD   | `ROLE_RESTRICAO_VISUALIZAR`, `ROLE_RESTRICAO_CADASTRAR`, `ROLE_RESTRICAO_ATUALIZAR`, `ROLE_RESTRICAO_EXCLUIR`, `ROLE_RESTRICAO_GESTAO`                                                                                                |
| READAPTACAO                   | CRUD   | `ROLE_READAPTACAO_VISUALIZAR`, `ROLE_READAPTACAO_CADASTRAR`, `ROLE_READAPTACAO_ATUALIZAR`, `ROLE_READAPTACAO_EXCLUIR`, `ROLE_READAPTACAO_GESTAO`                                                                                      |
| INVALIDEZ                     | CRUD   | `ROLE_INVALIDEZ_VISUALIZAR`, `ROLE_INVALIDEZ_CADASTRAR`, `ROLE_INVALIDEZ_ATUALIZAR`, `ROLE_INVALIDEZ_EXCLUIR`, `ROLE_INVALIDEZ_GESTAO`                                                                                                |
| EXAME_OCUPACIONAL             | CRUD   | `ROLE_EXAME_OCUPACIONAL_VISUALIZAR`, `ROLE_EXAME_OCUPACIONAL_CADASTRAR`, `ROLE_EXAME_OCUPACIONAL_ATUALIZAR`, `ROLE_EXAME_OCUPACIONAL_EXCLUIR`, `ROLE_EXAME_OCUPACIONAL_GESTAO`                                                        |
| ENTIDADE_EXAME                | CRUD   | `ROLE_ENTIDADE_EXAME_VISUALIZAR`, `ROLE_ENTIDADE_EXAME_CADASTRAR`, `ROLE_ENTIDADE_EXAME_ATUALIZAR`, `ROLE_ENTIDADE_EXAME_EXCLUIR`, `ROLE_ENTIDADE_EXAME_GESTAO`                                                                       |
| EPI                           | CRUD   | `ROLE_EPI_VISUALIZAR`, `ROLE_EPI_CADASTRAR`, `ROLE_EPI_ATUALIZAR`, `ROLE_EPI_EXCLUIR`, `ROLE_EPI_GESTAO`                                                                                                                              |
| EPC                           | CRUD   | `ROLE_EPC_VISUALIZAR`, `ROLE_EPC_CADASTRAR`, `ROLE_EPC_ATUALIZAR`, `ROLE_EPC_EXCLUIR`, `ROLE_EPC_GESTAO`                                                                                                                              |
| AGENTE_NOCIVO                 | CRUD   | `ROLE_AGENTE_NOCIVO_VISUALIZAR`, `ROLE_AGENTE_NOCIVO_CADASTRAR`, `ROLE_AGENTE_NOCIVO_ATUALIZAR`, `ROLE_AGENTE_NOCIVO_EXCLUIR`, `ROLE_AGENTE_NOCIVO_GESTAO`                                                                            |
| CATEGORIA_DOENCA              | CRUD   | `ROLE_CATEGORIA_DOENCA_VISUALIZAR`, `ROLE_CATEGORIA_DOENCA_CADASTRAR`, `ROLE_CATEGORIA_DOENCA_ATUALIZAR`, `ROLE_CATEGORIA_DOENCA_EXCLUIR`, `ROLE_CATEGORIA_DOENCA_GESTAO`                                                             |
| CONVENIO_DESCONTO             | CRUD   | `ROLE_CONVENIO_DESCONTO_VISUALIZAR`, `ROLE_CONVENIO_DESCONTO_CADASTRAR`, `ROLE_CONVENIO_DESCONTO_ATUALIZAR`, `ROLE_CONVENIO_DESCONTO_EXCLUIR`, `ROLE_CONVENIO_DESCONTO_GESTAO`                                                        |
| ESOCIAL                       | CRUD   | `ROLE_ESOCIAL_VISUALIZAR`, `ROLE_ESOCIAL_CADASTRAR`, `ROLE_ESOCIAL_ATUALIZAR`, `ROLE_ESOCIAL_EXCLUIR`, `ROLE_ESOCIAL_GESTAO`                                                                                                          |

### Permissões v0.0.1 para atualização cadastral HR-07

| Permissão                     | Uso                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `portal.profile.read`         | Leitura dos próprios dados em `/v1/portal/meus-dados/*`.                          |
| `portal.profile.write`        | Criação de solicitações em `hr.cadastral_change_request` pelo portal do servidor. |
| `rh.dependent.read`           | Leitura tenant-scoped de `hr.employee_dependent`, incluindo RLS para dependentes. |
| `rh.dependent.write`          | Mutação tenant-scoped de dependentes por fluxo aprovado.                          |
| `rh.cadastral_change.approve` | Listar, aprovar e rejeitar solicitações cadastrais na administração de RH.        |
