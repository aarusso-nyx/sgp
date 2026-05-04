---
name: sgp-round-audit
description: Audit the live SGP repository into docs/gov/audit current status plus a docs/work/round-N scratch context pack. Use when the user asks to inspect, assess, measure, audit current SGP state, start a new round, compare claims to implementation, or produce the measurement side of the SGP measure-plan-execute-compare loop.
---

# SGP Round Audit

## Overview

Create a reproducible, evidence-backed assessment of the current SGP repo. Keep the audit read-only unless the user explicitly asks for edits; write resulting scratch artifacts under `docs/work/round-<n>/`.

## SGP Invariants

- Work from `/Users/aarusso/Development/stech/sgp` unless the user points elsewhere, and verify the cwd before acting.
- Treat `docs/eng/` as acceptance authority, `docs/gov/audit/` as current status and compiled context, `docs/gov/` as governance controls, `docs/user/` as operator guidance, `docs/leg/sql-reference/` as legacy schema reference only, and `docs/leg/` as legacy evidence/archive.
- Treat `docs/work/**` as ignored scratch. It can summarize evidence but cannot override `docs/eng/`.
- Keep code artifacts in English. Do not add compatibility shims for v0.0.1.
- If folia-first payroll behavior conflicts with authoritative specs in a high-impact way, record the conflict and stop for owner decision.

## Current Docs Routing

- `docs/eng/` is authoritative for product and engineering behavior, acceptance, and developer facts.
- `docs/gov/audit/` holds current implementation status, compiled audit context, ledgers, inventories, diagnostics, and backlog tracking.
- `docs/gov/prompts/` holds reusable B0-B3 round prompts; materialized per-round outputs stay under `docs/work/round-<n>/`.
- `docs/gov/` holds governance controls, generated surfaces, retained evidence, compliance, health, and observability.
- `docs/work/**` is scratch and never acceptance authority.

## Workflow

1. Verify the repo surface:
   - `pwd`
   - `git status --short --branch`
   - `git rev-parse HEAD`
   - `git ls-files docs/work | wc -l`
   - Inspect `AGENTS.md`, `package.json`, `scripts/run.mjs`, `.gitignore`, `docs/eng/README.md`, `docs/gov/README.md`, `docs/gov/audit/README.md`, `docs/gov/prompts/`, and recent `docs/work/round-*` folders.
2. Choose the audit round:
   - If the user names a round, use it.
   - Otherwise create or refresh the next `docs/work/round-<n>/` after the highest existing round.
   - If the highest round already has an unfinished prompt set for the next implementation round, ask only if overwriting would destroy useful scratch notes.
3. Freeze the snapshot in `00-snapshot.md`:
   - branch, HEAD, dirty files, package manager and engines, script surface, top-level layout, source roots, detected ORM, detected test runners, CI workflows, and ignored scratch status.
4. Separate truth layers:
   - `01-reference-checklist.md`: external/regulatory checklist with source citations when the user asks for a fresh regulatory pass. Browse official sources for current law/layout claims.
   - `02-stated-spec.md`: what `docs/eng`, `docs/gov`, `docs/user`, root docs, OpenAPI specs, and committed specs claim.
   - `03b-db-inventory.md`: schema/migration/model evidence.
   - `03c-backend-inventory.md`: NestJS modules, controllers, services, workers, reports, auth, audit, integrations.
   - `03d-frontend-inventory.md`: Angular routes, feature surfaces, API client usage, guards, state, i18n, accessibility.
   - `04-test-coverage.md`: static map of tests and plausible feature coverage.
5. Synthesize:
   - `05-feature-matrix.md`: feature-by-feature maturity table using the audit rubric.
   - `05-metrics.md`: completeness, stated-vs-implemented gap, and test density by domain.
   - `06-gaps.md`: legal/regulatory exposure, go-live critical path, and cross-cutting risks.
   - Use additional focused files when useful, following existing round names such as `06a-regulatory-adherence.md`, `08-code-quality.md`, `08-hotspots.md`, `09-promise-vs-delivery.md`, `09-round-<prev>-delta.md`, and `10-legacy-parity.md`.

## Evidence Rules

- Cite file paths and line numbers for positive implementation claims whenever practical.
- For absences, say `not located` and list the search surface; do not claim true absence from a shallow search.
- Keep a strict split between external expectations, repo claims, and implementation evidence.
- Prefer `rg`, `rg --files`, `git ls-files`, `npm run <script> -- --help`, and static source inspection for audit work.
- Do not run broad tests, migrations, build, formatters, or code generators during audit unless the user explicitly wants dynamic gate evidence.
- Safe read-only checks can include `npm run health:json` and `npm run governance:check` when the current repo scripts are confirmed non-mutating; record command, result, and failure output.

## Audit Rubric

Use the existing 0-5 maturity scale unless the user requests another rubric:

- `0`: absent or not located.
- `1`: acknowledged in docs/backlog only.
- `2`: stubbed schema/scaffold/CRUD shell.
- `3`: partial backend or frontend behavior, weak tests, not end-to-end.
- `4`: functional end-to-end with some tests and basic controls.
- `5`: production-grade with edge-case tests, RBAC/tenant isolation, audit trail, regulatory output where required, and operator guidance.

When uncertain, choose the lower score and explain why.

## Output Contract

- Write markdown artifacts under `docs/work/round-<n>/`.
- Include an executive summary only after the evidence files exist.
- End with exact artifact paths, git cleanliness before/after, commands run, and unresolved questions.
- Do not update `docs/eng/` from this skill unless the user turns the audit into implementation.
