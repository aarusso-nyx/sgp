---
name: sgp-fix-build
description: Reproduce and fix SGP build or typecheck failures until build gates are clean. Use when the user asks to run build and correct errors, repair typecheck/build failures, unblock build:backend/build:admin/build:portal, or recover an SGP wave blocked by typecheck or build.
---

# SGP Fix Build

## Overview

Run the live SGP typecheck/build gates, fix root causes in the smallest owned scope, and verify the relevant builds are clean.

## Workflow

1. Inspect:
   - `git status --short --branch`
   - `package.json` scripts for `typecheck`, `build`, `build:backend`, `build:admin`, and `build:portal`.
   - `scripts/run.mjs` and workspace command mappings if the failure command is unclear.
2. Reproduce:
   - Run the user-provided command first.
   - If no command was provided, start with `npm run typecheck`, then the narrow build matching touched files.
3. Diagnose:
   - Separate TypeScript errors, generated-client drift, OpenAPI/schema drift, missing exports, config/path drift, test-only compile errors, and dependency/toolchain errors.
   - Search neighboring modules for the established pattern before editing.
4. Fix:
   - Prefer real type/model fixes over `any`, casts, or disabling strictness.
   - Regenerate OpenAPI clients only when the live repo scripts and source changes require it.
   - If generated artifacts change, verify they are expected and include them in the result.
   - Do not change public DTOs, route shapes, RBAC strings, tenant/RLS posture, or payroll semantics without authoritative docs or explicit user direction.
5. Verify:
   - Rerun the failing build/typecheck.
   - Add `npm run lint:check` and `npm run governance:check` when code/docs behavior changed.

## Common Commands

- `npm run typecheck`
- `npm run build`
- `npm run build:backend`
- `npm run build:admin`
- `npm run build:portal`
- `npm run api:spec:check`
- `npm run api:client:generate`

Always confirm these scripts exist in the current `package.json` before running them.

## SGP-Specific Rules

- Preserve unrelated dirty changes.
- Keep code artifacts in English.
- Update `docs/eng/` only for real behavior changes.
- Do not add v0.0.1 compatibility shims.
- Stop for high-impact folia/spec payroll conflicts.

## Output Contract

Report the initial failing command, root cause, files changed, final passing command set, and any build surfaces not run.
