# Decisão de Owner — eSocial Real

## Contexto

O escopo atual mantém eSocial em stub/sandbox. Transmissão real, certificados de produção, homologação externa e observabilidade produtiva não bloqueiam v0.0.1.

## Decisão requerida

Definir quando substituir o stub/sandbox por integração real de eSocial e qual ambiente externo será usado para homologação.

## Critérios antes de implementar

- ADR aprovada com modelo de certificado A1/A3, custódia, rotação e segregação por tenant.
- Atualização de `docs/eng/42-contratos-integracao.md`, `44-jobs-rotinas-assincronas.md` e `60-catalogo-saidas-oficiais.md`.
- Testes com produção restrita ou sandbox oficial, incluindo retry, recibo e rejeição.
- Evidência de segurança para segredo/certificado e trilha auditável de envio.
