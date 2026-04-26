# Route And Spec Coverage Diagnostic

Generated at: 2026-04-26T04:03:00Z

## Alignment Scope

`source/scripts/sync-api-route-alignment.mjs` now validates three layers:

- current API route contracts from `docs/eng/10-uc-administracao-seguranca.md`, `docs/eng/42-contratos-integracao.md`, `docs/eng/60-catalogo-saidas-oficiais.md`, and `docs/eng/62-estrategia-testes.md`;
- supplemental runtime-route provenance from `docs/eng/40-divisao-modular.md` and `docs/eng/41-arquitetura-sistema.md`;
- domain/workflow/menu parity from `docs/eng/BRIEF.md`, `docs/eng/40-divisao-modular.md`, and `docs/eng/50-arvore-menus.md`.

Latest `source/scripts/check-api-route-alignment.mjs --json` result:

| Metric | Count |
|---|---:|
| Documented routes, total | 211 |
| Documented routes, current scope | 152 |
| Runtime routes, total | 190 |
| Runtime routes, current scope | 152 |
| Deferred documented routes | 59 |
| Deferred runtime routes | 38 |
| Implemented current routes | 152 |
| Explicitly excluded current routes | 0 |
| Documented missing current routes | 0 |
| Runtime-only current routes | 0 |
| Runtime routes outside canonical families | 0 |
| Current domain modules | 11 |
| Current domain modules implemented | 11 |
| Portal menu routes | 34 |
| Portal menu missing routes | 0 |
| Admin menu routes | 182 |
| Admin menu implemented routes | 0 |
| Admin menu missing routes | 0 |
| Admin menu postponed routes | 182 |

## Deferred Scope

- `ADMIN_INSTALL_LATER`: the `sgp-admin` frontend tree and backend administrative routes `/api/v1/admin` and `/api/admin/v1` remain postponed. Current admin menu records are ignored as acceptance evidence.
- `IDENTITY_INSTALL_LATER`: OAuth/Cognito/Gov.br and account-management paths are postponed until the corporate identity framework is installed.
- `ARRECADACAO_PREVIDENCIARIA`: Arrecadacao remains later-version scope.

## Current Route Gap

None identified after the scope update.
