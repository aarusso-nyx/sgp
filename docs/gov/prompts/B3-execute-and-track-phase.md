# B3 — Execute and Track Phase (reusable, per-round)

**Type.** Reusable phase prompt. Run after B2 materializes the round-<n+1> prompt fan-out.
**Working directory.** /Users/aarusso/Development/stech/sgp (verify with pwd).
**Output roots.** Product source (under each worker's owned scope), docs/work/round-<n+1>/, docs/gov/audit/backlog-ledger.md (status updates).
**Skill awareness.** Defers to sgp-round-orchestrator (execution) and sgp-round-verify-publish (closure). Routes gate failures to sgp-fix-lint, sgp-fix-build, sgp-fix-tests.
**Memory.** MemPalace required.

---

## 1. Mission

Execute the materialized round-<n+1> plan, track per-wave progress, run gates, drive fix-up loops, and produce the closure artifacts that B0 of round-<n+2> will consume.

This is the **execute** + **compare** phase of the measure → plan → execute → compare loop.

---

## 2. Skill Routing

If skills are available:

- sgp-round-orchestrator for the wave loop, fan-out, gate routing.
- sgp-fix-lint / sgp-fix-build / sgp-fix-tests for fix-up rounds.
- sgp-round-verify-publish only at round-end and only on explicit user authorization for commit/merge/push.

If skills are unavailable, follow the workflow inline.

---

## 3. Preflight

```bash
pwd
git status --short --branch
git rev-parse HEAD
git remote -v
git branch --show-current
```

Read:

- docs/work/round-<n>/prompts/00-orchestration-plan.md
- docs/work/round-<n>/prompts/ROUND<n+1>-INDEX.md
- The wave-launch file for the wave being executed.
- AGENTS.md, package.json, scripts/run.mjs for current command surface.

Identify dirty files: assistant/worker-owned vs unrelated. Never revert unrelated dirty files.

---

## 4. MemPalace Resume

Query MemPalace for:

- project:sgp, round:<n+1>, phase:execute, wave:<k> — partial wave state.
- project:sgp, round:<n+1>, r<n+1>-id:<ID> — per-item prior outcomes.
- outcome:blocked — items already blocked.
- If MCP lookup fails or the palace index is untrusted, use the non-destructive
  CLI fallback against `~/.mempalace/palace-coding`:
  `PATH="$HOME/Library/Python/3.9/bin:$PATH" mempalace --palace ~/.mempalace/palace-coding search --results 5 "<query>"`.
- If CLI search succeeds, mirror per-item completion notes under
  `docs/work/round-<n+1>/mempalace/` and continue with a blocker note for MCP
  recovery. If both MCP and CLI are unavailable, write a blocker in
  `docs/work/round-<n+1>/QUESTIONS.md` and continue with file-backed evidence only.
- Do not run `mempalace repair`, restore backups, or rebuild indexes inside B3;
  those are owner-controlled recovery actions.

Resume idempotently: skip items with outcome:success for this round; retry partial and blocked items only when their blocker is now resolved.

---

## 5. Wave Loop

For each wave in order:

### 5.1 Read launch

- Open docs/work/round-<n>/prompts/wave-<k>-launch.md.
- Record max concurrency, items, gates, common context.

### 5.2 Fan-out

- Spawn worker agents (or execute prompts inline) up to wave concurrency.
- Each worker:
  - Loads its prompt file.
  - Performs MemPalace handshake (query before, write after — required by the prompt header).
  - Runs the prompt's narrow gate first.
  - Runs the wave gate when local gate passes.

### 5.3 Merge

- Merge non-conflicting patches as workers complete.
- For conflicting patches, serialize by file ownership (workers in the same wave should not own overlapping files; if they do, the wave plan was wrong — record in QUESTIONS.md).

### 5.4 Wave gate

Run the wave gate from 00-orchestration-plan.md ## 7. Common gates. Typical:

```bash
npm run lint:check
npm run format:check
npm run typecheck
npm run governance:check
npm run test:backend -- --runInBand        # when backend touched
npm run test:frontend:coverage             # when frontend touched
npm run test:frontend:e2e                  # when frontend touched
DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db   # when DB-backed
```

### 5.5 Fix-up loop (≤ 2 rounds)

If the wave gate fails:

- Identify the failing area (lint / format / typecheck / governance / unit / e2e / db / coverage).
- Spawn a focused fix-up agent:
  - Lint/format → sgp-fix-lint.
  - Typecheck/build → sgp-fix-build.
  - Tests (Jest / Vitest / Playwright / RLS) → sgp-fix-tests.
- Cap at 2 fix-up rounds per gate.
- After 2 failed fix-up rounds, write a blocker entry to docs/work/round-<n+1>/QUESTIONS.md and continue to the next wave (do not block other waves on this).

### 5.6 Per-item closure

For each completed item, mirror what round-2 did under docs/work/round-2/mempalace/:

- Write docs/work/round-<n+1>/mempalace/<id>-completion.md with the round-2 schema:
  - tags line (tags: project:sgp, round:<n+1>, wave:<k>, r<n+1>-id:<ID>, outcome:<...>).
  - cwd line.
  - Files touched (bullet list).
  - Gates passed (bullet list).
  - Thresholds, surprises, remaining TODOs, next-wave line.
- Write the same content to MemPalace as a node with the same tags.

---

## 6. Wave-End Tracking

After each wave gate passes (or two failed fix-up rounds escalate to QUESTIONS.md):

- Update docs/work/round-<n+1>/00-snapshot.md running closure table (one row per item: status, evidence path, gate result).
- Update docs/gov/audit/backlog-ledger.md R<n+1> column status for closed items: PLANNED → DONE | PARTIAL | BLOCKED | DEFERRED. Use npm run audit:backlog -- --round <n+1> --apply (built by A2) when available.

---

## 7. Round-End Closure

After all waves complete:

### 7.1 Closure manifest

Emit docs/work/round-<n+1>/closure.json:

```json
{
  "round": <n+1>,
  "head_baseline": "<sha at round start>",
  "head_closure": "<sha at round end>",
  "items": [
    {
      "id": "R<n+1>-NNN",
      "wave": <k>,
      "status": "DONE|PARTIAL|BLOCKED|DEFERRED",
      "evidence": ["<path:line>", "..."],
      "gates": {
        "lint": "pass|fail",
        "typecheck": "pass|fail",
        "test": "pass|fail|skipped",
        "governance": "pass"
      },
      "mempalace_node_tag": "r<n+1>-id:R<n+1>-NNN"
    }
  ]
}
```

### 7.2 Snapshot finalization

Write the round-end section of docs/work/round-<n+1>/00-snapshot.md, mirroring docs/work/round-3/00-snapshot.md:

- Differential — round-<n> prompts → round-<n+1> closures: ✅ CLOSED / ⚠️ PARTIAL / ❌ NOT DELIVERED tables.
- Δ Metrics tables (feature-level, global completeness).
- Stack delta.
- Readiness verdict update.

### 7.3 Persistent ledger fold-back

Run:

```bash
npm run audit:backlog -- --closure docs/work/round-<n+1>/closure.json
```

This appends round-<n+1> final statuses to docs/gov/audit/backlog-ledger.md (idempotent; previous columns untouched).

---

## 8. Publish (only on explicit authorization)

Defer to sgp-round-verify-publish. Required user wording: "commit", "merge", "push", "publish", or "open PR". Without that wording, **stop after §7** and report status.

When authorized:

- Compose commit message in the round-N closure-wave style (Implement SGP round <n+1> closure waves).
- Co-author trailer per repository convention.
- Run final gates one more time before commit.
- Push and open PR per sgp-round-verify-publish.

---

## 9. Stop Conditions

Stop and ask only on:

- MUST DEFER decision flagged by a worker (recorded in QUESTIONS.md).
- High-impact folia/spec payroll conflict (per AGENTS.md).
- Two failed autonomous fix-up rounds for the same gate.
- User explicitly requested pause.

Otherwise keep moving — log and continue.

---

## 10. Rules

- Preserve user/worker changes. Never git checkout/git reset/git restore an unrelated dirty file.
- Use stubs/mocks/sandbox/golden fixtures for external services unless the user explicitly requests real-service tests (eSocial, ICP-Brasil, GovBR, TCEs, banking, SIAFIC).
- Do not add v0.0.1 backward-compatibility shims.
- Worker prompts already loaded docs/refs/ for regulatory anchors and docs/gov/audit/ for distilled audit input — do not re-fetch or re-walk.
- All progress visible via MemPalace queries on round:<n+1>, phase:execute.

---

## 11. MemPalace Protocol

Before starting (also covered in §4):

- Query project:sgp, round:<n+1>, phase:execute.
- Use the non-destructive CLI/file-backed fallback from §4 when MCP is unavailable
  or untrusted. Never run MemPalace repair or backup restore as part of the B3
  wave loop.

Per item (worker is responsible per its prompt header; orchestrator verifies):

- Node tagged project:sgp, round:<n+1>, wave:<k>, r<n+1>-id:<ID>, outcome:success|partial|blocked.
- Mirror to docs/work/round-<n+1>/mempalace/<id>-completion.md.

Per wave:

- Node tagged project:sgp, round:<n+1>, phase:execute, wave:<k>, outcome:success|partial. Body: items closed, gates run, fix-up rounds used, blockers escalated.

Round-end:

- Summary node tagged project:sgp, round:<n+1>, phase:execute, summary:complete. Body: closure.json path, head_closure SHA, item count by status, suggested round-<n+2> themes.

---

## 12. Acceptance Criteria

- All wave gates pass (or blockers logged in docs/work/round-<n+1>/QUESTIONS.md).
- One docs/work/round-<n+1>/mempalace/<id>-completion.md per closed item.
- docs/work/round-<n+1>/closure.json emitted.
- docs/work/round-<n+1>/00-snapshot.md round-end sections written.
- docs/gov/audit/backlog-ledger.md R<n+1> column finalized.
- MemPalace per-item, per-wave, and summary:complete nodes present.
- Publish step skipped unless explicit user authorization received.

---

## 13. Final Self-Check

- [ ] Wave loop ran to completion or escalated cleanly to QUESTIONS.md.
- [ ] No unrelated dirty file reverted.
- [ ] Per-item closure files mirror MemPalace nodes.
- [ ] closure.json schema valid.
- [ ] Round-end 00-snapshot.md matches the round-3 template structure.
- [ ] backlog-ledger.md R<n+1> column finalized via tooling, not by hand.
- [ ] No commit/merge/push without explicit user authorization.
- [ ] MemPalace summary:complete present.
