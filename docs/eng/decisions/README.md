# Architecture Decision Records

SGP keeps Architecture Decision Records under `docs/eng/decisions/`. This
location is authoritative for engineering decisions because `docs/eng/` owns
product behavior, architecture, domain scope, acceptance, ADRs, and test
strategy.

## Status Policy

Allowed `Status:` values:

- `Proposed` — drafted, not yet accepted for implementation.
- `Accepted` — approved and current.
- `Postponed` — explicitly deferred until an owner reopens the decision.
- `Superseded` — replaced by a later ADR.

Every ADR must:

- start with a `# ADR-NNN: ...` heading,
- include one `Status:` line using an allowed status,
- include a `Date:` line,
- explain the decision boundary and consequences,
- avoid using `docs/work/**` as acceptance authority.

## Index

| ADR                                                         | Status    | Decision                                                                                                               |
| ----------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| [ADR-021](adr-021-icp-signer-software-certificate.md)       | Accepted  | SGP uses A1/software certificates for ICP-Brasil-style signing inside the SGP boundary.                                |
| [ADR-022](adr-022-aws-iac-stack.md)                         | Postponed | Final production infrastructure strategy is postponed until owner selection and retained deployment evidence.          |
| [ADR-023](adr-023-lgpd-international-transfer-mechanism.md) | Accepted  | SGP records LGPD international transfer mechanisms and public active summaries.                                        |
| [ADR-024](adr-024-folia-first-payroll-authority.md)         | Accepted  | Folia engine behavior is the implementation tiebreaker for payroll calculations against `docs/eng/` spec language.     |
| [ADR-025](adr-025-stynx-package-boundary.md)                | Accepted  | `@stynx/*` and `@stynx-web/*` packages are vendored framework dependencies with a documented contract boundary.        |
| [ADR-026](adr-026-rls-default-tenancy.md)                   | Accepted  | Row-Level Security on every tenant-scoped PostgreSQL table is mandatory and enforced by per-entity cross-tenant specs. |
| [ADR-027](adr-027-custom-lint-as-policy.md)                 | Accepted  | Custom ESLint rules under `backend/eslint-rules/` are policy enforcement with an explicit add/change/remove lifecycle. |
| [ADR-028](adr-028-mutation-scope-rationale.md)              | Accepted  | Stryker mutation scope is intentionally narrow; expansion is a deliberate amendment, not an accident.                  |
