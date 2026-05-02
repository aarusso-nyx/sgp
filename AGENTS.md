# Project: SGP v0.0.1 Implementation

## Mission
Build and evolve a fresh SGP implementation from authoritative engineering specs and folia-enhanced payroll engine design.

## Source precedence
- `docs/eng/` is authoritative for architecture, domain scope, and acceptance.
- Payroll engine implementation decisions are folia-first.
- `docs/leg/sql-reference/` is legacy schema reference only.
- `docs/leg/` is the legacy evidence archive and must not override `docs/eng/`.
- `docs/work/` is untracked scratch space and must not be used as acceptance authority.

## Working rules
- Never commit secrets or credentials.
- Keep code artifacts in English.
- Do not add backward compatibility shims or compatibility schemas for v0.0.1.
- If a payroll engine conflict between folia and specs is high-impact and unresolved, stop and ask for owner decision.

## Documentation policy
- Keep `docs/eng/` updated when behavior changes.
- Track reverse-doc deprecation coverage in `docs/leg/rev-eng/deprecation-status.md`.
- Put governance controls in `docs/gov/`.
- Put user/operator instructions in `docs/user/`.
- Put legacy, reverse-engineered, old-spec, crawler, audit-history, and inventory material in `docs/leg/`.
- Keep ephemeral prompts, logs, generated scratch inventories, and temporary reports in `docs/work/`.
