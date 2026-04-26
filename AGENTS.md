# Project: SGP v0.0.1 Implementation

## Mission
Build and evolve a fresh SGP implementation from authoritative engineering specs and folia-enhanced payroll engine design.

## Source precedence
- `docs/eng/` is authoritative for architecture, domain scope, and acceptance.
- Payroll engine implementation decisions are folia-first.
- `docs/sql-reference/` is legacy schema reference only.
- `docs/legacy-reverse/` is evidence archive and must not override `docs/eng/`.

## Working rules
- Never commit secrets or credentials.
- Keep code artifacts in English.
- Do not add backward compatibility shims or compatibility schemas for v0.0.1.
- If a payroll engine conflict between folia and specs is high-impact and unresolved, stop and ask for owner decision.

## Documentation policy
- Keep `docs/eng/` updated when behavior changes.
- Track reverse-doc deprecation coverage in `docs/legacy-reverse/deprecation-status.md`.
