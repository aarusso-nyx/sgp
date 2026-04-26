# Decisão de Owner — Estratégia Final de Infra

## Contexto

`source/infra` existe como superfície de planejamento. A escolha final de infraestrutura produtiva continua postergada.

## Decisão requerida

Escolher a estratégia final para deploy, banco, storage, filas, secrets, observabilidade e ambientes.

## Critérios antes de implementar

- ADR aprovada com provedor, topologia, rede, ambientes, custo e responsabilidades operacionais.
- Atualização de `docs/eng/41-arquitetura-sistema.md`, `62-estrategia-testes.md` e `docs/governance/health/preflight.md`.
- Pipeline de deploy seco e rollback documentado.
- Evidência de RLS, backups, restore, secrets e retenção.
