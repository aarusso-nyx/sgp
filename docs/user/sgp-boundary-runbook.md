# SGP Boundary Architecture Runbook

This runbook explains the v0.0.1 operating boundary for external integrations.
SGP owns deterministic adapters, queue envelopes, local mock relays, persisted
state, audit, and observability. Real government, bank, GovBR, or HSM provider
homologation is an ente-side responsibility unless a future owner decision
changes `docs/eng`.

## Queue Contract Overview

The SGP boundary is the two-way adapter queue contract documented in
`docs/eng/domains/fiscal-integrations.md`:

- request topic: `sgp.adapter.<kind>.request`
- response topic: `sgp.adapter.<kind>.response`
- dead-letter topic: `sgp.adapter.<kind>.dlq`

Every request carries `request-id`, `correlation-id`, `idempotency-key`,
`tenant_id`, `kind`, `payload`, `attempt`, `max-attempts`, `reply-to`,
`dead-letter-topic`, and `created-at`. Every response echoes the correlation
fields and returns `OK`, `RETRY`, or `DEAD_LETTER`.

The local in-memory transport and mock relays are the accepted CI/runtime
evidence for SGP. A production deployment can replace the transport or attach an
ente-owned relay as long as the envelope, tenant, retry, DLQ, and audit
semantics remain unchanged.

## Adapter Wiring

### eSocial

SGP-side runtime:

- `backend/src/integrations/stynx-esocial/`
- `backend/src/esocial-events/`
- `public.esocial_events`

SGP no longer owns the eSocial worker, builders, XSD bundle, certificate store,
SOAP client, return parser, or eSocial schema tables. SGP does not expose the
legacy browser-facing eSocial route family; domain actions enqueue internal
events into `public.esocial_events` and exchange HTTP/queue envelopes with the
separate `stynx-esocial` service.

Official endpoint custody, certificates, national-environment homologation,
payload construction, signing, retries, and return parsing are outside the SGP
runtime and belong to `stynx-esocial` or ente-side production operations.

### TCE

SGP-side runtime:

- `backend/src/tce/adapters/queue-adapter.ts`
- `backend/src/external/mocks/tce-relay/`
- `tce.submission`
- `tce.submission_queue`
- `tce.submission_attempt`
- `tce.adapter_circuit_state`

The TCE adapter publishes state-shaped report envelopes to `kind=tce`. The local
relay returns deterministic SP/MG acknowledgements and persists local submission
state. Official state court layouts, endpoints, proprietary field dictionaries,
and homologation fixtures stay downstream of the SGP adapter boundary.

### Banking

SGP-side runtime:

- `backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts`
- `backend/src/external/mocks/banking-relay/`
- CNAB240 remittance and return goldens under `tests/backend/golden/cnab240/`

The banking adapter proves deterministic file production and local return
reconciliation. Bank host/channel contracts, keys, credentials, and return-file
SLAs are ente-side production operations.

### SIAFIC

SGP-side runtime:

- `backend/src/integrations-worker/siafic/`
- `tests/backend/golden/siafic-v01/`

SIAFIC uses the neutral payroll-accounting JSON contract as the permanent SGP
surface. `officialConformance=false` is intentional for v0.0.1; each ente maps
the neutral payload to its SIAFI, SIAFEM, or municipal SIAFIC layout outside
SGP.

### SICONFI, SIOPE, and SIOPS

The current SGP side has export primitives under:

- `backend/src/integrations-worker/siconfi/`
- `backend/src/integrations-worker/siope/`
- `backend/src/integrations-worker/siops/`

Round 5 item R5-40 extends these into the same mock-relay boundary. Until that
lands, operators should treat generated files as internal evidence packages, not
accepted government transmissions.

### GovBR and HSM/A3 Signing

The SGP-side signing default is the local software-certificate path. HSM/A3 is a
per-ente downstream concern because provider, custody, certificate chain,
onboarding, SLA, and cost are deployment-specific.

Production installations that need HSM/A3 should attach it through a
config-driven signer strategy/factory:

- `signer=software` keeps the SGP default.
- `signer=external-hsm` delegates signing to an ente-owned adapter.
- the adapter must return the same verification evidence fields expected by SGP.
- private keys and HSM credentials never enter SGP source, fixtures, logs, or
  retained evidence.

GovBR production provider selection follows the same boundary: the SGP sandbox
evidence shape is stable, while production provider credentials and acceptance
belong to the ente-side integration.

## SLO Expectations

The SGP-side operational targets for local queues are documented in
`docs/eng/domains/operations-observability.md`. They are evidence targets for
local workers and mock relays, not production homologation promises.

Production SLOs are TBD per ente. Before enabling a real relay, the ente must
record:

- endpoint and provider ownership;
- credential and certificate custody;
- retry budget and dead-letter response time;
- operator escalation path;
- evidence retention path for official receipts.

## Observability

Use the governed dashboard and alert rules:

- `docs/gov/observability/audit-worker-dashboard.json`
- `docs/gov/observability/audit-worker-alerts.yml`

Required log/metric dimensions are `worker`, `tenant_id`, `request-id`,
`correlation-id`, `idempotency-key`, `kind`, `attempt`, `status`, `duration_ms`,
and `trace_id` when available. Queue depth, active claims, retries, DLQ counts,
and circuit state must remain visible before a real relay is enabled.

## Failure Recovery

1. Identify `kind`, tenant, `correlation-id`, and final status from logs or the
   dashboard.
2. For `RETRY`, confirm attempt count and circuit state before manual action.
3. For validation failures, correct source data or layout metadata. Do not
   replay unchanged invalid payloads.
4. For `DEAD_LETTER`, inspect the final request and response, preserve evidence,
   fix the upstream cause, then replay only through the documented operator
   endpoint or ente-owned relay process.
5. If a real relay fails because of credentials, endpoint policy, certificate
   chain, HSM custody, or homologation rejection, record the incident as
   ente-side. Do not weaken SGP tests or mock-relay contracts to hide it.

## Security Boundary

- SGP source and fixtures must not contain production credentials, HSM secrets,
  private keys, bank keys, government endpoint credentials, or real certificates.
- Tenant context and RLS posture must be preserved across adapter requests,
  relay responses, persisted state, logs, and metrics.
- Audit events remain append-oriented and redacted.
- Real-service traffic is forbidden in CI unless explicitly authorized by the
  owner for a separate homologation run.

See also: `docs/eng/runbooks/incident-response.md` and
`docs/eng/runbooks/secret-rotation.md`.
