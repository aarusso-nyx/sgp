# Infrastructure

SGP has one automated infrastructure target: AWS. Client-premises remains a
manual/external handoff, not an automated provider in this repository.

## Accepted Boundary

Provisioning/IaC and artifact deployment are separate flows:

- Provision creates or changes AWS resources with CDK TypeScript.
- Artifact deploy pushes built SGP bundles to already designated AWS hosts.

Release/homologation gate composition remains postponed for a focused owner
discussion. Artifact apply stays blocked until that gate is accepted.

## Layout

- `infra/aws/cdk/`: authoritative AWS CDK TypeScript app.
- `infra/aws/operations/`: PM2, CloudWatch Agent, deploy, and rollback host
  assets.
- `infra/aws/targets/`: AWS target manifests for stage/prod artifact deploy.

## Stack Scope

- Identity: delegated to `../stynx`; SGP consumes Stynx-owned Cognito/JWKS/claim
  settings but does not provision identity resources.
- Database: RDS PostgreSQL, private subnets, encrypted storage.
- Backend: one private Amazon Linux 2023 EC2 host per environment, PM2-managed.
- Frontend: S3 + CloudFront, with one public domain per environment.
- Messaging: SQS only in prod; stage uses DB-backed workers and local/mock
  transports.

## Security Baseline

- Never hardcode credentials, API keys, passwords, or production secrets.
- Use SSM Session Manager only; no public SSH.
- Keep EC2 and RDS private.
- Use VPC endpoints instead of NAT for AWS service access.
- Keep artifact deploy decoupled from resource creation.
