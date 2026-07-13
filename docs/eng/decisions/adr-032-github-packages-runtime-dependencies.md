---
controllers: []
migrations: []
infra:
  - .npmrc
  - .github/workflows/source-ci.yml
  - .github/workflows/db-alignment.yml
  - .github/workflows/deploy-dev.yml
  - .github/workflows/deploy-prod.yml
runbooks:
  - docs/user/sgp-boundary-runbook.md
---

# ADR-032: GitHub Packages Runtime Dependencies

Status: Accepted

Date: 2026-07-11

## Context

SGP previously consumed STYNX and DEVAI dependencies through local tarballs and
workspace-adjacent paths. That made a clean checkout depend on sibling source
trees and prevented CI from proving the package boundary that production uses.

## Decision

SGP consumes published `@stynx-nyx/*` and `@devai-nyx/*` packages from GitHub
Packages. The repository `.npmrc` maps both scopes to GitHub Packages and CI
uses the `PACKAGES_READ_TOKEN` secret through `NODE_AUTH_TOKEN` during install.

Wave 0 verification on 2026-07-11 confirmed that all SGP-declared STYNX
packages and `@devai-nyx/cli` are published and queryable through that route.
The DEVAI CLI is not yet declared or locked by SGP; its consumption remains a
Wave 1 obligation and must not be inferred from registry availability.

Local paths, `file:` references, `link:` references, legacy `@stynx/*` scopes,
and legacy `@stynx-web/*` scopes are prohibited in manifests, lockfiles, source
imports, and workflow setup. `npm run check:registry-dependencies` is the
mandatory regression detector for that rule.

## Consequences

- A fresh checkout can install without a sibling STYNX repository.
- CI and deployment workflows require the read-only package token; it is never
  committed to the repository.
- Package updates remain explicit, lockfile-backed dependency changes subject
  to dependency review and the normal workspace gates.

## Alternatives Considered

- Continue using local tarballs: rejected because it is not reproducible in CI
  or fresh consumer checkouts.
- Inline shared runtime code into SGP: rejected because it would erase the
  independently versioned platform boundary.

## Verification

- `npm ci` succeeds with `NODE_AUTH_TOKEN` configured.
- `npm run check:registry-dependencies` reports no findings.
- Workspace typecheck, build, and consumer contract tests remain green.
