# Secret Rotation Runbook

Owner: SGP platform operator
Last reviewed: 2026-05-10

## Scope

- RDS master credentials are generated in AWS Secrets Manager by the CDK stack
  and rotated every 30 days through the single-user rotation Lambda.
- Stynx/Cognito identity values are consumed from the
  `sgp-<env>/runtime/stynx-identity` runtime secret. Stynx owns the upstream
  identity material and supplies replacement values; SGP does not rotate or
  administer Cognito.
- SGP does not manage JWT signing keys in this baseline. If a future owner
  decision introduces SGP-owned signing keys, they must be created in Secrets
  Manager with an explicit rotation schedule before production use.

## Preconditions

- Confirm the target environment and AWS profile:
  `AWS_PROFILE=detran-am`.
- Confirm the app host can reach the RDS endpoint from private subnets.
- Confirm the Secrets Manager VPC endpoint is healthy for the target VPC.
- Identify tenant impact and whether any runtime reload is required.

## RDS Rotation

1. Verify the CDK stack contains the rotation schedule:
   `npm --prefix infra/aws/cdk run synth -- -c target=<stage|prod>`.
2. In AWS Secrets Manager, inspect `sgp-<env>/rds/sgp` and verify the next
   rotation date is within 30 days.
3. For manual break-glass rotation, use Secrets Manager `Rotate secret` on
   `sgp-<env>/rds/sgp`; do not write generated credentials into source,
   tickets, or retained evidence.
4. Wait for the rotation Lambda to finish all steps successfully.
5. Confirm API readiness through `/api/v1/health/ready` and review
   CloudWatch logs for authentication failures.

## Stynx Runtime Identity Secret

1. Receive replacement values from the Stynx operator through the approved
   secret channel.
2. Update the `sgp-<env>/runtime/stynx-identity` secret value in AWS Secrets
   Manager.
3. Reload PM2 processes through SSM so new environment values are consumed.
4. Confirm login/session validation against Stynx-issued claims in stage before
   production promotion.

## Verification

- `npm run deploy -- --mode provision --target <stage|prod> --dry-run`
- `npm --prefix infra/aws/cdk run synth -- -c target=<stage|prod>`
- CloudWatch: no sustained authentication failures after rotation.
- Logs remain JSON and PII/secret redaction remains active.
