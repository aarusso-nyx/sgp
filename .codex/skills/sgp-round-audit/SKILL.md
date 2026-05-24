---
name: sgp-round-audit
description: Thin SGP adapter for DEVAI SKILL-round-audit. Use when the user asks to inspect, assess, measure, audit current SGP state, start a new round, compare claims to implementation, or produce the measurement side of the SGP measure-plan-execute-compare loop.
---

# SGP Round Audit

Thin adapter. The canonical workflow lives in DEVAI `SKILL-round-audit` and is invoked with:

```bash
devai skill-run SKILL-round-audit --repo-root /Users/aarusso/Development/stech/sgp
```

## SGP Config

- Repo root: `/Users/aarusso/Development/stech/sgp`.
- Authority: `AGENTS.md`, `docs/eng/**`, `docs/gov/audit/**`, `docs/gov/**`, `docs/user/**`, then `docs/leg/**` as legacy/archive evidence only.
- Scratch output: `docs/work/round-<n>/`; never treat scratch as acceptance authority.
- Safe audit default: read-only inspection unless the user explicitly asks for edits.

## Adapter Rules

- Inspect live repo state before trusting prior prompts, memory, or scratch docs.
- Use SGP round prompts in `docs/gov/prompts/B0-audit-phase.md` only as repo-local configuration for the DEVAI skill.
- Keep SGP invariants from `AGENTS.md`: no legacy compatibility runtime, no v0.0.1 shims, folia-first payroll decisions, and stop for unresolved high-impact payroll conflicts.
- Do not duplicate DEVAI workflow logic here. If this adapter drifts from DEVAI, update the adapter to cite DEVAI rather than copying behavior.

## Output Contract

Return the DEVAI skill result plus SGP-specific artifact paths, gates or read-only checks run, unresolved owner questions, and current git status.
