# ADR-022: AWS IaC Stack Postponement

Status: Postponed

Date: 2026-05-08

## Context

The QA inspection report at `docs/work/qa/report.md` identifies AWS infrastructure as a release-readiness gap. The current `infra/aws` templates are scaffolding, and the deployment dispatcher keeps `--apply` blocked until an owner chooses and accepts a production IaC path.

SGP v0.0.1 will not implement final production IaC in the QA scorecard closure lift. This ADR records the postponement boundary: infrastructure readiness remains explicitly out of current implementation scope, and SGP must not claim production deployment maturity until a later owner-approved infrastructure wave lands.

## Options

- CDK for TypeScript: keeps the stack close to the TypeScript workspace and can reuse familiar review patterns.
- Terraform: provides a widely used declarative IaC baseline with mature plan/apply review flow.
- AWS SDK orchestration: can model custom provisioning flows but increases bespoke runtime code and review burden.
- AWS CLI scripts: simple for experiments but weak for durable review, drift detection, and reusable environments.

## Decision

Infrastructure implementation is postponed. No stack is selected by this ADR. The dispatcher `--apply` block remains in place until the repository owner accepts one IaC path, the placeholder parameters are removed, and the resulting plan/diff gate is retained in governance evidence.

## Consequences

- Production-readiness claims remain blocked on a later accepted ADR or implementation round.
- Existing CloudFormation placeholder files remain non-authoritative scaffolding.
- Future IaC work must include reviewable plan output, least-privilege IAM posture, encryption posture, network boundaries, backup/restore posture, and rollback evidence.
