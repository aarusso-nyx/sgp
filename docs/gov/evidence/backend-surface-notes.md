# Backend Surface Notes Evidence

Evidence/status artifact. It records implementation state and does not override authored or facts authority.

## Merged Artifact Index

- Backend Surface Notes

## Backend Surface Notes

## Backend Surface Notes

Status: authoritative maintenance note for thin backend surfaces
Last updated: 2026-05-03

This note documents small shared or thin backend surfaces that are easy to miss
in broader domain docs. It is intentionally narrow: behavior changes still
belong in the owning domain spec.

### Notifications

Runtime files:

- `backend/src/notifications/notifications.module.ts`
- `backend/src/notifications/notifications.controller.ts`
- `backend/src/notifications/notification-preferences.controller.ts`
- `backend/src/notifications/notifications.service.ts`

Routes:

- `GET /api/v1/notificacoes`
- `GET /api/v1/notificacoes/stream`
- `GET /api/v1/notificacoes/unread-count`
- `PATCH /api/v1/notificacoes/marcar-todas-lidas`
- `PATCH /api/v1/notificacoes/:id`
- `GET /api/v1/usuarios/me/preferencias-notificacao`
- `PUT /api/v1/usuarios/me/preferencias-notificacao`

Permissions currently use `auth.read`. Mutations are audited as notification or
notification-preference resources. The current SSE endpoint returns a lightweight
connection descriptor; a real event stream transport is not implied by this
note.

### Consultas

Runtime files:

- `backend/src/consultas/consultas.module.ts`
- `backend/src/consultas/managerial-queries.controller.ts`
- `backend/src/consultas/batimento.controller.ts`
- `backend/src/consultas/business-days.controller.ts`

Routes:

- `GET /api/v1/consultas/ficha-financeira`
- `GET /api/v1/consultas/ficha-funcional`
- `GET /api/v1/consultas/relatorios-situacao`
- `GET /api/v1/consultas/pagamentos-bloqueados`
- `GET /api/v1/consultas/historico-operacional`
- `GET /api/v1/consultas/dashboards`
- `GET /api/v1/consultas/batimento`
- `GET /api/v1/consultas/business-days`

Permissions use `consultas.read`; batimento also accepts `relatorio.generate`.
The services are query/read models over existing payroll, personnel, audit, and
calendar state.

### Convenio

Runtime files:

- `backend/src/convenio/convenio.module.ts`
- `backend/src/convenio/agreements/`
- `backend/src/convenio/internships/`

Routes:

- `GET /api/v1/convenios`
- `POST /api/v1/convenios`
- `PATCH /api/v1/convenios/:id`
- `DELETE /api/v1/convenios/:id`
- `GET /api/v1/recrutamento/estagios/programas`
- `POST /api/v1/recrutamento/estagios/programas`
- `GET /api/v1/recrutamento/estagios/estagiarios`
- `POST /api/v1/recrutamento/estagios/estagiarios`
- `POST /api/v1/recrutamento/estagios/:id/prorrogacao`
- `POST /api/v1/recrutamento/estagios/:id/desligar`
- `POST /api/v1/recrutamento/estagios/:id/esocial/s2300`

Permissions are `convenio.read` and `convenio.write`. Agreement and internship
mutations are audited against `hr.agreement`, `hr.internship_program`, and
`hr.internship_record`; the S-2300 helper is an internal XML-build surface, not
external eSocial homologation.

### Rate Limit

Runtime files:

- `backend/src/common/rate-limit/rate-limit.config.ts`
- `backend/src/common/rate-limit/rate-limit.config.spec.ts`

The Nest throttler is installed by the active API entrypoints. It defines two
trackers:

- `ip`: `SGP_RATE_LIMIT_IP_LIMIT` within `SGP_RATE_LIMIT_IP_TTL_MS`
- `tenant`: `SGP_RATE_LIMIT_TENANT_LIMIT` within
  `SGP_RATE_LIMIT_TENANT_TTL_MS`

`SGP_RATE_LIMIT_TENANT_LIMIT` must be greater than `SGP_RATE_LIMIT_IP_LIMIT`.
`SGP_RATE_LIMIT_TRUST_PROXY=true` enables Express `trust proxy` on entrypoints
that call `configureRateLimitEntrypoint`.

### OpenAPI 3.1

Runtime file:

- `backend/src/common/openapi/openapi31.ts`

`createOpenApi31Document` is the root helper for generated specs. It forces
OpenAPI 3.1 with JSON Schema 2020-12, registers `SgpProblemDetails`, adds
standard 4xx problem-detail contracts, and adds a fallback success schema to
non-204 2xx responses that do not yet expose a dedicated DTO schema.

Executable canaries:

- `node scripts/check-api.mjs spec check`
- `npm run api:client:generate`
- `npm run api:alignment:check -- --json`
- `npm run governance:check`
