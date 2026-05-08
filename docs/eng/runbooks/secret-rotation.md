# Secret Rotation Runbook

Owner: TBD
Last reviewed: 2026-05-07

- Preconditions: identify the secret owner, tenant impact, and downstream service reload requirements.
- Procedure: rotate through the approved secret store or deployment channel; never write real values to source or retained evidence.
- Verification: confirm service health, audit logs, and redacted observability after the rotation.
