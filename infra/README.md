# Infrastructure

AWS is the target platform for SGP modernization.

## Temporary Status

The final infrastructure implementation path is intentionally open as of 2026-04-26. CloudFormation, Terraform, AWS SDK automation, and AWS CLI scripts are all acceptable candidates until the owner selects one. Files in this directory are planning scaffolds, not a release gate.

## Layout

- `infra/aws/README.md`: AWS stack model and deployment flow.
- `infra/aws/templates/`: CloudFormation placeholder templates by stack; not a final commitment to CloudFormation.

## Stack Scope

- `cognito`: OAuth2/OIDC identity provider for frontend and API clients.
- `rds`: PostgreSQL and related networking/security dependencies.
- `backend`: containerized NestJS API runtime and ingress.
- `frontend`: static Angular hosting and CDN edge configuration.

## Security Baseline

- Never hardcode credentials, API keys, or passwords in templates.
- Resolve runtime secrets via environment variables and secret managers.
- Keep deploy operations in dry-run planning mode until the final infra approach is selected and placeholders are replaced.
