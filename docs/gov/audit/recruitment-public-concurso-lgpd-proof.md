# Public Concurso Registration and LGPD Consent Proof

Round: 11
FRs: FR-PR-E68857, FR-PR-BE041B
Status: DONE

## Accepted SGP Boundary

SGP exposes the published concurso notice and public registration flow without
JWT while keeping administrative concurso creation protected by recruitment
permissions. The public registration flow identifies the candidate by CPF,
requires explicit LGPD consent and a consent-term version, persists quota
self-declarations only when the candidate makes an explicit affirmative
declaration, and returns a random follow-up token for later public lookup.

The public follow-up route does not expose CPF search or tenant-wide browsing.
It accepts only the inscricao id plus the matching access token, stored as a
hash, and returns the single matching application summary. Invalid slugs,
missing consent, invalid candidate requirements, invalid quota declarations,
and read-only administrative actors are rejected.

This proof does not add or change public route shapes, payment-gateway
contracts, heteroidentification or medical-board quota decisions, LGPD DPO/DSAR
internals, biometric-sensitive-data policy, or time-clock behavior.

## Runtime Evidence

| Behavior                                                | Evidence                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Public no-JWT registration route                        | `backend/src/recrutamento/inscricao/inscricao.controller.ts`                        |
| Consent, candidate, quota, token, and payment flow      | `backend/src/recrutamento/inscricao/inscricao.service.ts`                           |
| Token-hash public follow-up lookup                      | `backend/src/recrutamento/inscricao/inscricao.service.ts`                           |
| Published concurso public lookup                        | `backend/src/recrutamento/concurso/concurso.controller.ts`                          |
| Administrative concurso permission boundary             | `backend/src/recrutamento/concurso/concurso.controller.ts`                          |
| Public portal registration payload shaping              | `frontend/src/app/features/portal-publico/concursos/inscricao/inscricao.ts`         |
| Recruitment schema, RLS, token index, and audit posture | `database/sql/10-11-recrutamento-ddl.sql`, `database/sql/70-recrutamento-final.sql` |

## Test Evidence

| Behavior                                                      | Evidence                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Public CadUnico registration without JWT and token follow-up  | `tests/backend/inscricao-public.e2e-spec.ts`                                     |
| Consent-version persistence and explicit quota declaration    | `tests/backend/inscricao-public.e2e-spec.ts`                                     |
| Invalid slug, missing consent, invalid CPF/age, and bad quota | `tests/backend/inscricao-public.e2e-spec.ts`                                     |
| Cross-inscription token rejection and matching-token lookup   | `tests/backend/inscricao-public.e2e-spec.ts`                                     |
| Read-only actor blocked from administrative concurso creation | `tests/backend/inscricao-public.e2e-spec.ts`                                     |
| Frontend consent/quota payload construction                   | `frontend/src/app/features/portal-publico/concursos/inscricao/inscricao.spec.ts` |

## Commands

- `npm run test:e2e -- --runInBand tests/backend/inscricao-public.e2e-spec.ts tests/backend/concurso-publish.e2e-spec.ts`
- `npm -w backend run test -- --runInBand backend/src/recrutamento/inscricao/inscricao.service.spec.ts backend/src/recrutamento/concurso/concurso.service.spec.ts`
- `npm -w frontend run test:portal -- --include src/app/features/portal-publico/concursos/inscricao/inscricao.spec.ts`
- `npm run test:backend -- --runInBand`
- `npm run test:frontend:coverage`
- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run governance:check`
