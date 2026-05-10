# KMS Rotation Runbook

Status date: 2026-05-09

SGP AWS resources use customer-managed KMS keys created by CDK with automatic
annual key rotation enabled. The key aliases are environment-scoped:

- `alias/sgp-stage/database` and `alias/sgp-prod/database`
- `alias/sgp-stage/runtime-secrets` and `alias/sgp-prod/runtime-secrets`
- `alias/sgp-stage/logs` and `alias/sgp-prod/logs`
- `alias/sgp-prod/sqs`
- `alias/sgp-stage/storage` and `alias/sgp-prod/storage`

EC2 root EBS volumes are encrypted in the Auto Scaling Group. This CDK baseline
uses the account EBS encryption default for root volumes because the
AutoScalingGroup block-device helper in the pinned CDK version does not expose a
per-volume CMK field. If a future owner decision requires a dedicated EBS CMK,
move the app host to an explicit launch template and record the service-linked
role grant.

## Normal Rotation

1. Confirm the CDK stack still reports `enableKeyRotation=true` for each CMK.
2. Verify RDS, S3, Secrets Manager, SQS, EBS, and CloudWatch Logs resources are
   using the expected alias for their environment.
3. Run the application health checks after AWS rotates backing key material:

```bash
npm run health:json
npm run deploy -- --mode artifacts --target stage --dry-run
```

## Manual Key Replacement

Manual replacement is a controlled maintenance action. Do not replace keys in
production without a migration window and owner approval.

1. Add a new CDK key and alias for the target resource class.
2. Deploy the provision stack.
3. Re-encrypt or copy affected data according to the AWS service runbook.
4. Run SGP health checks and document CloudWatch log continuity.
5. Retain the old key until all encrypted historical data ages out or is
   re-encrypted and verified.

Plaintext PII columns are not dropped as part of KMS rotation. Database-level
PII encryption/backfill remains governed by the LGPD encryption runbook and SQL
schedule.
