# CLAUDE.md — Quick Reference for Claude Agents

**Read AGENTS.md first.** This file is a fast reference. Authority and detailed rules live in [AGENTS.md](./AGENTS.md).

---

## Quick Start for Agents

### Before starting any task
```bash
git status --short --branch          # See current state
git log --oneline -5                 # Recent commits
ls -la docs/eng/ | grep -E "^-"      # Check for relevant spec docs
```

### Authority Order (short version)
1. **`docs/eng/`** — Product spec, architecture, acceptance (source of truth)
2. **Source code + tests** — Proof of implementation
3. **`docs/gov/`** — Governance controls, compliance, runtime topology
4. **`docs/user/`** — User guides and operator runbooks
5. **`docs/leg/`** — Legacy reference only (cannot override `docs/eng/`)
6. **`docs/work/`** — Scratch space, audit logs, temporary notes (never authority)

**When docs conflict:** Prefer higher authority. Update lower authority docs when implementation changes. Stop and ask for owner decision if payroll or RBAC logic conflicts.

---

## Key Directories & Commands

| Path | Role | Key Files |
|------|------|-----------|
| `backend/src/` | NestJS API, services, workers | Controllers, DTOs, specs |
| `frontend/src/` | Angular admin + portal apps | Components, services, specs |
| `database/sql/` | Canonical schema, RLS, triggers | DDL packs, migrations |
| `tests/` | Jest (backend), Vitest (frontend), Playwright e2e, RLS specs | `*.spec.ts` |
| `scripts/` | Orchestration commands | `run.mjs` (dispatcher), `lib/` (metadata) |
| `docs/eng/` | Product truth, ADRs, status | `99-implementation-status.md` |
| `docs/gov/` | Governance, runtime topology, compliance | `runtime-topology.json` |
| `.claude/skills/` | SGP custom skills (backported from Codex) | `sgp-fix-*`, `sgp-round-*` |

**Fast commands:**
```bash
npm run lint              # Check style (root workspace)
npm run typecheck        # Type check (root workspace)
npm run test             # Run all tests
npm run governance:check # Verify governance gates
npm run build            # Build all workspaces
```

---

## Non-Negotiable Rules

1. **Inspect live state first** — Never assume. Check `git status`, source, and package.json scripts.
2. **Keep diffs focused** — No opportunistic refactors. Requested scope only.
3. **Preserve changes** — Never revert unrelated dirty files unless asked.
4. **No legacy shims** — v0.0.1 is fresh; no backward-compatibility layers.
5. **Use stubs for external APIs** — Sandbox adapters for eSocial, Gov.br, TCE, banking, etc., unless real integration is explicitly requested.
6. **Secrets stay hidden** — No `.env` with real values, credentials, private keys, or production data in commits.
7. **Public contracts are binding** — API changes require code + tests + generated client + docs in sync.
8. **Use local patterns** — Prefer established helpers over new abstractions.

---

## Common Agent Tasks

### Adding a Feature
1. Check acceptance in `docs/eng/99-implementation-status.md`
2. Align with `docs/eng/` spec (route, DB schema, permissions)
3. Implement in source (backend service, frontend component, database DDL)
4. Write tests (Jest backend, Vitest frontend, RLS specs if needed)
5. Update `docs/eng/99-implementation-status.md` and align code/tests/docs
6. Run `npm run governance:check` before committing

### Fixing a Build/Test Failure
1. `git log --oneline -1` — See what changed
2. `npm run lint` — Check style
3. `npm run typecheck` — Check types
4. `npm run test` — Run tests
5. Fix root cause (not just symptoms)
6. Verify gates pass cleanly

### Understanding a Subsystem
1. Start in `docs/eng/` — Find the relevant spec or ADR
2. Read source in `backend/src/` or `frontend/src/`
3. Check tests in `tests/` for usage examples
4. Inspect `docs/gov/runtime-topology.json` if it's a service/worker

---

## When in Doubt

- **Authority question?** → Check `docs/eng/` or ask AGENTS.md §1
- **Payroll behavior?** → See `docs/eng/71-folia-engine-reconciliation.md`
- **API contract change?** → Verify with `docs/eng/69-api-route-alignment.json`
- **Database alignment?** → Check `docs/eng/64-database-alignment-matrix.json`
- **Test strategy?** → See `docs/eng/62-estrategia-testes.md`
- **Governance rules?** → Read [AGENTS.md](./AGENTS.md) §2–5
- **Implementation status?** → Check `docs/eng/99-implementation-status.md` (current scope, deferred items, blockers)

---

## Reporting Issues

If you find:
- **Stale docs** that contradict source → Update `docs/eng/` after confirming with source
- **Unresolved design question** → Record in `docs/work/` scratch or ask for owner decision
- **Governance violation** → Report in turn summary; do not silently bypass rules

---

**Your north star:** Help agents execute SGP work clearly, quickly, and in alignment with documented authority. When in doubt, defer to AGENTS.md or ask the user.
