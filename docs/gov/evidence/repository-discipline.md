# Repository Discipline Evidence

Status: retained evidence, reverified 2026-07-12 for Wave 7.

## Ownership

- `.github/CODEOWNERS` covers the whole repository through the default owner and
  adds explicit ownership for package manifests, workflows, backend, frontend,
  database SQL, scripts, tests, ADRs, generated governance surfaces, privacy
  docs, and user docs.
- GitHub `main` branch protection is governed by ADR-036 and
  `docs/gov/branch-protection-policy.json`. In the current `solo-owner` phase,
  the named owner may merge after all protected checks pass without an
  impossible independent approval. PRs, admin enforcement, conversation
  resolution, no force pushes, no deletions and required checks remain active.
- The required check set is expected to include workspace/source gates, database
  alignment, dependency/security review, ADR linkage, release-impact evidence,
  and deploy plan jobs before publication to `main`.
- On 2026-07-12 the proven `DEVAI evidence gate` became the eighth required
  context. Its successful PR run is retained on PR #57.
- A second active maintainer or production-governance declaration requires
  `collaborative` mode before the next merge: at least one approval, CODEOWNER
  review and approval from someone other than the last pusher.

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
- `.github/workflows/devai-evidence.yml` is reusable through `workflow_call` and
  runs the full DB, API, browser, coverage, mutation and build tail whenever
  retained evidence is absent or stale. It uploads DEVAI state and normal test
  artifacts on every outcome.

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
