# Deploy Rollback Runbook

Owner: TBD
Last reviewed: 2026-05-07

- Preconditions: identify the target runtime, deployed SHA, migration state, and rollback window.
- Procedure: deploy the previously accepted artifact or disable the faulty runtime behind the approved release control.
- Verification: run `npm run health:json`, smoke the affected URL or runtime, and retain incident evidence.
