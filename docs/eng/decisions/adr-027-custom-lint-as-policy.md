---
controllers: []
migrations: []
infra:
  - eslint.config.mjs
  - backend/eslint-rules/no-math-round-money.js
runbooks: []
---

# ADR-027: Custom ESLint Rules as Repository Policy

Status: Accepted

Date: 2026-05-08

## Context

`eslint.config.mjs` registers five SGP-specific rules under
`backend/eslint-rules/`:

- `no-math-round-money` — forbids `Math.round` (and adjacent native rounding
  helpers) in money-handling code; pairs with the `decimal.js` dependency and
  the mutation-tested `backend/src/common/money/money.ts`.
- `no-hardcoded-date-in-spec` — blocks literal `Date` constructions in tests
  that should use the deterministic clock helper.
- `no-ponto-date-to-iso` — forbids native `toISOString()` calls in time-and-
  attendance code where the project's date-only formatter is required.
- `no-raw-handler-logging` — refuses `console.*` and direct logger access in
  request handlers; forces routing through the central Pino logger with PII
  redaction (`docs/gov/privacy/redactions.json`).
- `require-permission` — refuses controller methods that lack an explicit
  `@RequirePermission(...)` decorator.

These rules are policy, not style. They encode decisions that, if violated,
produce real bugs (rounding errors in payroll, PII in logs, controller routes
without authz). They were added piecemeal as failures were discovered. Without
an ADR, future maintainers may treat them as legacy curiosities.

## Decision

**Custom ESLint rules under `backend/eslint-rules/` are policy enforcement,
not stylistic preference.** Specifically:

- Each rule is configured at severity `error` in `eslint.config.mjs` and is
  enforced by `npm run lint:check` in CI.
- Rules are documented (rule name → policy intent) inline at the rule
  registration block in `eslint.config.mjs`. Rule files themselves carry a
  brief module-level comment explaining the policy and the failure pattern
  it prevents.
- Adding a new custom rule requires:
  1. evidence of a real bug class the rule prevents (incident, near-miss, or
     audit finding referenced in `docs/gov/`),
  2. a unit test for the rule, and
  3. an ADR amendment or new ADR if the rule changes a load-bearing
     repository-wide decision.
- Removing or downgrading a custom rule (severity drop, allowlist expansion)
  requires either explicit ADR supersession or evidence in `docs/gov/`
  showing the underlying bug class is no longer relevant.

## Options Considered

- Option A: Treat custom rules as informal helpers; allow ad-hoc disabling
  via `// eslint-disable-next-line` without policy review. Rejected because
  the rules guard payroll correctness, PII handling, and authorization —
  classes of bugs that warrant policy weight.
- Option B (selected): Treat custom rules as policy with explicit lifecycle
  (add/change/remove all reviewed). Matches how the rules came into being and
  keeps the lever obvious to future maintainers.
- Option C: Replace custom rules with runtime checks. Rejected because lint
  is the cheapest enforcement layer and runtime checks for the same patterns
  would impose latency or test-time cost.

## Consequences

- New code-review practice: a `// eslint-disable sgp/<rule-name>` comment
  triggers reviewer scrutiny. Disables must carry a justification and a
  follow-up tracking item.
- New custom rules cost more than ad-hoc rules: they need tests and policy
  documentation. This is intentional friction that keeps the rule set tight.
- Future expansion of `no-bare-error-throw` (introduced by ADR-related Wave 2
  work for the `DomainError` hierarchy) follows this same lifecycle.

## Verification

- `eslint.config.mjs` keeps all `sgp/*` rules at severity `error`.
- `npm run lint:check` is a hard-fail CI gate (in `.github/workflows/source-ci.yml`).
- `backend/eslint-rules/*.js` files exist for every registered rule.
- The audit at `docs/work/qa/report.md` Dimension 3 evidence cites the custom
  rule set as a load-bearing strength of the repo's code-health posture.
