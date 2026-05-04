---
name: sgp-fix-tests
description: Reproduce and fix SGP test failures until the relevant test gates are clean. Use when the user asks to run tests and correct errors, repair Jest/e2e/RLS/coverage failures, unblock an SGP wave test gate, or iterate failing backend, frontend, DB, or Playwright tests.
---

# SGP Fix Tests

## Overview

Reproduce failing SGP tests, identify whether the bug is in implementation, test setup, fixture data, or stale expectations, fix the owned root cause, and rerun enough gates to prove the repair.

## Current Docs Routing

- `docs/eng/` is authoritative for product and engineering behavior, acceptance, and developer facts.
- `docs/gov/audit/` holds current implementation status, compiled audit context, ledgers, inventories, diagnostics, and backlog tracking.
- `docs/gov/prompts/` holds reusable B0-B3 round prompts; materialized per-round outputs stay under `docs/work/round-<n>/`.
- `docs/gov/` holds governance controls, generated surfaces, retained evidence, compliance, health, and observability.
- `docs/work/**` is scratch and never acceptance authority.

## Workflow

1. Inspect:
   - `git status --short --branch`
   - `package.json` test scripts.
   - The prompt/wave acceptance criteria that named the failing tests.
   - Changed files likely related to the failure.
2. Reproduce:
   - Run the exact failing command first.
   - If no command is supplied, choose the narrowest targeted test command from changed files, then broaden.
   - Use `--runInBand` for backend/coverage tests when concurrency causes noise.
3. Diagnose:
   - Determine whether the failure is implementation, test expectation, fixture, generated-client drift, DB bootstrap, time zone, tenant/RLS setup, external-service stub, or environment.
   - Read neighboring passing tests before rewriting the pattern.
4. Fix:
   - Prefer fixing product behavior over weakening tests.
   - Update tests when the authoritative spec changed or the old assertion was only a stub.
   - Keep golden fixture changes intentional and explain byte-sensitive updates.
   - Use stubs/mocks/sandbox/goldens for eSocial, ICP-Brasil, GovBR, TCE, banking, SIAFIC, and other external services unless explicitly asked for real integration tests.
5. Iterate:
   - Rerun the focused test.
   - Run the relevant broader gate after focused pass.
   - Continue until green or until blocked by environment/owner decision.

## Common Commands

Confirm in live `package.json` before running:

- `npm run test:backend -- --runInBand`
- `npm run test:coverage -- --runInBand`
- `npm run test:e2e`
- `npm run test:db`
- `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run db:smoke`
- `npm run test:admin`
- `npm run test:portal`
- `npm run test:qa:api`
- `npm run test:qa:frontend`

Avoid launching duplicate full coverage jobs. Let one broad coverage run complete and use focused tests for fix-up loops.

## SGP-Specific Rules

- Preserve unrelated dirty changes.
- Do not bypass governance, tenant/RLS, audit, or compliance expectations to get a green test.
- Stop for high-impact folia/spec payroll conflicts.
- Record owner decisions in `docs/work/round-<n>/QUESTIONS.md` when a test failure exposes a real unresolved product decision.
- Keep behavior documentation in `docs/eng/` current when behavior changes.

## Output Contract

Report failing command, root cause, files changed, focused passing tests, broader gates run, and any skipped tests with reasons.
