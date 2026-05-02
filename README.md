# SGP v0.0.1 Workspace

SGP in this repository (`./sgp`) is the canonical root for a fresh implementation.

## Source of truth

- Engineering/product authority: `docs/eng/`
- Payroll engine authority (implementation behavior): `../folia/` and reconciled engine docs under `docs/eng/`
- SQL Server legacy reference inventory: `docs/sql-reference/`
- Reverse-engineered evidence archive (non-authoritative): `docs/legacy-reverse/`

When sources conflict on payroll engine behavior, folia takes precedence. For unresolved high-impact conflicts, escalate to the product owner.

## Repository principles

- Code artifacts are authoritative in English (database physical model, Prisma models, API/runtime artifacts).
- No backwards-compatibility shims/layers for v0.0.1.
- Specs drive architecture and acceptance; reverse docs are evidence only.

## Active implementation areas

- APIs: `backend` (`sgp-core-api` and `sgp-portal-api` entrypoints)
- Frontends: `frontend` (`sgp-admin` and `sgp-portal` Angular projects)
- Runtime topology: `docs/governance/runtime-topology.json`
- Database: `database`
- Governance docs: `GOVERNANCE.md`, `docs/governance/`
