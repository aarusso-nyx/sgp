# Gov.br Advanced Signature Sandbox

## Scope

R2-135 adds the v0.0.1 backend and portal boundary for self-service Gov.br
advanced signatures without selecting a production Gov.br provider or external
library. The implemented route is `POST /api/portal/v1/auth/govbr/sign`; the
local callback is `GET /api/portal/v1/auth/govbr/sign/callback`.

The portal currently uses this boundary for draft cadastral-change payloads in
`/meus-dados/:section`. The backend records a local sandbox evidence envelope
and redirects the user back to `/govbr-sign/callback`.

## Legal Contract

Regulatory source: Lei 14.063/2020, art. 4, II:
https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

The sandbox envelope preserves these advanced-signature evidence fields:

| Lei 14.063/2020 art. 4, II requirement             | Local evidence                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated uniquely to the signer                  | `signerUniqueKey` is derived from tenant, authenticated subject, and CPF claim when present.                                                       |
| Signer controls creation data with high confidence | The request uses an opaque `state` and one-time `challenge` controlled by the authenticated session and callback.                                  |
| Later modification is detectable                   | The envelope stores SHA-256 hashes over the canonical payload and signature metadata; verification fails when the payload changes after signature. |

This is not a production Gov.br integration. Production cutover must replace
`GovBrSignatureSandboxAdapter` with a provider adapter that supplies equivalent
or stronger evidence, while preserving the controller/service contract and
tests for approved and denied decisions.

## Runtime Behavior

1. Portal user edits a supported self-service payload.
2. Portal calls `POST /api/portal/v1/auth/govbr/sign` with the resource type,
   draft resource id, canonical payload, and return URL.
3. Backend creates a pending local request, hashes the payload, binds signer
   evidence to the authenticated actor, and returns a sandbox redirect URL.
4. Browser redirects to the sandbox callback.
5. Callback applies an approved or denied decision. Approved requests receive a
   `govbr-sandbox://advanced-signatures/{id}` evidence URI and tamper-evident
   envelope; denied requests close without signature evidence.
6. Backend redirects to the portal callback route with status and protocol id.

## Test Contract

`backend/src/auth/govbr/sign.service.spec.ts` covers approved and denied paths,
including payload-tamper detection against the generated advanced-signature
envelope. `backend/src/auth/govbr/sign.controller.spec.ts` covers controller
delegation and callback redirect behavior.
