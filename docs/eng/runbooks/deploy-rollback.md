# Deploy Rollback Runbook

Owner: SGP platform operator
Last reviewed: 2026-07-12

## Promotion Controls

- Stage and prod deploy workflows use GitHub Environments. Prod must be
  configured in repository settings with required reviewers from
  `.github/CODEOWNERS`; the workflow file only references `environment: prod`.
- Any failed gate blocks deploy. Artifact apply additionally requires
  `--migration-evidence`, `--release-gate-evidence`, and
  `--apply-authorization` paths.
- Provisioning and artifact deploy remain separate. CDK provision creates or
  changes AWS resources; artifact deploy only switches versioned bundles on
  designated hosts.

## Preconditions

- Identify the target environment, deployed SHA, previous SHA, migration state,
  and rollback window.
- Confirm the previous artifact still exists in the artifact bucket and has
  provenance evidence.
- Confirm manual DB migration state. Roll back application artifacts only when
  the schema remains compatible with the previous artifact.

## Deploy

1. Confirm Workspace CI, DEVAI evidence gate, governance, DB alignment, API
   alignment, e2e, and release evidence are green. Verify the retained
   `docs/gov/evidence/sbom.cdx.json` and GitHub build attestation refer to the
   release candidate.
2. For provision planning, run:
   `npm run deploy -- --mode provision --target <stage|prod> --stack all --dry-run`.
3. For artifact apply, provide the accepted artifact URI, release ID,
   migration evidence, release-gate evidence, and apply authorization:
   `npm run deploy -- --mode artifacts --target <stage|prod> --artifact-uri s3://... --release-id <sha> --migration-evidence <path> --release-gate-evidence <path> --apply-authorization <path> --apply`.
4. Apply through SSM on the target host. The host script pulls the artifact,
   flips `/opt/sgp/current`, and reloads PM2.

## Rollback

1. Select the previous artifact recorded by the target host.
2. Use SSM to run the rollback host script. It flips `/opt/sgp/current` back to
   the previous release and reloads PM2.
3. Do not run destructive DB rollback unless the owner explicitly approves it.
4. DEVAI evidence and the SBOM are release evidence, not rollback executables;
   preserve them for diagnosis and restore the last attested application
   artifact through the normal host rollback path.

## Verification

- `npm run health:json`
- Public smoke: `https://<domain>/api/v1/health/ready`
- CloudWatch: PM2 logs remain JSON and no sustained 5xx or auth failures
  appear after rollout.
- Retain deployment, rollback, and incident evidence under `docs/gov/evidence/`
  when the release is production-impacting.
