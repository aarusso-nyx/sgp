# ADR-022: AWS CDK Provisioning And PM2 Artifact Deploy Boundary

Status: Accepted

Date: 2026-05-09

## Context

The owner decision on 2026-05-09 selects a split production deployment cycle:
resource provisioning/IaC and artifact deployment are separate lifecycle steps.
Later owner decisions narrow automated SGP deployment to AWS only, with no
Docker, no ECR image rollout, and no provider abstraction in the repository
dispatcher.

Production uses `sgp.detran-am.sistematech.com.br`. Stage uses
`sgp-stage.detran-am.sistematech.com.br`. Dev remains local only.

Identity is delegated to `../stynx`. Stynx can own Cognito and must provide the
issuer, JWKS, client, token-use, and claim mapping values that SGP consumes at
runtime. SGP does not provision identity resources.

Release/homologation gate composition remains postponed for a focused owner
discussion and is not decided by this ADR.

## Options

- AWS CDK provision + PM2 artifact deploy: accepted.
- Docker/ECR image rollout on EC2: rejected by owner decision.
- Client-premises automated provider in this repo: rejected for this baseline.
- Combined provision-and-deploy command: rejected because it hides promotion
  risk and makes homologation evidence ambiguous.

## Decision

SGP uses AWS CDK TypeScript as the authoritative IaC surface. The deployment
cycle remains split:

1. Provisioning/IaC creates or changes AWS resources.
2. Artifact deployment pushes a versioned Node/Angular bundle to already
   provisioned AWS targets.

AWS resources use `AWS_PROFILE=detran-am` and environment-scoped names/tags
(`sgp-stage-*`, `sgp-prod-*`). Stage and prod each run one private Amazon Linux
2023 `t4g.small` arm64 EC2 host with PM2 managing all SGP backend entrypoints.
APIs/services run in PM2 cluster mode; workers run in fork mode, one instance
per worker.

The AWS runtime baseline is:

- EC2 and RDS in private subnets.
- ALB in public subnets.
- CloudFront as the public entrypoint.
- SSM only; no public SSH.
- VPC endpoints only; no NAT dependency.
- RDS PostgreSQL single-AZ for stage and multi-AZ for prod.
- S3 + CloudFront for frontend assets.
- One documents bucket with `${ENV}/${TENANT}/...` object prefixes.
- Customer-managed KMS keys with automatic rotation for RDS, Secrets Manager,
  S3, CloudWatch logs, and prod SQS. EC2 root EBS volumes are encrypted using
  the account EBS encryption default in this baseline.
- CloudWatch alarms for ALB 5xx responses and unhealthy API targets.
- SQS only in prod; stage keeps DB-backed workers and local/mock transports.
- PM2 stdout/stderr captured by CloudWatch Agent with JSON logs preserved.

CloudFront routes `/api/*` to ALB, `/portal/*` to the portal frontend prefix,
and `/admin/*` plus `/` to the admin frontend prefix. The frontend base API path
is always `/api`.

ALB routes `/api/v1/portal/*` and `/api/portal/*` to `sgp-portal-api:3001`,
`/api/v1/report-service/*` to `sgp-report-service:3305`, and remaining
`/api/*` traffic to `sgp-core-api:3000`. `sgp-payroll-engine:3302` remains
private unless a later owner decision exposes it.

## Consequences

- `infra/aws/cdk/` is the authoritative AWS IaC implementation.
- `infra/aws/templates/` CloudFormation placeholders are retired.
- `scripts/run.mjs deploy` no longer exposes provider selection; AWS is assumed.
- Provision apply can run CDK deploy after owner-reviewed parameters are present.
- Artifact apply remains blocked until release/homologation gates are accepted.
- Runtime configuration must accept operator-facing `s3://bucket/` values while
  normalizing them to bare bucket names before AWS SDK calls.
