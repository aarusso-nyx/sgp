# Infrastructure

SGP supports AWS and client-premises deployment targets.

## Accepted Boundary

Provisioning/IaC and artifact deployment are separate flows. Provisioning creates
or changes infrastructure resources. Artifact deployment pushes built images,
bundles, SQL packs, and runtime configuration to already designated AWS services
or client-premises hosts.

Release/homologation gate composition remains postponed for a focused owner
discussion. Files in this directory are planning scaffolds unless a later
target-specific provision plan is accepted as retained evidence.

## Layout

- `infra/aws/README.md`: AWS stack model and split provision/deploy flow.
- `infra/aws/templates/`: CloudFormation placeholder templates by stack; not a final commitment to CloudFormation.

## Stack Scope

- `identity`: delegated to `../stynx`; AWS Cognito can be a Stynx-owned provider.
- `rds`: PostgreSQL and related networking/security dependencies.
- `backend`: containerized NestJS API runtime and ingress.
- `frontend`: static Angular hosting and CDN edge configuration.

## Security Baseline

- Never hardcode credentials, API keys, or passwords in templates.
- Resolve runtime secrets via environment variables and secret managers.
- Keep provision operations in dry-run planning mode until placeholders are
  replaced and a reviewed plan is retained.
- Keep artifact deployment pointed only at accepted AWS or client-premises target
  manifests. Never commit host credentials or production secrets.
