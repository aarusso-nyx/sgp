---
name: sgp-fix-lint
description: Thin SGP adapter for DEVAI SKILL-fix-lint. Use when the user asks to repair lint or format failures, clean lint warnings, or recover an SGP wave blocked by lint:check or format:check.
---

# SGP Fix Lint

Thin adapter. The canonical workflow lives in DEVAI `SKILL-fix-lint` and is invoked with:

```bash
devai skill-run SKILL-fix-lint --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Gate commands: `npm run lint:check`, `npm run format:check`, `npm run lint`, and `npm run format` when present in live `package.json`.
- Byte-sensitive fixtures: `.rem`, `.ret`, XML, TXT, PDF, banking, and regulatory goldens require intentional review before normalization.

## Adapter Rules

- Reproduce the exact failing command first.
- Use targeted edits or formatter runs on owned files only unless broader cleanup is explicitly authorized.
- Do not weaken lint rules or normalize byte-sensitive fixtures just to make a gate pass.
- Do not duplicate DEVAI lint-fix logic here.

## Output Contract

Return the failing command, fixes made, final passing lint/format gates, unrelated remaining failures if any, and current git status.
