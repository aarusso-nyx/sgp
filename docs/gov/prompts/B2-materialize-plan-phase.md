# B2 — Materialize Plan Phase (reusable, per-round)

> DEVAI canonical template: `../devai/docs/adopters/round-prompts/B2-wave-plan.md`
> (`B2 — wave plan`, DEVAI R2 canonical adopter template).
>
> SGP keeps this as a local derivative rather than a thin wrapper because the
> materialized prompt package must encode SGP wave-launch files, round indexes,
> file ownership, MemPalace/file-backed fallback, and SGP gate commands.
> Divergences are tracked in `docs/work/2026-05-23-prompts-divergence.md`.

**Type.** Reusable phase prompt. Run after B1 produces the round-<n+1> backlog.
**Working directory.** /Users/aarusso/Development/stech/sgp (verify with pwd).
**Output root.** docs/work/round-<n>/prompts/.
**Skill awareness.** Defers to DEVAI `SKILL-round-backlog` (prompt schema) and `SKILL-round-orchestrate` (orchestrator semantics); local SGP skills are adapters only.
**Memory.** MemPalace required.

---

## 1. Mission

Convert the round-<n+1> backlog (docs/work/round-<n>/12-round-<n+1>-backlog.md) into the orchestrator + worker prompt fan-out under docs/work/round-<n>/prompts/, ready for B3 to execute.

This phase produces:

- docs/work/round-<n>/prompts/00-orchestration-plan.md
- docs/work/round-<n>/prompts/ROUND<n+1>-INDEX.md
- docs/work/round-<n>/prompts/wave-<k>-launch.md (one per wave)
- docs/work/round-<n>/prompts/<wave>-R<n+1>-<id>-<slug>.prompt.md (one per backlog item)

Layout matches docs/work/round-2/prompts/ exactly so B3 and DEVAI `SKILL-round-orchestrate` can load it without configuration.

---

## 2. Wave Planning

### 2.1 Group by tier and parallel-safety

- Read the backlog from B1.
- Group items by tier (round-1/round-2 used 10 tiers; the actual count comes from B1).
- Within a tier, identify parallel-safe sets (no shared file ownership, no shared DTO).
- Hard dependencies cross-wave: enumerate them in a ## 3. Dependency graph Mermaid block.

### 2.2 Wave table

Mirror the round-2 orchestration table:

| Wave | Theme | Items                  | Count | Max concurrent |
| ---: | ----- | ---------------------- | ----: | -------------: |
|    0 | …     | R<n+1>-NNN..R<n+1>-NNN |     N |              N |

Default max concurrency: 4–6 (round-2 used 3–6).

### 2.3 Effort tiers (gpt-5.5)

State the same tier ladder as round-2:

- **low** — single-surface docs/config/test inventory changes, low conflict risk.
- **medium** _(default)_ — contained source change, one helper, one module, one feature slice with tests.
- **high** — cross-cutting tests, API contract generation, DB migrations, regulatory behavior, frontend CI gates.
- **xhigh** — large-decision spikes; agent investigates deeply, implements minimal safe slice, produces owner-decision record only when necessary.

Default model: gpt-5.5. Default reasoning tier: medium.

---

## 3. Orchestration Plan File

Write docs/work/round-<n>/prompts/00-orchestration-plan.md mirroring docs/work/round-2/prompts/00-orchestration-plan.md exactly. Required sections (verbatim section headings):

1. ## 1. Mission
2. ## 2. Wave structure — wave table.
3. ## 3. Dependency graph — Mermaid + cross-wave hard-dependencies table.
4. ## 4. gpt-5.5 effort tiers — text from §2.3.
5. ## 5. Autonomy contract — ### Agents MAY without asking / ### Agents MUST DEFER.
6. ## 6. Mempalace protocol — see §6 below.
7. ## 7. Common gates — pull live from package.json:

   ```text
   npm run lint:check
   npm run format:check
   npm run typecheck
   npm run governance:check
   npm run test:backend -- --runInBand
   npm run test:coverage
   npm run test:frontend:coverage
   npm run test:frontend:e2e
   DATABASE_URL=postgresql://$USER@localhost:5432/sgp_test npm run test:db
   ```

8. ## 8. Orchestrator operating loop — wave loop semantics (read launch, MemPalace query, fan out, merge, gate, fix-up ≤ 2 rounds, escalate).
9. ## 9. Launch files — list of wave-<k>-launch.md with one-line theme each.

---

## 4. Wave-Launch Files

For each wave, write docs/work/round-<n>/prompts/wave-<k>-launch.md:

````
# Wave <k> — <theme>

Items in this wave: **<N>**.

## Summary
<one paragraph>.

## Items
| R<n+1>-ID | Title | Effort | Risk | gpt-5.5 effort | Depends-on | Prompt file |
|---|---|---|---|---|---|---|
| R<n+1>-NNN | … | S/M/L/XL | low/medium/high/critical | low/medium/high/xhigh | none or comma list | <file> |

## Orchestrator sketch
```text
fanout(glob("docs/work/round-<n>/prompts/<W>-R<n+1>-*.prompt.md"), max_concurrent=<N>, model="gpt-5.5")
run_wave_gate([...])
````

## Common context

- docs/gov/audit/functional-requisites.md
- docs/gov/audit/diag/round-<n>/<relevant>.md
- docs/refs/<relevant>/...
- docs/work/round-<n>/01a-round-<n-1>-digest.md

````

---

## 5. Worker Prompt Files

For every backlog item, write docs/work/round-<n>/prompts/<wave>-R<n+1>-<id>-<slug>.prompt.md. Schema (mirror docs/work/round-2/prompts/00-R3-001-docs-truth-ledger.prompt.md):

```markdown
# R<n+1>-NNN — <title>

