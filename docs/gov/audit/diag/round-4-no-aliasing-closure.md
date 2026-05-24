# Round 4 No-Aliasing Closure

Date: 2026-05-24
Prompt: `/Users/aarusso/Development/stech/align/sgp/round-4/prompts/00-orchestrator.md`

## Outcome

SGP-local skill aliases were removed from the active filesystem and the active
skill registry. Agents should invoke DEVAI canonical skills directly:

- `SKILL-round-audit`
- `SKILL-round-backlog`
- `SKILL-round-orchestrate`
- `SKILL-round-verify-publish`
- `SKILL-round-execute`
- `SKILL-fix-lint`
- `SKILL-fix-build`
- `SKILL-fix-typecheck`
- `SKILL-fix-test`

## Evidence

- `docs/work/round-4/R3-BLOCKERS.md`: R3 `with-blockers` evidence was pure
  gate status, not wrapper behavior divergence.
- `docs/work/round-4/skill-reference-inventory.md`: initial inventory found 51
  non-excluded exact SGP-local skill-name occurrences.
- `docs/work/round-4/no-aliasing-evidence.md`: post-delete registry and active
  grep evidence.

## Deleted Alias Directories

- `.codex/skills/sgp-fix-build/`
- `.codex/skills/sgp-fix-lint/`
- `.codex/skills/sgp-fix-tests/`
- `.codex/skills/sgp-round-audit/`
- `.codex/skills/sgp-round-backlog/`
- `.codex/skills/sgp-round-execute/`
- `.codex/skills/sgp-round-loop/`
- `.codex/skills/sgp-round-orchestrator/`
- `.codex/skills/sgp-round-verify-publish/`
- `.claude/skills/sgp-fix-build/`
- `.claude/skills/sgp-fix-lint/`
- `.claude/skills/sgp-fix-tests/`
- `.claude/skills/sgp-round-audit/`
- `.claude/skills/sgp-round-backlog/`
- `.claude/skills/sgp-round-loop/`
- `.claude/skills/sgp-round-execute/`
- `.claude/skills/sgp-round-orchestrator/`
- `.claude/skills/sgp-round-verify-publish/`

## Verification Gates

R4 retained gate evidence is stored under `.devai/state/test-results/`.

| Gate                                                                            | Result |
| ------------------------------------------------------------------------------- | ------ |
| `npm run format:check`                                                          | PASS   |
| `npm run lint:check`                                                            | PASS   |
| `npm run typecheck`                                                             | PASS   |
| `npm run governance:check`                                                      | PASS   |
| `npm run build`                                                                 | PASS   |
| `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test`          | PASS   |
| `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:e2e`      | PASS   |
| `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:coverage` | PASS   |
| `npm run test:frontend:coverage`                                                | PASS   |
| `DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db`       | PASS   |

Backend coverage passed with 93.64% statements/lines, 86.25% branches, and
97.05% functions. Frontend coverage passed with admin at 96.85% statements and
portal at 100% statements. Backend coverage still emitted Jest's open-handle
forced-worker-exit warning after a successful exit, and Angular builds/tests
still emit the non-fatal `pt-BR` locale-data fallback warning.

## Prior Gap Closure

- R1 full-CI gap: partially closed by R4 verification evidence; any unrun broad
  gate remains explicit in the R4 run log.
- R1 npm audit gap: closed by zero-vulnerability `npm audit --json` result.
- R1 locale policy gap: closed by `docs/eng/locale-policy.md`.
- R1 lint threshold gap: closed by `docs/gov/audit/lint-thresholds.md`.
- R1 STYNX dependency workflow gap: closed by
  `docs/user/dependency-management.md`.
- R2 eSocial spool gap: closed by
  `tests/backend/esocial-spool-transmission.e2e-spec.ts`.
- R2 signature/PDF architecture gaps: closed by
  `docs/eng/68-signature-architecture.md` and
  `docs/eng/67-pdf-a-builder.md`.
- R3 no-aliasing gap: closed for active SGP aliases.

## Open DEVAI Follow-Up

`docs/work/round-4/devai-surface-coverage.md` found that DEVAI canonical
project config does not yet schema-document every SGP-specific parameter that
the wrappers reminded agents about. `docs/work/round-4/devai-feedback.md`
recommends adding canonical config keys for:

- command matrices and hard-fail gates;
- authority order and scratch roots;
- adopter prompt library location;
- protected byte-sensitive fixture globs;
- domain guardrails and publication policy.

This is an upstream DEVAI configuration-schema gap, not an active SGP aliasing
surface.
