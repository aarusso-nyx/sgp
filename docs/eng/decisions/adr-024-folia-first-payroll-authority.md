---
controllers: []
migrations: []
infra:
  - backend/src/payroll-engine/payroll-engine.service.ts
runbooks: []
---

# ADR-024: Folia-First Payroll Engine Authority

Status: Accepted

Date: 2026-05-08

## Context

`AGENTS.md §1` lists folia as the implementation authority for payroll engine
behavior, second only to `docs/eng/`. The pattern is enforced informally across
many specs — `tests/backend/calc-*.e2e-spec.ts` mirror folia's expected outputs;
`docs/eng/domains/payroll-benefits.md` reconciles formal specifications against
folia's runtime semantics; the QA inspection at `docs/work/qa/report.md`
identifies "folia-first" as a load-bearing decision that has no ADR backing.

The decision pressure: when `docs/eng/` accepted spec language conflicts with
the folia engine's actual computation (rounding, ordering of incidence,
proportionality basis, retroactive recomputation behavior), the codebase must
have one explicit tiebreaker — recorded as policy, not folklore — so future
contributors do not relitigate what was already settled.

## Decision

For payroll engine internals, **folia behavior is the implementation
tiebreaker** when reconciling against `docs/eng/` spec language. `docs/eng/`
remains highest authority for product behavior and acceptance, but where the
spec is silent, ambiguous, or contradicts an existing folia implementation, the
folia engine is the source of truth for the calculation result. Material
divergences between folia and `docs/eng/` must be escalated to the owner before
implementation continues, and the resolution must update the lower-authority
artefact (typically `docs/eng/`) to match the accepted decision.

## Options Considered

- Option A: Spec-first with folia treated as one reference implementation among
  many. Rejected because folia is in production use and the cost of forcing
  spec-only correctness on every payroll edge case is unbounded.
- Option B (selected): Folia-first within the payroll engine, spec-first
  elsewhere. Captures the practical reality that folia encodes years of
  Brazilian labor and pension regulation interpretation that no spec rewrite
  can replicate cheaply.
- Option C: Pure spec-first across the whole repo. Rejected for the same reason
  as Option A and because it would invalidate large parts of the existing
  `tests/backend/calc-*.e2e-spec.ts` corpus.

## Consequences

- Payroll engine code reviews accept folia parity as evidence; spec parity
  comes second when the two diverge on a calculation.
- New payroll specs must cite folia behavior alongside the accepted
  `docs/eng/domains/payroll-benefits.md` clauses they implement.
- When folia and `docs/eng/` disagree materially, the workflow is
  escalate-to-owner → update lower-authority artefact → land code; never
  silently weaken the implementation.
- Audit and governance gates already reflect this: `docs/gov/audit/` test
  evidence is folia-aligned; this ADR makes the alignment explicit.

## Verification

- `AGENTS.md §1` clause "Payroll-engine implementation decisions are
  folia-first" remains present.
- `docs/eng/domains/payroll-benefits.md` reconciliation sections reference
  folia behavior as the implementation baseline.
- `tests/backend/calc-*.e2e-spec.ts` continues to encode folia-aligned
  expected outputs; `npm run test:e2e` is the standing gate.
