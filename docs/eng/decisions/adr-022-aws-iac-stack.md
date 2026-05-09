# ADR-022: Production Provisioning And Artifact Deploy Boundary

Status: Accepted

Date: 2026-05-09

## Context

The owner decision on 2026-05-09 selects a production deployment boundary
rather than a single hosted-only environment. SGP must be deployable to AWS and
to client-premises targets. Resource provisioning/IaC and artifact deployment
must be separate lifecycle steps.

The current `infra/aws` templates remain scaffolding until parameterized. Client
premises deployments require an accepted target manifest before artifacts can be
pushed to designated hosts. Release/homologation gate composition remains
postponed for a focused owner discussion and is not decided by this ADR.

## Options

- AWS provision + AWS artifact deploy: provision resources with a reviewed IaC
  flow, then deploy images/bundles to the selected AWS targets.
- Client-prem provision handoff + client-prem artifact deploy: record the
  externally created hosts/services in a target manifest, then deploy artifacts
  to those designated targets.
- Combined provision-and-deploy command: rejected because it hides promotion
  risk and makes homologation evidence ambiguous.

## Decision

SGP uses a split production cycle:

1. Provisioning/IaC creates or changes resources.
2. Artifact deployment pushes built artifacts to already designated targets.

Supported target families are AWS and client premises. SGP must not combine
resource creation and artifact rollout in a single production promotion. The AWS
templates in `infra/aws` remain non-authoritative scaffolding until placeholders
are removed and a reviewed plan gate is retained. Client-premises deployment
must use a target manifest or equivalent retained evidence that identifies hosts,
artifact destinations, secret boundaries, and rollback points.

## Consequences

- Deployment tooling and docs must expose separate provision and artifact-deploy
  flows.
- AWS and client-premises targets are both valid, but each needs retained target
  evidence before production use.
- Production-readiness claims remain blocked on later gate evidence for the
  selected target.
- Future IaC work must include reviewable plan output, least-privilege posture,
  encryption posture, network boundaries, backup/restore posture, and rollback
  evidence.
