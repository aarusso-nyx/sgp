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

| ADR                                                   | Status    | Decision                                                                                                      |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| [ADR-021](adr-021-icp-signer-software-certificate.md) | Accepted  | SGP uses A1/software certificates for ICP-Brasil-style signing inside the SGP boundary.                       |
| [ADR-022](adr-022-aws-iac-stack.md)                   | Postponed | Final production infrastructure strategy is postponed until owner selection and retained deployment evidence. |
