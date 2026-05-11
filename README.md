# SGP v0.0.1 Workspace

SGP in this repository (`./sgp`) is the canonical root for a fresh implementation.

## Quickstart

From a fresh clone:

```bash
nvm use                                # Node 24 per .nvmrc
npm ci                                 # install workspace dependencies
npm run typecheck                      # backend + frontend typecheck
npm run test                           # backend unit + RLS specs
npm run start:admin                    # serve sgp-admin at http://127.0.0.1:4200
```

Common follow-ups:

- `npm run start:portal` — serve `sgp-portal` at `http://127.0.0.1:4300`.
- `npm run start:core-api` — serve `sgp-core-api` (NestJS).
- `npm run governance:check` — run the full governance gate set (lint, format, typecheck, alignment, ADRs).
- `npm run health:json` — emit runtime topology and health probes as JSON.

For background, deeper runbooks, and contribution rules see [AGENTS.md](./AGENTS.md) and [docs/eng/](./docs/eng/).

Current status entrypoints:

- Architecture and module dependency graph: `docs/eng/architecture.md`.
- Product/implementation status: `docs/eng/99-implementation-status.md`.
- Current audit ledgers and backlog: `docs/gov/audit/`.
- Operator readiness: `docs/user/operator-readiness.md`.
- AWS deployment design and operations: `infra/aws/README.md` and `infra/aws/operations/README.md`.

## Source of truth

- Engineering/product authority: `docs/eng/`
- Payroll engine authority (implementation behavior): `../folia/` and reconciled engine docs under `docs/eng/`
- SQL Server legacy reference inventory: `docs/leg/sql-reference/`
- Reverse-engineered evidence archive (non-authoritative): `docs/leg/rev-eng/`
- Current status and compiled audit context: `docs/gov/audit/`
- Governance controls, generated surfaces, and retained evidence: `docs/gov/`
- Reusable round prompts: `docs/gov/prompts/`
- User/operator docs: `docs/user/`
- Scratch work area: `docs/work/` (ignored by git)

When sources conflict on payroll engine behavior, folia takes precedence. For unresolved high-impact conflicts, escalate to the product owner.

## Repository principles

- Code artifacts are authoritative in English (database physical model, Prisma models, API/runtime artifacts).
- No backwards-compatibility shims/layers for v0.0.1.
- Specs drive architecture and acceptance; reverse docs are evidence only.

## Active implementation areas

- APIs: `backend` (`sgp-core-api` and `sgp-portal-api` entrypoints)
- Frontends: `frontend` (`sgp-admin` and `sgp-portal` Angular projects)
- Runtime topology: `docs/gov/generated/runtime-topology.json`
- Database: `database`
- Governance docs: `GOVERNANCE.md`, `docs/gov/`

See `docs/README.md` for the full documentation routing rules.
