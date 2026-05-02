# SGP Documentation Map

`docs/` is split by authority and lifecycle. Keep new documentation in the
smallest directory that matches its purpose.

## Directories

- `eng/`: authoritative engineering docs, product specs, architecture
  decisions, route/database alignment, and implementation status for SGP v0.0.1.
- `leg/`: legacy-only material. This includes reverse-engineering evidence,
  SQL Server reference inventories, historical audits, old specs, crawler output,
  handoff notes, and other non-authoritative source material.
- `gov/`: governance controls, readiness manifests, health/preflight docs, and
  machine-readable governance state.
- `user/`: user-facing and operator-facing docs such as local setup,
  environment variables, and test/QA command usage.
- `work/`: scratch working area for prompts, logs, generated inventories,
  temporary reports, and other ephemeral material. This directory is ignored by
  git and must not be cited as authoritative evidence.

## Source Precedence

1. `eng/` is authoritative for architecture, domain scope, contracts, and
   acceptance.
2. Payroll-engine internals are folia-first when implementation strategy
   conflicts with general specs.
3. `leg/sql-reference/` is a legacy structural reference only.
4. `leg/rev-eng/` and other `leg/` material are evidence archives only and must
   be succeeded into `eng/` before becoming current product/runtime truth.

## Routing Rules

- Put current behavior/spec changes in `eng/`.
- Put governance gates and manifests in `gov/`.
- Put operator instructions in `user/`.
- Put historical or legacy-derived evidence in `leg/`.
- Put throwaway execution artifacts in `work/`; do not commit them.
- Do not store secrets, credentials, live tokens, or environment-specific values
  anywhere under `docs/`.
