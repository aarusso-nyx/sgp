---
name: sgp-round-verify-publish
description: Verify completed SGP round or wave work against live gates, compare results to the audit/backlog baseline, and commit, merge, push, or open PRs only when explicitly requested. Use when the user asks to verify gates, compare round results, close a wave, publish SGP changes, merge to main, commit all changes, or confirm GitHub acceptance.
---

# SGP Round Verify Publish

## Overview

Close an SGP execution cycle with evidence. Separate verification from publication, and publish only when the user's wording clearly authorizes commit/merge/push.

## SGP Invariants

- Preserve user and worker changes. Never revert unrelated changes without explicit instruction.
- `docs/work/**` can provide scratch baseline and logs but is not acceptance authority.
- Keep behavior changes reflected in `docs/eng/`, governance controls in `docs/gov/`, and operator guidance in `docs/user/`.
- Do not normalize byte-sensitive regulatory/golden fixtures just to satisfy whitespace checks unless the relevant tests/specs require that change.
- Use explicit user authorization for full-tree staging, merge to `main`, push, or PR creation.

## Verification Workflow

1. Inspect state:
   - `pwd`
   - `git status --short --branch`
   - `git rev-parse HEAD`
   - `git remote -v`
   - `git branch --show-current`
   - Identify dirty files that are assistant/worker-owned vs unrelated.
2. Read the relevant round files:
   - `docs/work/round-<n>/prompts/00-orchestration-plan.md`
   - `ROUND*-INDEX.md`
   - wave launch file and worker summaries when present.
3. Compare results:
   - Each prompt acceptance criterion either has evidence, a blocker in `QUESTIONS.md`, or a stated residual risk.
   - Generated clients/specs are in sync when API surfaces changed.
   - Docs changed with behavior where required.
   - Governance and health checks still point to live paths.
4. Run gates from narrow to broad. Confirm commands from live `package.json`.

## Gate Menu

Select gates by scope:

- Common: `npm run lint:check`, `npm run format:check`, `npm run typecheck`, `npm run governance:check`.
- API: `npm run api:alignment:check -- --json`, `npm run api:spec:check`, `npm run api:operation:check`.
- DB: `npm run db:alignment:check -- --json`, `npm run db:fk-coverage:check`, `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run db:smoke`.
- Backend: targeted Jest, `npm run test:backend -- --runInBand`, `npm run test:coverage -- --runInBand` when a full signal is needed.
- Frontend: generated-client checks, relevant workspace tests, `npm run build:admin`, `npm run build:portal`, and Playwright when user-facing flows changed.
- Health/evidence: `npm run health:json`, `npm run evidence:check`.

If a gate is too expensive or blocked by environment, say so and provide the narrower evidence that was run.

## Fix Before Publish

- Reproduce each failure once.
- Fix failures caused by the current round.
- Do not expand scope to unrelated dirty files unless the user requested full-workspace publication.
- Run up to two focused fix-up loops before asking for owner input.
- Record unresolved questions in `docs/work/round-<n>/QUESTIONS.md`.

## Publish Workflow

Only continue past verification when the user explicitly asks for commit, merge, push, or PR.

1. Decide scope:
   - Assistant-only: stage only files you changed or can attribute to the current task.
   - Full workspace: use `git add -A` only when the user explicitly says to commit all changes or publish the whole tree.
2. Check for secrets before commit:
   - Review staged paths and scan staged diff for obvious credentials, tokens, private keys, and `.env` additions.
3. Commit:
   - Use a concise message that names the SGP round/wave outcome.
   - If starting a branch, use `codex/` prefix unless the user specified another branch.
4. Merge:
   - Merge to `main` only if requested.
   - Prefer non-interactive `git merge --no-ff <branch> -m "<message>"` when preserving an integration commit matters.
5. Push:
   - Push the intended branch only.
   - Verify local and remote SHA match.
6. GitHub acceptance:
   - Use `gh` or the GitHub app when available to confirm workflows started.
   - If the user asks whether it was accepted, wait/check final run status rather than only confirming push.

## Output Contract

End with gate table, commit/merge/push SHAs when applicable, remote/workflow status, skipped gates with reason, and remaining risks.
