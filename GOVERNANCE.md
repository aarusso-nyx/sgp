# SGP Governance Baseline (v0.0.1)

This repository enforces governance for a fresh SGP implementation with clear source precedence.

## Authority order

1. `docs/eng/` is authoritative for engineering and product behavior.
2. Payroll engine internals are folia-first when reconciling implementation strategies.
3. `docs/sql-reference/` is a legacy structural reference, not the runtime source.
4. `docs/legacy-reverse/` is non-authoritative evidence archive.

## Engineering conventions

- English is authoritative in code artifacts and database physical model.
- No backwards-compatibility layers, shims, or legacy compatibility schemas in runtime paths.
- Conflicts involving payroll engine behavior that remain ambiguous must be escalated to the owner before implementation proceeds.

## Scope

- Backend API (`source/backend`)
- Database schema and SQL operations (`source/database`)
- Engineering docs and governance (`docs/eng`, `docs/governance`)

## Policy status markers

- `implemented`: behavior exists in code or SQL and is validated.
- `planned`: accepted but not fully implemented.
- `blocked`: waiting on explicit owner decision.
