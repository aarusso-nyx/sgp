# ADR-021: ICP-Brasil signer uses software certificates inside SGP

Status: Accepted

Date: 2026-05-05

## Context

SGP emits deterministic local ICP-Brasil-style signing evidence for eSocial and
Gov.br sandbox flows through
`backend/src/auth/govbr/software-pades-pkcs7.signer.ts`. The deferred decision
ledger previously held the HSM/A3 posture open for ICP signing.

The owner decision recorded in
`docs/gov/evidence/deferred-decision-ledger.md` selects the A1/software
certificate path for SGP and keeps HSM/A3, PKCS#11 devices, managed key custody,
and production certificate operations outside SGP runtime ownership unless a
future owner decision reopens that boundary.

## Decision

SGP keeps the software-certificate signer as its accepted ICP signing strategy.
The production path is an A1/PKCS#12 certificate supplied through the deployment
secret boundary. The repository continues to use deterministic sandbox
certificate material in tests and local mocks.

SGP does not implement an HSM, A3 token, PKCS#11, AWS CloudHSM, or Azure Key
Vault Managed HSM adapter in v0.0.1. Those integrations belong to a future
Stynx or ente-side integration wave after explicit owner approval.

## Options Considered

| Option                            | Benefits                                                                                                                                         | Costs and constraints                                                                                                                    | Decision          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Software certificate A1 / PKCS#12 | Matches current signer shape, works in local and sandbox tests, low latency, simple rotation through secret replacement, no hardware dependency. | Requires strong secret custody, deployment-time rotation discipline, and clear audit evidence for certificate use.                       | Accepted for SGP. |
| AWS CloudHSM                      | Hardware-backed key custody and strong audit story for organizations already operating AWS HSM clusters.                                         | High cost, operational complexity, latency, PKCS#11 integration work, tenant-specific procurement, and separate ICP compliance evidence. | Out of SGP scope. |
| Azure Key Vault Managed HSM       | Managed HSM operations and cloud audit integration for Azure-centered tenants.                                                                   | Cross-cloud fit is tenant-dependent; still requires HSM contract, ICP validation evidence, and adapter work.                             | Out of SGP scope. |

## Consequences

- SGP tests and local regulatory mocks keep using deterministic software
  certificate material.
- Production certificate values are never committed. They enter runtime only
  through the deployment secret boundary.
- Operator guidance and release evidence must not claim HSM/A3 readiness.
- Future HSM/A3 work must start from a new owner-approved decision and cannot
  weaken the existing software-certificate tests while being introduced.

## Verification

- `docs/gov/evidence/deferred-decision-ledger.md` records
  `PADES_HSM_CONTRACT` as `decision=software-certificate`.
- `backend/src/auth/govbr/software-pades-pkcs7.signer.ts` remains the local
  signer implementation.
- `tests/backend/esocial-pades.e2e-spec.ts` keeps sandbox PKCS#7 coverage.
