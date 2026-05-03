---
name: sgp-round-loop
description: Coordinate the full SGP outer loop of measure, plan, execute, compare, and optionally publish across reusable SGP skills. Use when the user asks to run a whole SGP round, automate the round cycle, continue measure-plan-execute-compare, or decide which SGP round skill should handle an ambiguous round request.
---

# SGP Round Loop

## Overview

Use this as the high-level router for SGP's round-based development cycle. It keeps the loop coherent while delegating detailed behavior to the narrower `sgp-*` skills when they are available.

## Loop Phases

1. Measure with `sgp-round-audit`:
   - Inspect the live repo first.
   - Produce or refresh `docs/work/round-<n>/` audit artifacts.
   - Keep this phase read-only unless the user explicitly asks for implementation.
2. Plan with `sgp-round-backlog`:
   - Convert the audit pack into a next-round backlog.
   - Materialize `prompts/00-orchestration-plan.md`, wave launch files, worker prompts, and a round index.
   - Route routine work to low/medium effort prompts and reserve high/xhigh effort for cross-cutting contracts, migrations, regulatory behavior, frontend gates, and owner-decision spikes.
3. Execute with `sgp-round-orchestrator`:
   - Run the orchestration prompt or selected wave.
   - Use worker fan-out only when explicitly requested by the user or prompt.
   - Run wave gates before advancing.
   - Write unavoidable decisions to `docs/work/round-<n>/QUESTIONS.md` and continue unrelated work when safe.
4. Compare with `sgp-round-verify-publish`:
   - Compare prompt acceptance criteria, audit baseline, current diff, and live gates.
   - Fix current-round failures with focused loops or route to `sgp-fix-lint`, `sgp-fix-build`, or `sgp-fix-tests`.
   - Publish only when explicitly requested.

## SGP Invariants

- Verify current repo state before trusting prior prompts, memory, or scratch docs.
- `docs/work/**` is ignored scratch and cannot override acceptance authority.
- `docs/eng/` is authoritative for behavior; `docs/gov/` for governance; `docs/user/` for operator guidance; `docs/leg/` for legacy/archive evidence.
- Do not add compatibility shims for v0.0.1.
- Use stubs, mocks, sandbox adapters, contract fixtures, or golden files for external services unless the user explicitly asks for real-service tests.
- Stop for high-impact folia/spec payroll conflicts.

## Routing

- If the user asks only for assessment, use `sgp-round-audit` and stop after artifacts.
- If the user asks for planning or prompt materialization, use `sgp-round-backlog` and stop after generated prompts.
- If the user points at an orchestration or wave prompt and says run it, use `sgp-round-orchestrator`.
- If the user asks to verify, compare, commit, merge, push, or check GitHub acceptance, use `sgp-round-verify-publish`.
- If a gate fails inside any phase, route to `sgp-fix-lint`, `sgp-fix-build`, or `sgp-fix-tests` as appropriate.

## Output Contract

At the end of a full loop, report the round number, generated artifacts, waves completed, gates run, `QUESTIONS.md` blockers, current git status, and publish status if publication was requested.
