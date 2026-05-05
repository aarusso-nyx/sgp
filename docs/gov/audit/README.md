# Audit Governance

Audit signals are written in two layers:

- Domain mutation events in `public.audit_event`.
- Operational document download records in `public.document_download_audit`.

## Required Event Fields

- `occurred_at`
- `action`
- `resource_type`
- `resource_id`
- `request_id`
- actor context (`actor_sub`, `actor_login`) when available

## Current Status

- API mutation controllers append audit events after successful writes.
- Request IDs are propagated via middleware and included in error/audit records.
- Long-term retention and legal-hold procedures are not yet formalized.

## Snapshot Tooling Lifecycle

Audit round snapshots are generated from live repository state instead of LLM
source walks. The `npm run audit:*` helpers are deterministic extractors used by
the outer round loop:

- `audit:schema`, `audit:api`, `audit:fr`, `audit:tests`, `audit:hotspots`, and
  `audit:pvd` refresh current snapshot material under this governance tree.
- Machine-readable inventories live under `docs/gov/audit/inv/round-<n>/`.
- Narrative diagnostics live under `docs/gov/audit/diag/round-<n>/`.
- `audit:backlog` consumes an explicit `docs/work/round-<n>/closure.json` and is
  not part of the default `audit:all` refresh.

## Functional-Requisite Test Mapping

`npm run audit:tests -- --round <n>` maps spec files to
`docs/gov/audit/functional-requisites.md` rows in two passes:

1. Explicit tags in spec files. Add `// @sgp-fr FR-XXXXXX` near the top of a
   spec when a test intentionally proves a functional requisite. A single tag
   can list multiple comma-separated IDs.
2. Heuristic fallback. Specs without explicit tags are matched by stable terms
   from the FR requirement text against describe blocks, route literals, entity
   references, and the spec path.

The explicit tag is preferred for narrow or cross-cutting specs because it is
stable across file renames and avoids broad term collisions. The heuristic pass
keeps the audit useful for legacy specs until they are annotated during normal
test maintenance.

The helpers are non-mutating for product code. They may refresh audit snapshot
files under `docs/gov/audit/`, but must not edit `backend/`, `frontend/`, or
`database/`.
