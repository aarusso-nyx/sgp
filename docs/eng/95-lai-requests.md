# LAI - pedidos de acesso a informacao

## Escopo

O modulo `publico/lai` recebe pedidos publicos de acesso a informacao para um
tenant, retorna protocolo e chave de acompanhamento, e expoe consulta publica de
status sem autenticar o solicitante.

Base legal operacional: Lei 12.527/2011, art. 10 e art. 11. Quando a resposta
imediata nao for possivel, o prazo inicial e de ate 20 dias corridos; a prorrogacao
e unica, por mais 10 dias, com justificativa registrada.

## API

- `POST /api/v1/public/lai/:tenantId/requests`
  - Entrada: `requesterName`, `requesterEmail`, `requesterDocument?`,
    `requestText`.
  - Saida: `protocol`, `accessKey`, `status`, `submittedAt`, `dueAt`,
    `slaStatus`.
  - O documento do solicitante e armazenado somente como hash SHA-256 quando
    informado. A chave de acompanhamento tambem e armazenada somente como hash.
- `GET /api/v1/public/lai/:tenantId/requests/:protocol/status?accessKey=...`
  - Saida: `protocol`, `status`, `submittedAt`, `dueAt`, `extendedDueAt?`,
    `effectiveDueAt`, `answeredAt?`, `closedAt?`, `remainingDays`, `slaStatus`.
  - Nao retorna nome, e-mail, documento nem texto do pedido.

## Persistencia e auditoria

As tabelas canonicas sao `public_data.lai_request` e
`public_data.lai_request_event`. A criacao do pedido insere o evento inicial
`RECEIVED`; transicoes posteriores sao registradas na tabela de eventos.

`public_data.create_lai_request`, `public_data.get_lai_request_status` e
`public_data.transition_lai_request` sao funcoes `SECURITY DEFINER` usadas pelo
runtime para manter o endpoint publico sem criar permissao RBAC nova. As tabelas
tem RLS forcado; operadores internos reutilizam `transparency.publish` para
leitura/escrita operacional do fluxo de transparencia, sem introduzir novo
identificador de permissao em v0.0.1.

Toda mutacao de `public_data.lai_request` dispara trigger de auditoria para
`public.audit_event`; o controller tambem declara `@AuditMutation` para cumprir
o contrato global de mutacoes HTTP auditadas.

## Estados

Estados validos:

- `RECEIVED`
- `IN_REVIEW`
- `AWAITING_CLARIFICATION`
- `EXTENDED`
- `ANSWERED`
- `DENIED`
- `CLOSED`

Transicoes permitidas:

- `RECEIVED` -> `IN_REVIEW`, `AWAITING_CLARIFICATION`, `EXTENDED`, `ANSWERED`,
  `DENIED`, `CLOSED`
- `IN_REVIEW` -> `AWAITING_CLARIFICATION`, `EXTENDED`, `ANSWERED`, `DENIED`
- `AWAITING_CLARIFICATION` -> `IN_REVIEW`, `CLOSED`
- `EXTENDED` -> `ANSWERED`, `DENIED`, `CLOSED`
- `ANSWERED` -> `CLOSED`
- `DENIED` -> `CLOSED`

`CLOSED` e terminal.
