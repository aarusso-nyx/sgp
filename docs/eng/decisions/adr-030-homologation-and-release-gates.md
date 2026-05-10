---
controllers: []
migrations: []
infra:
  - .github/workflows/deploy-prod.yml
  - scripts/run.mjs
runbooks:
  - docs/eng/runbooks/deploy-rollback.md
---

# ADR-030: Homologation And Release Gates

Status: Accepted

Date: 2026-05-10

## Context

ADR-022 split AWS provisioning from artifact deployment and intentionally left
release/homologation gate composition for a later owner decision. SGP now needs
a retained production-promotion contract so artifact apply is separate from
resource provisioning and cannot bypass evidence, reviewer approval, or
regulatory sign-off.

SGP external homologation boundaries are:

- eSocial homologation belongs to `../stynx-esocial`.
- SGP-owned external surfaces use deterministic mocks/contracts unless a later
  owner decision reopens a real-service homologation boundary.
- Identity, admin surfaces, and storage controls remain delegated to `../stynx`.

## Decision

SGP uses GitHub Environments for release promotion. The `stage` environment is
used for homologation rehearsal and the `prod` environment requires manual
approval by configured reviewers before artifact deployment steps run.

The production release gate requires accepted evidence for:

- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
- `npm run test:e2e`
- `npm run governance:check`
- `npm run evidence:check`
- `npm run api:alignment:check -- --json`
- `npm run db:alignment:check -- --json`
- `npm run health:json`
- manual database migration evidence when migrations are required
- manual regulatory-delta sign-off when release contents affect payroll,
  privacy, audit, fiscal, banking, TCE/SIAFIC, or other regulated outputs

Artifact deployment to prod must reference a release-gate evidence file and an
apply-authorization file. Provisioning/CDK deploy remains a separate lifecycle
step and must not deploy application artifacts.

For the current EC2/PM2 baseline, rollout uses rolling replacement through ALB
target health. Canary or blue-green target-group promotion is the preferred
future enhancement when a second target group is introduced.

## Options Considered

- GitHub Environments with required reviewers: accepted because it is explicit,
  auditable, and fits the existing GitHub Actions deployment path.
- Pure CI-gate promotion without manual review: rejected for prod because
  regulated payroll and HR releases require owner sign-off on release impact.
- Combined provision and artifact apply: rejected by ADR-022 and kept rejected.
- Immediate blue-green deployment: deferred because current infrastructure uses
  one app target group per environment and rolling deploy is the accepted
  baseline.

## Consequences

- `deploy-prod.yml` must reference `environment: prod` before artifact apply.
- Repo settings must configure the `prod` GitHub Environment with required
  reviewers from CODEOWNERS or named owner delegates.
- Artifact apply remains blocked unless gate evidence and apply authorization
  are supplied.
- Release-impacting changes must carry changelog/release evidence and ADR links
  when they change public contracts or operational topology.
- The release gate can evolve without changing the AWS provider boundary.

## Verification

- `ROADMAP.md` references ADR-030 instead of marking release/homologation gates
  as postponed.
- `.github/workflows/deploy-prod.yml` should use the `prod` GitHub Environment
  when Worker 2.7 implements the workflow gate.
- `npm run governance:check` must remain green.
