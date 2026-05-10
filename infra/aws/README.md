# AWS Infrastructure Baseline

SGP uses AWS CDK TypeScript for the automated deployment target. There is no
provider abstraction in the deploy tooling: AWS is the only automated path.

Provisioning and artifact deployment are separate lifecycle steps. Provisioning
creates or changes AWS resources. Artifact deployment pushes a built SGP release
to the already provisioned EC2 host and reloads PM2.

## Target Model

| Target  | Domain                                   | Resource Prefix | Runtime                                                             |
| ------- | ---------------------------------------- | --------------- | ------------------------------------------------------------------- |
| `stage` | `sgp-stage.detran-am.sistematech.com.br` | `sgp-stage-*`   | One private EC2 host running APIs, services, and workers under PM2. |
| `prod`  | `sgp.detran-am.sistematech.com.br`       | `sgp-prod-*`    | One private EC2 host running APIs, services, and workers under PM2. |

Use `AWS_PROFILE=detran-am`. Dev remains local only.

## Layout

- `cdk/`: CDK TypeScript app for VPC, ALB, EC2, RDS, S3, CloudFront, Route53,
  ACM, KMS, Secrets Manager/SSM, CloudWatch, IAM, and prod-only SQS.
- `operations/`: PM2, CloudWatch Agent, deploy, and rollback host-side assets
  copied into release artifacts.
- `targets/`: retained AWS target manifests used by artifact deploy dry-runs
  and later apply flows.

The old CloudFormation placeholder templates were removed; CDK is now the
authoritative IaC surface.

## Provision Commands

From the repository root:

```bash
npm run deploy -- --mode provision --target stage --dry-run
npm run deploy -- --mode provision --target prod --dry-run
npm run deploy -- --mode provision --target stage --stack app --apply
```

Dry-run prints the exact CDK synth/diff commands and does not contact AWS. Apply
delegates to `npm --prefix infra/aws/cdk run deploy`.

The CDK app also supports direct validation:

```bash
AWS_PROFILE=detran-am AWS_REGION=sa-east-1 AWS_ACCOUNT_ID=<account> ROUTE53_HOSTED_ZONE_ID=<zone-id> \
  npm --prefix infra/aws/cdk run synth -- -c target=stage -c hostedZoneId=<zone-id>
```

Offline CI/local synth can omit `AWS_ACCOUNT_ID` and still produce a template:

```bash
AWS_REGION=sa-east-1 ROUTE53_HOSTED_ZONE_ID=<zone-id> \
  npm --prefix infra/aws/cdk run synth:stage
AWS_REGION=sa-east-1 ROUTE53_HOSTED_ZONE_ID=<zone-id> \
  npm --prefix infra/aws/cdk run synth:prod
```

`hostedZoneId` may be supplied from `ROUTE53_HOSTED_ZONE_ID`. The CDK app uses
explicit hosted-zone attributes instead of synth-time Route53 lookups so CI can
synthesize plans deterministically. Real apply must supply the actual Route53
hosted zone id for `detran-am.sistematech.com.br`.

## Artifact Deploy Commands

Artifact deployment never creates or changes infrastructure:

```bash
npm run deploy -- --mode artifacts --target stage --dry-run
npm run deploy -- --mode artifacts --target prod --dry-run
```

Apply mode requires:

- Accepted target manifest in `infra/aws/targets/`.
- Versioned S3 artifact URI.
- Release id.
- Manual DB migration evidence path.
- Accepted release-gate evidence path.
- Artifact-apply authorization evidence path.
- Later owner decision accepting release/homologation gates.

Until that release/homologation gate is accepted, artifact apply remains blocked
by the dispatcher.

## Runtime Baseline

- Amazon Linux 2023, `t4g.small`, arm64.
- SSM only; no public SSH.
- EC2/RDS in private isolated subnets; ALB in public subnets.
- VPC endpoints only, including S3, SSM, CloudWatch Logs/Monitoring, Secrets
  Manager, KMS, and prod SQS.
- RDS PostgreSQL: stage single-AZ, prod multi-AZ.
- Customer-managed KMS keys with rotation protect RDS storage, runtime secrets,
  S3 buckets, CloudWatch logs, and prod SQS queues. EC2 root volumes are
  encrypted and use the account EBS encryption default in this baseline.
- CloudWatch alarms cover ALB 5xx responses and unhealthy core API targets.
- Frontend and document buckets are shared physical buckets with environment
  prefixes:
  - `s3://frontend.detran-am.sistematech.com.br/${ENV}/...`
  - `s3://sgp-docs.detran-am.sistematech.com.br/${ENV}/${TENANT}/...`
- Public path:
  - CloudFront `/api/*` -> ALB.
  - CloudFront `/portal/*` -> portal frontend prefix.
  - CloudFront `/admin/*` and `/` -> admin frontend prefix.
- ALB routes:
  - `/api/v1/portal/*` and `/api/portal/*` -> `sgp-portal-api:3001`.
  - `/api/v1/report-service/*` -> `sgp-report-service:3305`.
  - default `/api/*` -> `sgp-core-api:3000`.
- `sgp-payroll-engine:3302` and worker readiness ports remain private.

## Identity Boundary

Identity is delegated to Stynx. SGP provisions no Cognito/User Pool resources.
SGP still consumes Stynx-owned Cognito/token verification values at runtime:

- `COGNITO_ISSUER` or `COGNITO_REGION` + `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_JWKS_URI` when Stynx provides an explicit JWKS URL
- `COGNITO_TOKEN_USE`
- Stynx claim-mapping/runtime endpoint values defined by the framework
  integration
