# STYNX and DEVAI Wave 7 Closeout

Date: 2026-07-12

Status: local implementation complete; remote PR acceptance pending.

## Candidate history

The atomic adoption sequence on `codex/stynx-devai-adoption` is:

| Slice             | SHA                                | Result                                             |
| ----------------- | ---------------------------------- | -------------------------------------------------- |
| Baseline          | `ee0bb640`                         | adoption baseline                                  |
| DEVAI foundation  | `2a0a9801`                         | registry CLI and control-plane surfaces            |
| Runtime           | `17a7d569`, `9651c9cc`             | eight-runtime STYNX composition                    |
| Data and identity | `e9a57511`, `bb9d4189`             | DB context, Cognito and UUID adapters              |
| Cross-cutters     | `7c224a19`, `9651c9cc`, `e00a5b4f` | audit, storage, logging and platform boundaries    |
| Angular           | `0d83998b`, `8f1be2f9`             | Admin/Portal composition and registered follow-ups |
| Evidence          | `c5aaf82d`                         | 44 PASS plus one DEVAI structural N/A              |

The Wave 7 implementation commit is `1b690282`. A detached worktree at that
commit completed token-backed `npm ci` from GitHub Packages, installed 1,614
packages from lockfile version 3, and passed the registry-dependency boundary
check. The earlier `npm ci --prefix <worktree>` probe was rejected by npm because
`--prefix` changes workspace-root identity; rerunning from the detached
checkout's working directory matched CI semantics and passed.

## Package and supply-chain disposition

- DEVAI CLI: `@devai-nyx/cli@0.2.1`.
- Active STYNX direct dependencies and resolved versions are retained in
  `stynx-devai-version-matrix.md`.
- Fresh installs use GitHub Packages only and require `NODE_AUTH_TOKEN`.
- `docs/gov/evidence/sbom.cdx.json` is CycloneDX 1.5 and is refreshed from the
  Wave 7 lockfile.
- Existing main-push SLSA build attestation remains enabled in Workspace CI;
  DEVAI and normal evidence artifacts are uploaded independently.

## Acceptance and required checks

Local acceptance covers registry-boundary validation, stale-evidence rejection,
format, lint, type, build, governance, alignment, tests and evidence-chain
health. The exact PR jobs must additionally pass on GitHub before protection is
changed:

- Workspace gates
- Analyze (javascript-typescript)
- alignment-gate
- Dependency review
- Secret scan
- guard
- Release evidence for release-impacting changes
- DEVAI evidence gate

The first seven were already required on `main` when inspected on 2026-07-12.
Add `DEVAI evidence gate` only after its successful PR check is observable.

The first monolithic PR run completed every evidence step successfully but hit
the 90-minute job boundary during teardown, so GitHub reported it as cancelled.
SGP now follows STYNX's CI-economy topology: a cheap source-bound evidence
policy fans out DB/API, backend coverage, frontend, and mutation/build tiers;
the scorecard refresh runs only after every applicable tier succeeds; and a
small aggregate job retains the stable `DEVAI evidence gate` check name.
Current-ref concurrency cancels superseded runs. Backend coverage remains fully
gated but uses two bounded Jest workers instead of serial `--runInBand`.
The isolated coverage tier bootstraps canonical SQL in its own PostgreSQL
service before Jest runs; database services are job-local and evidence tiers
must not rely on schema state created by another runner.

## Scorecard and rollback

The accepted Wave 6 grid remains 44 PASS cells and the DEVAI-defined structural
N/A at `F4xT5`; SGP has no local N/A override. Wave 7 CI recomputes the grid for
the PR SHA. A non-pass cell, broken chain, missing artifact or stale integration
head blocks the gate.

Rollback disposition is application-only: retain the evidence, SBOM and
attestation, restore the previous attested application artifact, and do not
perform destructive schema rollback without explicit owner authorization.
Profile and active-session adoption remain separate follow-ups rather than
hidden Wave 7 exceptions.
