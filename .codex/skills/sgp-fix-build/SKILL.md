---
name: sgp-fix-build
description: Thin SGP adapter for DEVAI SKILL-fix-build and SKILL-fix-typecheck. Use when the user asks to repair typecheck/build failures or recover an SGP wave blocked by typecheck or build.
---

# SGP Fix Build

Thin adapter. The canonical workflows live in DEVAI:

```bash
devai skill-run SKILL-fix-build --repo-root /Users/aarusso/Development/stech/sgp
devai skill-run SKILL-fix-typecheck --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Gate commands: `npm run typecheck`, `npm run build`, `npm run build:backend`, `npm run build:admin`, and `npm run build:portal` when present in live `package.json`.
- Relevant alignment commands when API contracts move: `npm run api:spec:check` and `npm run api:client:generate`.

## Adapter Rules

- Reproduce the exact failing command first.
- Preserve unrelated dirty changes and avoid broad generated drift unless required by the failure.
- Do not paper over type errors with `any`, public-contract shims, or weakened strictness.
- Keep SGP behavior authority in `docs/eng/**`; do not duplicate DEVAI fix logic here.

## Output Contract

Return the failing command, root cause, files changed, final passing build/typecheck gates, skipped surfaces, and current git status.
