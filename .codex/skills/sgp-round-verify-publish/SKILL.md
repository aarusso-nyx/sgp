---
name: sgp-round-verify-publish
description: Thin SGP adapter for DEVAI SKILL-round-verify-publish. Use when the user asks to verify gates, compare round results, close a wave, publish SGP changes, merge to main, commit all changes, or confirm GitHub acceptance.
---

# SGP Round Verify Publish

Thin adapter. The canonical workflow lives in DEVAI `SKILL-round-verify-publish` and is invoked with:

```bash
devai skill-run SKILL-round-verify-publish --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Verification context: current diff, `docs/gov/audit/**`, relevant round prompts under `docs/work/**`, and reusable prompts under `docs/gov/prompts/**`.
- Common gates: `npm run lint:check`, `npm run format:check`, `npm run typecheck`, and `npm run governance:check`; add API, DB, frontend, backend, health, or evidence gates by touched surface.
- Publication authority: commit, merge, push, or PR only when the user's wording explicitly requests it.

## Adapter Rules

- Stage only assistant-owned/current-task files unless the user explicitly requests full-workspace publication.
- Inspect staged paths and staged diff for secrets before committing.
- Keep verification separate from publication.
- Do not duplicate DEVAI verification or publish logic here.

## Output Contract

Return gate results, skipped gates with reasons, commit/merge/push SHAs when applicable, remote/workflow status when checked, remaining risks, and current git status.
