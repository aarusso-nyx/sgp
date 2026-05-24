# Repository Discipline Evidence

Status: retained evidence for the 2026-05-08 QA lift.

## Ownership

- `.github/CODEOWNERS` covers the whole repository through the default owner and
  adds explicit ownership for package manifests, workflows, backend, frontend,
  database SQL, scripts, tests, ADRs, generated governance surfaces, privacy
  docs, and user docs.
- GitHub `main` branch protection was verified through `gh api` on
  2026-05-08 and configured with required reviews, CODEOWNERS review, stale
  review dismissal, linear history, no force pushes, no deletions, conversation
  resolution, and required source/security/database checks.
- The required check set is expected to include workspace/source gates, database
  alignment, dependency/security review, ADR linkage, release-impact evidence,
  and deploy plan jobs before publication to `main`.

## Dependency And Metadata Controls

- `.github/dependabot.yml` covers `npm` and `github-actions`.
- Root metadata is present in `package.json`, `package-lock.json`, `.nvmrc`,
  `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, and `README.md`.
- `docs/work/**` is ignored by `.gitignore` and is not acceptance authority.

## Commit And Gate Controls

- `.husky/commit-msg` runs `commitlint`.
- `.husky/pre-commit` runs `lint-staged`.
- `commitlint.config.cjs` uses `@commitlint/config-conventional`.
- `.github/workflows/source-ci.yml` enforces commit message or PR title policy,
  type contract tests, scoped mutation tests, frontend coverage, backend
  coverage, and governance checks.
- `.github/workflows/adr-gate.yml` requires ADR linkage for contract-bearing
  changes.
- `.github/workflows/release-impact-gate.yml` requires changelog, release gate,
  operator-readiness, or explicit PR-body release-impact evidence for
  release-impacting changes.
- `.devai/config/project.json` and `scripts/lib/workspace-commands.mjs` retain
  `npm run test:types` and `npm run test:mutation` as hard-fail gates.

## Required Local Gate List

```bash
npm run lint:check
npm run format:check
npm run typecheck
npm run test:types
npm run test:mutation
npm run test:coverage -- --runInBand
npm run test:frontend:coverage
npm run governance:check
npm run build
```
