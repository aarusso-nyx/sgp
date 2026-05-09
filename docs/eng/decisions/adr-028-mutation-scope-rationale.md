# ADR-028: Stryker Mutation Testing Scope Rationale

Status: Accepted

Date: 2026-05-08

## Context

`stryker.conf.cjs` scopes mutation testing to two files:

- `backend/src/common/money/money.ts`
- `backend/src/common/errors/standard-exception.filter.ts`

The recent audit at `docs/work/qa/report.md` reports a mutation score of
83.61% against this scope, well above the configured `break: 70` threshold.
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

- The current scope (`money.ts`, `standard-exception.filter.ts`) reflects
  the two highest-leverage targets: monetary computation correctness and HTTP
  exception envelope correctness. A regression in either is a class of bug
  that traditional unit tests routinely miss but mutation testing reliably
  surfaces.
- Expansion of the scope is done deliberately, one logical surface at a
  time, with a `break:` threshold appropriate to the new surface's spec
  density.
- Wave 2 of the QA scorecard lift (per `docs/work/qa/report.md` §13) commits
  to expanding the scope to **payroll engine money paths**
  (`backend/src/folha-pagamento/**/*.service.ts`) and **IAM enforcement**
  (`backend/src/iam/permissions/**/*.ts`) with `break: 60` initially. The
  threshold ratchets upward as the spec corpus catches up to the new mutants.
- Further expansion requires a new ADR or an amendment to this one,
  identifying the new surface, the rationale, and the initial threshold.

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
- `npm run test:mutation` reports a score ≥ `break:` for the listed scope.
- `.github/workflows/source-ci.yml` `Scoped mutation gate` step stays green.
- `docs/gov/audit/test-confidence-proof.md` continues to cite the live
  mutation score per release wave.
