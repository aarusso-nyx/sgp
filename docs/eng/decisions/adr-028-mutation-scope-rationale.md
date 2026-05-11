---
controllers: []
migrations: []
infra:
  - stryker.conf.cjs
  - backend/src/common/money/money.ts
  - backend/src/common/errors/standard-exception.filter.ts
  - backend/src/common/lgpd/legal-basis.service.ts
  - backend/src/folha-pagamento/fgts/fgts.service.ts
  - backend/src/folha-pagamento/operations/bank-account/bank-account-validator.service.ts
  - tests/backend/jest-mutation.json
runbooks: []
---

# ADR-028: Stryker Mutation Testing Scope Rationale

Status: Accepted

Date: 2026-05-08

## Context

`stryker.conf.cjs` scopes mutation testing to five files:

- `backend/src/common/money/money.ts`
- `backend/src/common/errors/standard-exception.filter.ts`
- `backend/src/common/lgpd/legal-basis.service.ts`
- `backend/src/folha-pagamento/fgts/fgts.service.ts`
- `backend/src/folha-pagamento/operations/bank-account/bank-account-validator.service.ts`

The 2026-05-10 QA-lift run reports a mutation score of 79.78% against this
scope, well above the configured `break: 70` threshold.
The scope is **narrow by design**, and the audit explicitly held Dim 7
(Testing Quality) below 9.5 because this design choice was implicit.

The decision pressure: mutation testing is expensive (Stryker mutates and
re-runs the relevant Jest suites for each mutant). A whole-codebase mutation
budget is impractical at SGP's spec count (~571 spec files). Without an ADR,
future contributors may interpret the narrow scope as either oversight or as
a signal that mutation testing applies only to those two files forever.

## Decision

**Mutation testing scope is intentionally narrow and grows by accepted
decision, not by accident.** Specifically:

- The current scope (`money.ts`, `standard-exception.filter.ts`,
  `legal-basis.service.ts`, `fgts.service.ts`,
  `bank-account-validator.service.ts`) reflects high-leverage targets:
  monetary computation correctness, HTTP exception envelope correctness, LGPD
  legal-basis enforcement, FGTS computation/projection orchestration, and bank
  account validation. A regression in any of these is a class of bug that
  traditional unit tests routinely miss but mutation testing reliably surfaces.
- Expansion of the scope is done deliberately, one logical surface at a
  time, with a `break:` threshold appropriate to the new surface's spec
  density.
- Further expansion requires a new ADR or an amendment to this one,
  identifying the new surface, the rationale, and the initial threshold.

## Amendment 2026-05-08 — bulk-glob expansion experiment, then targeted re-expansion

A first attempt expanded `mutate` to
`backend/src/folha-pagamento/**/*.service.ts` and
`backend/src/iam/permissions/**/*.ts` and measured a global mutation
score of **34.49 %**, far below the configured floor. The per-file
breakdown showed many services at **0 %** because those services rely
exclusively on e2e tests against a real PostgreSQL, and the
`tests/backend/jest-mutation.json` runner (intentionally narrow for cost
reasons) did not pick them up. Bulk-glob expansion was therefore
reverted.

A second, targeted expansion was attempted: include the three folha-pagamento
services whose existing specs DIRECTLY import the service so Stryker's
`enableFindRelatedTests` correctly maps mutations to runnable tests:

| Service                                                                               | Mapping spec                                                                                                                          |                             Per-file score |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -----------------------------------------: |
| `backend/src/folha-pagamento/operations/consignment/margin-calculator.service.ts`     | `tests/backend/margin-calculator.golden.spec.ts`                                                                                      |                  43.33 % (76.47 % covered) |
| `backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts` | `backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.spec.ts` plus the split eligibility/financial specs | 20.33 % (60.49 % covered before the split) |

The targeted expansion ran in 49 seconds (vs the bulk-glob's 5 minutes —
`enableFindRelatedTests` worked), demonstrating the architectural
mechanism is sound: the spec imports the service, Stryker maps mutants
to the spec, the spec runs and kills mutants. **Total mutation score
came in at 36.02 %**, still well below the 70 % bar.

The data shows why: the existing service-importing specs cover only
60–76 % of the file, and Stryker's mutation score is computed as
`killed / total mutants` (uncovered code regions count against the
total). Even with the best-case targeted expansion, every additional
service drags the total down.

