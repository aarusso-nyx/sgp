# Disaster Recovery Runbook

Owner: Platform Operations
Last reviewed: 2026-05-10

## Scope

This runbook covers SGP disaster recovery for the AWS stage and prod
environments defined in `docs/gov/generated/runtime-topology.json` and
`docs/eng/decisions/adr-022-aws-iac-stack.md`.

Dev remains local only and is recovered by reinstalling the workspace and
rebuilding the local database from canonical SQL and deterministic seeds.

## Recovery Targets

| Environment | Public domain                            | RTO     | RPO        |
| ----------- | ---------------------------------------- | ------- | ---------- |
| Stage       | `sgp-stage.detran-am.sistematech.com.br` | 4 hours | 24 hours   |
| Prod        | `sgp.detran-am.sistematech.com.br`       | 2 hours | 15 minutes |

The prod RTO assumes the application tier can be restored from the latest
versioned artifact and that RDS point-in-time recovery is available. The prod
RPO is bounded by RDS PITR and application evidence confirming the last accepted
manual migration.

## Preconditions

- Confirm the incident commander and communications owner.
- Identify affected environment, tenant scope, and approximate start time.
- Freeze artifact deploys and manual database migrations for the affected
  environment.
- Preserve CloudWatch logs, ALB access logs, CloudFront logs, RDS event history,
  and SSM command history.
- Locate the last accepted artifact, release gate evidence, migration evidence,
  and rollback pointer.

## RDS Point-In-Time Recovery

Use `docs/eng/runbooks/backup-restore.md` as the detailed restore procedure.
The DR-specific sequence is:

1. Select a restore point before the incident start time and create an isolated
   RDS restore target.
2. Run database smoke, DB alignment, FK coverage, and tenant isolation probes
   against the isolated target.
3. Compare migration evidence with the restored database state.
4. Switch application runtime configuration only after owner approval and a
   recorded rollback path.
5. Keep the compromised or failed database retained until evidence collection
   and post-incident review are complete.

Verification commands:

```bash
DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db
npm run db:alignment:check -- --json
npm run db:fk-coverage:check
```

## S3 And KMS Recovery

SGP document and frontend buckets use AWS-managed regional durability. Cross
region replication is not enabled in the current baseline. If regional recovery
is required, restore from the latest retained object versions or backups into a
new bucket and update runtime parameters only after owner approval.

KMS customer-managed keys use automatic rotation in-region. Key material is not
exported. If a regional KMS failure blocks recovery, create replacement keys in
the recovery region, re-encrypt restored data as part of the recovery plan, and
record the key aliases and affected object prefixes in the incident evidence.

## Application And Edge Recovery

1. Confirm CloudFront distribution, ALB, target groups, and Route53 alias state.
2. If the EC2 Auto Scaling Group is unhealthy, replace failed instances and
   verify SSM registration before artifact apply.
3. Apply the previous accepted artifact when the current artifact is suspected.
4. Reload PM2 and verify `/api/v1/health` and `/api/v1/health/ready`.
5. For edge failures, invalidate only the affected CloudFront paths after the
   origin is healthy.
6. If Route53 failover is required, create the change set, review it with the
   incident commander, and record the change ID.

Health checks:

```bash
npm run deploy -- --mode artifacts --target prod --dry-run
curl -fsS https://sgp.detran-am.sistematech.com.br/api/v1/health
curl -fsS https://sgp.detran-am.sistematech.com.br/api/v1/health/ready
```

## Communications Tree

| Role               | Responsibility                                                                      |
| ------------------ | ----------------------------------------------------------------------------------- |
| Incident commander | Declares severity, owns the incident timeline, approves recovery steps.             |
| Platform operator  | Executes AWS, database, artifact, and PM2 recovery actions.                         |
| Product owner      | Approves user-facing status, tenant prioritization, and business impact statements. |
| Compliance owner   | Determines LGPD/regulatory notification obligations and evidence retention.         |
| Support lead       | Coordinates tenant communications and post-recovery confirmation.                   |

All status messages must include environment, affected tenants when known, user
impact, current mitigation, next update time, and whether data integrity is
confirmed or still under review.

## Tabletop Drill

Next scheduled drill: 2026-06-15.

Checklist:

- Restore prod-like RDS snapshot into an isolated target.
- Apply the previous versioned artifact and verify PM2 process health.
- Exercise CloudFront and ALB health-check validation.
- Confirm KMS key aliases and Secrets Manager references are recoverable.
- Confirm S3 document prefix evidence for one non-production tenant.
- Run the database and route-alignment verification commands.
- Capture RTO and RPO actually achieved during the drill.
- Record gaps, owners, and due dates in `docs/gov/audit/`.

## Post-Incident Review Template

```markdown
# SGP Post-Incident Review

- Incident ID:
- Environment:
- Start time:
- Detection time:
- Mitigation time:
- Recovery time:
- Actual RTO:
- Actual RPO:
- Affected tenants:
- User impact:
- Root cause:
- What worked:
- What failed:
- Evidence retained:
- Follow-up actions:
```
