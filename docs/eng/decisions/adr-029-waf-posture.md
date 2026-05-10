# ADR-029: WAF Posture

Status: Accepted

Date: 2026-05-10

## Context

SGP is deployed through CloudFront, a public ALB, private EC2, and private RDS as
defined by `docs/gov/generated/runtime-topology.json` and
`docs/eng/decisions/adr-022-aws-iac-stack.md`. The owner decision for the
current AWS baseline explicitly states that AWS WAF is not required by now.

This decision must be recorded as an accepted security boundary so the absence
of WAF is visible as an owner-approved posture rather than an infrastructure
omission.

## Decision

SGP does not provision AWS WAF in the current stage/prod AWS IaC baseline.
CloudFront, ALB routing, Helmet, throttling, validation, Stynx identity, tenant
authorization, RLS, audit logging, CodeQL, dependency review, and secret scanning
remain the active controls at this layer.

The WAF decision must be reopened before adding a new public origin, exposing a
new unauthenticated public surface, promoting a materially different production
traffic profile, or responding to a regulatory/customer requirement that calls
for managed edge filtering.

## Options Considered

- Managed AWS WAF rule sets on CloudFront: rejected for this baseline because
  the owner did not require WAF yet and the current scope favors minimal,
  auditable AWS primitives.
- Partial WAF only on selected paths: rejected because partial coverage creates
  ambiguous assurance unless tied to a concrete public-risk model.
- No WAF for the current baseline: accepted, with explicit reopen triggers and
  retained evidence in the runtime topology.

## Consequences

- `infra/aws/cdk/` must not silently add WAF resources without updating this ADR.
- Runtime topology must link WAF posture to ADR-029.
- Production readiness reviews must treat WAF as an explicit deferred control,
  not as an unknown.
- Edge abuse monitoring relies on CloudFront, ALB, CloudWatch, application
  throttling, and incident response until this ADR is superseded.

## Verification

- `docs/gov/generated/runtime-topology.json` records the WAF posture and links
  to this ADR.
- `npm run governance:check` must remain green after topology changes.