Both experiments are therefore reverted. The mutation scope returns to
the original `money.ts` + `standard-exception.filter.ts` pair, where
the dedicated specs reliably clear 70 %. Future expansion requires
either:

1. Promoting a comprehensive service-importing spec that covers
   substantially all of the target service (≥ 90 % line coverage), so
   the mutation-score math has a chance of clearing 70 %, or
2. Adopting a per-file `break` threshold (Stryker supports this via
   the dashboard, not via the local CLI gate), which lets the global
   gate stay strict while individual files report their own floors, or
3. Treating mutation as advisory-only on the broader scope — drop the
   `break` to a measured floor and surface the score in
   `docs/gov/audit/test-confidence-proof.md` rather than failing CI.

None of these are in scope for the current QA-lift wave; each is a
separate accepted-decision question.

## Amendment 2026-05-10 — focused service expansion retained

The QA-lift Wave 3 expansion first added
`backend/src/common/lgpd/legal-basis.service.ts` to `stryker.conf.cjs` without
changing `tests/backend/jest-mutation.json`. That run failed with a 65.98%
global mutation score because the mutation runner's narrow `testRegex` did not
include `backend/src/common/lgpd/legal-basis.service.spec.ts`; Stryker therefore
reported the candidate at 0% coverage. The failed attempt was rejected rather
than lowering the `break: 70` threshold.

The accepted amendment adds the direct legal-basis, FGTS, and bank-account
validator specs to `tests/backend/jest-mutation.json` and retains all three
services in `stryker.conf.cjs`. `npm run test:mutation` then passed with:

| File                                                                                    | Mutation score | Covered score |
| --------------------------------------------------------------------------------------- | -------------: | ------------: |
| `backend/src/common/lgpd/legal-basis.service.ts`                                        |         90.48% |        90.48% |
| `backend/src/folha-pagamento/fgts/fgts.service.ts`                                      |         90.32% |        93.33% |
| `backend/src/folha-pagamento/operations/bank-account/bank-account-validator.service.ts` |         73.38% |        75.00% |
| All files                                                                               |         79.78% |        81.61% |

This keeps the same global `break: 70` policy while proving that additional
mutation scope must be paired with a mutation-runner spec allow-list update.

## Amendment 2026-05-10 — reintegration decomposition coverage shape

The QA-closure service-size wave split
`backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts`
into a slim coordinator plus eligibility and financial services. The split
keeps public `ReintegrationOrderService` methods stable and moves the
service-importing branch specs beside each implementation file, so a future
Stryker expansion can target one reintegration surface at a time without
re-mutating the entire former 939-line coordinator. This amendment documents
the coverage shape only; it does not add reintegration files to the retained
mutation scope.

## Options Considered

- Option A: No mutation testing. Rejected because the cost of a single
  rounding-error or exception-envelope regression in production exceeds the
  CI cost of mutating those two files.
- Option B (selected): Narrow scope, deliberate growth. Matches the current
  practice and ties expansion to explicit decisions rather than to whoever
  edits `stryker.conf.cjs` last.
- Option C: Whole-codebase mutation. Rejected on cost: the CI minute budget
  for a full-codebase Stryker run on this spec corpus would be prohibitive
  and the marginal information per minute decays sharply outside the highest-
  leverage surfaces.

## Consequences

- `stryker.conf.cjs` `mutate` array is a curated list, not a `**/*` pattern.
- Wave 2 expansion (folha-pagamento services, iam/permissions) is a planned
  amendment landed under this ADR; subsequent waves require new amendments.
- The `Scoped mutation gate` step in `.github/workflows/source-ci.yml`
  remains scoped — it does not bypass the threshold, it enforces it for the
  current scope.
- The `break:` threshold is the floor; falling below it fails CI.

## Verification

- `stryker.conf.cjs` `mutate` array matches the scope this ADR documents.
- `tests/backend/jest-mutation.json` includes the specs for every retained
  mutation target.
- `npm run test:mutation` reports a score ≥ `break:` for the listed scope.
- `.github/workflows/source-ci.yml` `Scoped mutation gate` step stays green.
- `docs/gov/audit/test-confidence-proof.md` continues to cite the live
  mutation score per release wave.
