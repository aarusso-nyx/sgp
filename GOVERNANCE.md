# SGP Governance Baseline (v0.0.1)

This repository enforces governance for a fresh SGP implementation with clear source precedence.

## Authority order

1. `docs/eng/` is authoritative for engineering and product behavior.
2. Payroll engine internals are folia-first when reconciling implementation strategies.
3. `docs/leg/sql-reference/` is a legacy structural reference, not the runtime source.
4. `docs/leg/rev-eng/` and other `docs/leg/` material are non-authoritative
   evidence archives.
5. `docs/work/` is ignored scratch space and is never authoritative.

## Engineering conventions

- English is authoritative in code artifacts and database physical model.
- No backwards-compatibility layers, shims, or legacy compatibility schemas in runtime paths.
- Conflicts involving payroll engine behavior that remain ambiguous must be escalated to the owner before implementation proceeds.

## Scope

- Backend API (`backend`)
- Database schema and SQL operations (`database`)
- Engineering docs and governance (`docs/eng`, `docs/gov`)
- User/operator docs (`docs/user`)
- Legacy evidence archive (`docs/leg`)

## Policy status markers

- `implemented`: behavior exists in code or SQL and is validated.
- `planned`: accepted but not fully implemented.
- `blocked`: waiting on explicit owner decision.
