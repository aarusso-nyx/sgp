# Decisão de Owner — Admin Tree e Identidade

## Contexto

`sgp-admin`, rotas administrativas completas, OAuth/Cognito/Gov.br e gestão corporativa de identidade estão postergados sob `ADMIN_INSTALL_LATER` e `IDENTITY_INSTALL_LATER`.

## Decisão requerida

Definir se a próxima versão deve instalar:

- árvore completa do `sgp-admin`;
- rotas backend administrativas;
- Cognito/OAuth/Gov.br;
- provisionamento de usuários/perfis;
- gates de autorização corporativa.

## Critérios antes de implementar

- ADR aprovada em `docs/eng/70-adrs.md`.
- Atualização de `docs/eng/50-arvore-menus.md` e `docs/eng/51-modelo-autorizacao.md`.
- Gate de aceite com login, seleção de tenant, RBAC e menu por papel.
- Plano de migração de perfis legados para usuários/perfis novos.
