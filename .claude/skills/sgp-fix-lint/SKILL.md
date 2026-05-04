---
name: sgp-fix-lint
description: Reproduce and fix SGP lint or format failures until lint gates are clean. Use when the user asks to run lint and correct errors, clean lint warnings, fix format failures, repair ESLint/Prettier issues, or recover an SGP wave blocked by lint:check or format:check.
---

# SGP Fix Lint

## Overview

Run the live SGP lint/format gates, identify real failures, make minimal source fixes, and iterate until clean or clearly blocked.

## Current Docs Routing

- `docs/eng/` is authoritative for product and engineering behavior, acceptance, and developer facts.
- `docs/gov/audit/` holds current implementation status, compiled audit context, ledgers, inventories, diagnostics, and backlog tracking.
- `docs/gov/prompts/` holds reusable B0-B3 round prompts; materialized per-round outputs stay under `docs/work/round-<n>/`.
- `docs/gov/` holds governance controls, generated surfaces, retained evidence, compliance, health, and observability.
- `docs/work/**` is scratch and never acceptance authority.

## Workflow

1. Inspect before changing:
   - `git status --short --branch`
   - `package.json` scripts for `lint`, `lint:check`, `format`, and `format:check`.
   - Any prompt/wave file that named the failing gate.
2. Reproduce:
   - Prefer `npm run lint:check` for lint.
   - Run `npm run format:check` when formatting is part of the failure.
   - If output is huge, rerun the failing underlying command or targeted workspace command when discoverable.
3. Classify failures:
   - Current task-owned source/test/docs issue.
   - Generated artifact drift.
   - Intentional byte-sensitive fixture whitespace.
   - Pre-existing unrelated dirty file.
   - Tooling/config issue.
4. Fix minimally:
   - Use local code patterns and existing helpers.
   - Prefer targeted edits over broad auto-fix commands.
   - Use formatters only on owned/touched files unless the user authorized broader cleanup.
   - Do not weaken lint rules to clear a local failure unless the prompt explicitly asks for rule work.
5. Iterate:
   - Rerun the failing gate after each fix.
   - Continue until `lint:check` and relevant `format:check` pass, or until the blocker is not owned by this task.

## SGP-Specific Rules

- Verify live scripts; current common gates are usually `npm run lint:check` and `npm run format:check`.
- Preserve unrelated dirty work in this repo.
- Do not normalize fixed-width `.rem`/`.ret`, XML, TXT, or golden fixtures solely because `git diff --check` reports trailing whitespace; first verify fixture semantics and tests.
- If behavior changes while fixing lint, update `docs/eng/` only when behavior truly changed.
- Keep code artifacts in English.
- Avoid compatibility shims for v0.0.1.

## Output Contract

Report the exact failing command, fixes made, final passing commands, and any unrelated remaining lint failures left untouched.
