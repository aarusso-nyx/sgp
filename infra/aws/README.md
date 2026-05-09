# AWS Infrastructure Baseline

This directory contains an AWS container-stack planning baseline for SGP.

AWS is one accepted deployment target family. Resource provisioning and artifact
deployment are separate steps: provision creates resources, while deploy pushes
already built artifacts to designated AWS targets. Identity provider resources,
including Cognito when used, are owned through the `../stynx` identity boundary.

## Layout

- `templates/stack-all.yaml`: umbrella placeholder for combined stack orchestration.
- `templates/stack-cognito.yaml`: Cognito user pool/app client/domain placeholders.
- `templates/stack-rds.yaml`: RDS PostgreSQL, subnet group, parameter placeholders.
- `templates/stack-backend.yaml`: backend container runtime and API ingress placeholders.
- `templates/stack-frontend.yaml`: frontend static hosting and CDN placeholders.

## Stack Model

Shared foundations are intentionally abstracted in placeholders until account-level inputs are finalized:

- Network and security group boundaries for app/database tiers.
- Cognito hosted UI and callback/logout URL definitions.
- PostgreSQL sizing, backup, and encryption profile.
- Backend service image, scaling, and environment mapping.
- Frontend bucket, CloudFront, and DNS integration.

## Provision Entry Points

From the repository root:

- `npm run deploy -- --mode provision --provider aws --dry-run`
- `npm run deploy -- --mode provision --provider aws --target stage --stack rds --dry-run`
- `npm run deploy -- --mode provision --provider aws --target prod --stack all --dry-run`

`--apply` remains blocked until placeholders are parameterized and retained
governance evidence accepts the plan.

## Artifact Deploy Entry Points

Artifact deployment targets already-created resources and must not create or
change infrastructure:

- `npm run deploy -- --mode artifacts --provider aws --target stage --dry-run`
- `npm run deploy -- --mode artifacts --provider aws --target prod --dry-run`

Client-premises deployments use the same split cycle with
`--provider client-prem` and an accepted target manifest.

## Required Environment Variables

Document and provide these in your deployment shell or CI environment:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `AWS_PROFILE` (local usage)
- `DEPLOY_TARGET` (`stage` or `prod`)
- `BACKEND_IMAGE_URI`
- `FRONTEND_DOMAIN`
- `COGNITO_CALLBACK_URL`
- `COGNITO_LOGOUT_URL`
- `DATABASE_URL` (runtime application wiring; do not commit secrets)

## Placeholder Policy

All templates in this folder are scaffolds. Replace `TODO_*` parameters and
tighten IAM/network defaults before allowing provision apply mode. Artifact
deploy mode must remain decoupled from resource creation.
