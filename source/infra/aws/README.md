# AWS Infrastructure Baseline

This directory contains an AWS container-stack planning baseline for SGP.

As of 2026-04-26 this is not the required production IaC path. CloudFormation, Terraform, AWS SDK automation, and AWS CLI scripts remain open options until the owner makes a final infrastructure decision.

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

## Deployment Entry Points

From `source/`:

- `npm run deploy -- --dry-run`
- `npm run deploy -- --target stage --stack cognito --dry-run`
- `npm run deploy -- --target prod --stack all --dry-run`

`--apply` is intentionally blocked in the dispatcher until placeholders are parameterized.

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

All templates in this folder are scaffolds. Replace `TODO_*` parameters and tighten IAM/network defaults before allowing apply mode, or replace this folder with the selected Terraform/AWS SDK/AWS CLI implementation after the infrastructure ADR is resolved.
