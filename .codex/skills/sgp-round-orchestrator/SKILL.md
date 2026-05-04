---
name: sgp-round-orchestrator
description: Execute an SGP materialized docs/work/round-N/prompts/00-orchestration-plan.md or wave launch prompt produced from docs/gov/prompts with worker fan-out, wave gates, fix-up loops, and blocker tracking. Use when the user asks to run an SGP orchestrator prompt, execute a round, launch a wave, spawn workers for SGP prompts, or continue the measure-plan-execute-compare loop after prompt materialization.
---

# SGP Round Orchestrator

## Overview

Run materialized SGP prompt waves as an outer-loop executor. Use workers only when the user request or prompt explicitly calls for parallel agents; otherwise execute the prompt locally with the same gate discipline.

## Current Docs Routing

- `docs/eng/` is authoritative for product and engineering behavior, acceptance, and developer facts.
- `docs/gov/audit/` holds current implementation status, compiled audit context, ledgers, inventories, diagnostics, and backlog tracking.
- `docs/gov/prompts/` holds reusable B0-B3 round prompts; materialized per-round outputs stay under `docs/work/round-<n>/`.
- `docs/gov/` holds governance controls, generated surfaces, retained evidence, compliance, health, and observability.
- `docs/work/**` is scratch and never acceptance authority.

## SGP Invariants

- Verify live repo state before trusting scratch prompt claims.
- `docs/work/**` is scratch context. Acceptance authority stays in `docs/eng/`, current status and compiled context in `docs/gov/audit/`, governance and reusable prompts in `docs/gov/`, user/operator guidance in `docs/user/`, and legacy evidence in `docs/leg/`.
- Do not revert user or worker changes unless explicitly asked.
- Do not add v0.0.1 compatibility shims.
- Use stubs, mocks, sandbox adapters, fixtures, and golden files for external services unless the user explicitly asks for real-service tests.
- Stop only for a `MUST DEFER` decision, a high-impact folia/spec payroll conflict, or after two failed autonomous fix-up rounds for the same gate.

## Preflight

1. Confirm cwd and repo identity:
   - `pwd`
   - `git status --short --branch`
   - `git rev-parse HEAD`
   - `git remote -v`
2. Read:
   - The requested `00-orchestration-plan.md` or `wave-<n>-launch.md`.
   - `AGENTS.md`, `package.json`, `scripts/run.mjs`, and relevant `docs/work/round-<n>/prompts/ROUND*-INDEX.md`.
   - Prior round summaries or memory/MemPalace records when available.
3. Verify all prompt files named by the launch file exist.
4. Map named gates to live `package.json` scripts. Do not assume old gate names still exist.

## Wave Loop

For each wave:

1. Read the wave launch file and all worker prompts in the wave.
2. Identify independent tasks and file ownership boundaries.
3. If platform policy and the user request permit subagents, fan out up to the wave concurrency budget:
   - Give each worker one prompt file and a disjoint ownership scope.
   - Tell workers they are not alone in the codebase, must not revert others, and must adapt to concurrent changes.
   - When forking full context, do not override model/reasoning unless the platform explicitly supports it.
4. While workers run, do non-overlapping local integration or verification work.
5. Review worker results, resolve non-conflicting patches, and inspect any touched generated artifacts.
6. Run the wave gate in narrow-to-broad order.
7. If a gate fails:
   - Reproduce and isolate the failing area.
   - Apply a local fix or spawn one focused fix-up worker with the failure output and likely files.
   - Repeat at most two fix-up rounds for the same gate.
8. Update scratch status files such as `ROUND*-INDEX.md`, `progress.md`, or per-worker summaries when they exist.
9. Continue to unrelated waves when a task writes a blocker to `QUESTIONS.md` and the dependency graph permits it.

## Worker Completion Contract

Each worker result should identify:

- Files changed.
- Behavior/docs/tests affected.
- Gates run with pass/fail status.
- Surprises or stale prompt assumptions corrected from live source.
- Remaining TODOs or `QUESTIONS.md` entries.
- Whether the item is complete, partial, or blocked.

## Common Gates

Use the live `package.json` scripts, usually in this order:

- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run governance:check`

Add scope-specific gates when touched:

- Backend: targeted Jest, `npm run test:backend -- --runInBand`, or `npm run test:coverage`.
- DB/RLS: `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db` or `npm run db:smoke`.
- API contracts: `npm run api:alignment:check -- --json`, `npm run api:spec:check`, and generated-client checks.
- Frontend: relevant unit tests, generated API client checks, and Playwright only when the touched surface requires it.
- Governance/health: `npm run health:json`, `npm run db:alignment:check -- --json`, and `npm run evidence:check` when relevant.

Avoid launching duplicate expensive coverage jobs. Consolidate to one long-running coverage gate when multiple workers request it.

## Blockers

Write unresolved owner decisions to `docs/work/round-<n>/QUESTIONS.md` with:

- item ID and wave,
- decision needed,
- evidence paths,
- safe default used while continuing,
- downstream tasks blocked.

End with wave status, commands run, remaining failed gates, and exact next prompt/wave to run.
