# Infra and Scripts Agent Prompt

Use `gpt-5.2-codex` or `gpt-5.3-codex` with medium/high reasoning.

Work in `source/infra`, `source/scripts`, and root `source/package.json`.

Requirements:

- Provide scripts for build, lint, format, test, db, health, commit checks, and deploy.
- Prepare AWS container-stack infrastructure docs/templates for Cognito, RDS PostgreSQL, backend runtime, S3, and CloudFront.
- Keep all environment values documented through `.env.example`; never commit real secrets.
- Mirror the operational discipline of `~/Development/pecam` where useful.

