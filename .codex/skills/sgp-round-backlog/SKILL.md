---
name: sgp-round-backlog
description: Convert an SGP round audit pack into a prioritized backlog, wave plan, orchestration prompt, wave launch prompts, worker prompts, and backlog index under docs/work/round-N/prompts. Use when the user asks to plan the next SGP round, materialize backlog, split work into waves, generate orchestrator/worker prompts, or prepare low/medium/high effort agent tasks from audit findings.
---

# SGP Round Backlog

## Overview

Turn the measurement artifacts from `docs/work/round-<n>/` into a next-round execution package. The package stays in scratch space, but each worker prompt must point back to authoritative `docs/eng/`, `docs/gov/`, and live source verification.

## SGP Invariants

- `docs/work/**` is scratch context, not acceptance authority.
- `docs/eng/` is authoritative for product behavior and acceptance.
- `docs/gov/` owns governance controls, `docs/user/` owns operator/user instructions, and `docs/leg/` is legacy/archive evidence.
- Do not add backward compatibility shims for v0.0.1.
- Payroll engine decisions are folia-first. Stop for owner input on high-impact folia/spec conflicts.
- Postpone real external-service tests unless the user overrides this. Use stubs, mocks, sandbox adapters, contract fixtures, or golden files for eSocial, ICP-Brasil, GovBR, TCEs, banking, SIAFIC, and similar integrations.

## Workflow

1. Locate the audit source:
   - Use the user-specified `docs/work/round-<n>/` when provided.
   - Otherwise use the latest round with audit files and no completed next-round prompt package.
   - Verify live repo status, current HEAD, `AGENTS.md`, `package.json`, `scripts/run.mjs`, and existing `docs/work/round-*` conventions.
2. Read the audit pack:
   - Minimum: `02-stated-spec.md`, `03b-db-inventory.md`, `03c-backend-inventory.md`, `03d-frontend-inventory.md`, `04-test-coverage.md`, `06-gaps.md`, `08-code-quality.md`, `09-promise-vs-delivery.md`, and previous-round delta files when present.
   - Re-check live source before trusting any stale audit claim.
3. Derive the next implementation round:
   - If audit source is `round-2`, next implementation item IDs are `R3-*`.
   - Write prompts under the audit source folder: `docs/work/round-<n>/prompts/`.
   - Include `12-round-<next>-backlog.md` or equivalent when the audit pack does not already have a backlog file.
4. Prioritize backlog:
   - Rank legal/regulatory exposure, governance/CI canaries, tenant/RLS/audit integrity, payroll correctness, and high-value shared helpers first.
   - Prefer easy-first and parallel-first within a wave, but put dependency-enabling canaries before tasks that consume them.
   - Reserve high/xhigh effort for cross-cutting contracts, DB migrations, regulatory behavior, frontend CI gates, and decision spikes.
5. Split into waves:
   - Each wave has a theme, item IDs, dependency notes, max concurrency, and gate.
   - Avoid grouping tasks that compete for the same files unless the wave explicitly serializes them.
   - Include a dependency graph when cross-wave sequencing matters.
6. Materialize prompts:
   - `prompts/00-orchestration-plan.md`
   - `prompts/ROUND<next>-INDEX.md`
   - `prompts/wave-<n>-launch.md`
   - `prompts/<wave>-R<next>-<id>-<slug>.prompt.md`

## Worker Prompt Schema

Every worker prompt should include:

- Title with round ID, wave, effort, risk, dependencies, parallel-safe set, and recommended reasoning tier.
- Mission in one paragraph.
- Authoritative context to read first: specific `docs/eng`, `docs/gov`, `docs/user`, and relevant scratch audit files.
- Live verification instructions: exact source paths or search terms to confirm before editing.
- Scope and ownership: files/modules the worker owns, and files it must avoid.
- Acceptance criteria: behavior, docs, tests, generated artifacts, and governance updates.
- Gates: narrow focused command first, then shared wave gates when practical.
- Autonomy directives: may make routine implementation choices, may run up to two fix-up loops for own failures, must record blocker questions in `docs/work/round-<n>/QUESTIONS.md`, and must proceed to unrelated tasks when blocked.
- Defer rules: new public route/DTO/RBAC strings, tenant/RLS posture, destructive migrations, large dependencies, production data repair, regulatory layout conflicts, and high-impact folia/spec conflicts.

## Orchestrator Prompt Requirements

The orchestration plan must state:

- Audit baseline and backlog source files.
- Wave table with item count and max concurrency.
- Dependency graph or table.
- Effort tiers and routing logic for low/medium/high/xhigh tasks.
- Shared autonomy contract and defer contract.
- Memory protocol when a memory/MemPalace tool is available.
- Common gates from the live `package.json` script surface.
- Wave loop: read launch, fan out independent prompts, merge non-conflicting patches, run gate, spawn focused fix-up up to two rounds, then continue or ask human.

## Output Contract

- Save all generated prompts under `docs/work/round-<n>/prompts/`.
- Do not update authoritative docs while planning unless the user explicitly asks.
- End with the generated file list, wave counts, dependencies, gates, and any open questions.
