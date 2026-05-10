# Release And Homologation Gate Bundle

Status date: 2026-05-09

This document records the production-promotion gate bundle that is accepted as
design evidence but not yet enabled as an artifact-apply gate. The owner
postponed the final release/homologation discussion, so production artifact
apply remains authorization-bound until that discussion closes.

## Current Gate Bundle

Artifact promotion to `prod` must not proceed when any accepted gate fails.
The current candidate bundle is:

```bash
npm run format:check
npm run lint:check
npm run typecheck
npm run test
npm run test:db
npm run api:alignment:check -- --json
npm run db:alignment:check -- --json
npm run governance:check
npm run health:json
npm run deploy -- --mode artifacts --target prod --dry-run
```

## Authorization Boundary

- `provision` creates or updates AWS resources only.
- `artifacts --dry-run` may verify gates, artifact metadata, target selection,
  SSM/PM2 shape, and rollback pointer logic.
- `artifacts --apply` now requires `--migration-evidence`,
  `--release-gate-evidence`, and `--apply-authorization` paths before it reaches
  the owner block. This prevents accidental apply even after artifact metadata is
  available.
- `artifacts --apply` still stays blocked until the owner accepts the final
  release/homologation gate composition.
- Database migrations are manual, separately evidenced, and completed before
  artifact apply.
- eSocial homologation belongs to `../stynx-esocial`; SGP homologates other
  external surfaces against deterministic mocks/contracts.

## CI Release-Impact Control

`.github/workflows/release-impact-gate.yml` checks release-impacting PRs that
touch workflows, backend, database SQL, frontend, infra, scripts, or canonical
OpenAPI artifacts. Such PRs must either update `CHANGELOG.md`, this retained
gate bundle, `docs/user/operator-readiness.md`, or state an explicit
`Release-impact: ...` marker in the PR body.

## Future Acceptance Criteria

The postponed discussion should decide:

- Required production promotion reviewers and evidence retention location.
- Whether homologation evidence is per release, per tenant, or per adapter.
- Whether release notes/changelog evidence becomes a hard CI check or a manual
  release-manager checklist.
- Whether SLO alarm acknowledgement is required before artifact promotion.
