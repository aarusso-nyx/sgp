# Decisão de Owner — Gates de Release e Governança

## Contexto

O baseline de CI em `source/` cobre lint/format check, typecheck, alinhamentos, health, testes, build, cobertura e validação de governança. Pact broker, scanners, observabilidade produtiva e gates de release/homologação continuam postergados.

## Decisão requerida

Definir quais gates passam a bloquear PR, merge, staging, homologação e produção.

## Critérios antes de implementar

- ADR aprovada com matriz de gates por ambiente.
- `devai.config.json` atualizado por tooling ou mudança controlada.
- Evidência gerada para RTD, health, segurança, cobertura, contratos e release.
- Política explícita para exceções e override com owner identificado.