**Wave:** <k> · **Effort:** S|M|L|XL · **Risk:** low|medium|high|critical · **Reg:** yes|no|mixed
**gpt-5.5 reasoning effort:** low|medium|high|xhigh
**Parallel-safe with:** R<n+1>-NNN, R<n+1>-NNN
**Depends on:** none | R<n+1>-NNN

## Mission
<one paragraph>.

## Authoritative context — read first
- docs/refs/<domain>/<file>.md       # regulatory anchor
- docs/eng/<file>.md                 # product behavior anchor
- docs/gov/audit/functional-requisites.md
- docs/gov/audit/api-surface.md      # only when route work is involved
- docs/gov/audit/schema-digest.md    # only when schema work is involved
- docs/work/round-<n>/01a-round-<n-1>-digest.md

Use these as distilled audit input, then verify live source before editing. Update only authoritative live docs (docs/eng/, docs/gov/, docs/user/); do not normalize docs/work/** as authority.

## Live verification
- Confirm <path:line> matches the audit claim.
- Confirm <route or symbol> exists at <path:line>.

## Scope and ownership
**Owns:** <file>, <file>.
**Avoids:** <file>, <file> (owned by R<n+1>-NNN in same wave).

## Mempalace protocol
Query MemPalace for project:sgp, round:<n+1>, r<n+1>-id:R<n+1>-NNN, wave:<k>, <module-path>. Read the newest relevant nodes. After completion, write an outcome node tagged project:sgp, round:<n+1>, wave:<k>, r<n+1>-id:R<n+1>-NNN, outcome:success|partial|blocked with files touched, gates run, surprises, remaining TODOs, and one line for the next wave.

## Acceptance criteria
- <bullet>
- <bullet>
- Gates: <narrow first>, then npm run lint:check, npm run format:check, npm run typecheck, npm run governance:check.

## Autonomy directives
MAY <…>. MUST DEFER <…>.
````

### 5.1 Required prompt-header anchors

- docs/refs/<domain>/... for every regulatory item.
- docs/gov/audit/{schema-digest,api-surface,functional-requisites}.md instead of source-walk instructions.
- docs/work/round-<n>/01a-round-<n-1>-digest.md as the round-context handoff.

### 5.2 What worker prompts must NOT do

- Re-fetch primary regulatory sources (use docs/refs/).
- Re-walk full schema or API (use docs/gov/audit/).
- Redetect ORM/test runner/workspace shape (state as known).
- Hedge with if present — every parent path is known.

---

## 6. Round Index

Write docs/work/round-<n>/prompts/ROUND<n+1>-INDEX.md:

```markdown
# Round <n+1> Backlog Index

| R<n+1>-ID  | Wave | Title | Effort | gpt-5.5 effort | Prompt file | Mempalace tag        |
| ---------- | ---- | ----- | ------ | -------------- | ----------- | -------------------- |
| R<n+1>-NNN | 0    | …     | S      | low            | <file>      | r<n+1>-id:R<n+1>-NNN |
```

---

## 7. MemPalace Protocol

Before starting:

- Query MemPalace for project:sgp, round:<n+1>, phase:backlog (load B1 closing context).
- If MCP lookup fails or the palace index is untrusted, use the non-destructive
  CLI fallback against `~/.mempalace/palace-coding`:
  `PATH="$HOME/Library/Python/3.9/bin:$PATH" mempalace --palace ~/.mempalace/palace-coding search --results 5 "<query>"`.
- If CLI search succeeds, mirror materialization notes under
  `docs/work/round-<n>/mempalace-materialize/` and continue with a blocker note.
  If both MCP and CLI are unavailable, write a blocker in
  `docs/work/round-<n>/QUESTIONS.md` and continue with file-backed evidence only.
- Do not run `mempalace repair`, restore backups, or rebuild indexes inside B2;
  those are owner-controlled recovery actions.

After orchestration plan + each wave-launch:

- Write a node tagged project:sgp, round:<n+1>, phase:materialize, wave:<k>, outcome:success|partial.

After all worker prompts written:

- Write a summary node tagged project:sgp, round:<n+1>, phase:materialize, summary:complete. Body: orchestration plan path, wave count, total item count, ROUND<n+1>-INDEX path.

---

## 8. Acceptance Criteria

- docs/work/round-<n>/prompts/00-orchestration-plan.md exists with all 9 sections of §3.
- One wave-<k>-launch.md per wave.
- One <wave>-R<n+1>-<id>-<slug>.prompt.md per backlog item.
- ROUND<n+1>-INDEX.md exists; row count == backlog item count.
- Every worker prompt has the §5 schema and the §5.1 authoritative-context anchors.
- npm run governance:check passes.
- MemPalace summary node summary:complete present.

---

## 9. Final Self-Check

- [ ] All sections in §3 are present in 00-orchestration-plan.md.
- [ ] Wave-launch file count == wave count from §2.2 table.
- [ ] Worker prompt count == backlog item count.
- [ ] Every worker prompt cites docs/refs/ for regulatory work.
- [ ] No worker prompt instructs re-walking the schema or API surface.
- [ ] No if present anywhere in generated prompts.
- [ ] Governance check passes.
- [ ] MemPalace summary present.
