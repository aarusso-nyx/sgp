# B4 — Compare And Scorecard Phase (reusable, per-round)

> DEVAI canonical template: `../devai/docs/adopters/round-prompts/B4-verify-publish.md`
> (`B4 — verify and publish`, DEVAI R2 canonical adopter template).
>
> SGP keeps this as a local derivative rather than a thin wrapper because SGP's
> compare phase folds closure evidence into `docs/gov/audit/`, produces
> `compare.md`, and keeps publication disabled unless explicitly authorized by
> the user and `AGENTS.md`. Divergences are tracked in
> `docs/work/2026-05-23-prompts-divergence.md`.

**Type.** Reusable phase prompt. Run after B3 emits a completed round closure.
**Working directory.** /Users/aarusso/Development/stech/sgp (verify with pwd).
**Output roots.** `docs/work/round-<n>/compare.md`, optional updates to `docs/gov/audit/backlog-ledger.md`, and file-backed MemPalace mirrors.
**Skill awareness.** Defers to `sgp-round-verify-publish` for verification only; publish remains disabled without explicit user authorization.
**Memory.** MemPalace required, with the non-destructive CLI/file-backed fallback below.

---

## 1. Mission

Compare the completed round-<n> execution against its source backlog and prompt package, fold final statuses into retained governance evidence, and produce the compare artifact that the next B0/B1 cycle can read.

This prompt is the round-loop compare/fold-back phase. It does not replace `docs/gov/prompts/repo-quality-assessment.md`, which remains a standalone repository-wide scorecard assessment.

---

## 2. Inputs To Read

- `docs/work/round-<n>/closure.json`
- `docs/work/round-<n>/00-snapshot.md`
- `docs/work/round-<n-1>/12-round-<n>-backlog.md`
- `docs/work/round-<n-1>/prompts/ROUND<n>-INDEX.md`
- `docs/gov/audit/backlog-ledger.md`
- `docs/gov/audit/functional-requisites.md`
- `docs/gov/audit/non-functional-requisites.md`
- `AGENTS.md`

Verify all files against the live repository before writing the compare artifact.

---

## 3. Outputs

Write `docs/work/round-<n>/compare.md` with:

- Baseline and closure HEADs from `closure.json`.
- Delivered, partial, blocked, deferred, and not-delivered tables.
- Per-item evidence links and gates.
- Ledger fold-back status.
- Open owner decisions and next-round backlog seeds.
- A short readiness delta, scoped to this round only.

When the backlog ledger is not already folded back, run:

```bash
npm run audit:backlog -- --closure docs/work/round-<n>/closure.json
```

If the helper is unavailable or unsafe for the current checkout, edit only the current round column manually and record the reason in `compare.md`.

---

## 4. MemPalace Protocol

Before starting, query MemPalace for `project:sgp round:<n> phase:execute summary:complete`.

If MCP lookup fails or the palace index is untrusted, use the non-destructive CLI fallback:

```bash
PATH="$HOME/Library/Python/3.9/bin:$PATH" mempalace --palace ~/.mempalace/palace-coding search --results 5 "project:sgp round:<n> phase:execute"
```

If CLI search succeeds, mirror `compare.md` under `docs/work/round-<n>/mempalace/compare-completion.md` and continue with a blocker note. If both MCP and CLI are unavailable, record the blocker in `docs/work/round-<n>/QUESTIONS.md` and continue with file-backed evidence only.

Do not run `mempalace repair`, restore backups, delete palace files, or rebuild indexes inside B4. Those are owner-controlled recovery actions.

---

## 5. Gates

Run the smallest relevant gate first, then:

```bash
npm run governance:check
```

If B4 updates reusable prompts or scripts, also run:

```bash
npm run lint:check
npm run format:check
npm run typecheck
```

---

## 6. Publish Boundary

Do not commit, merge, push, publish, or open a PR unless the user explicitly asks for that action in the current turn.

---

## 7. Acceptance Criteria

- `docs/work/round-<n>/compare.md` exists and cites `closure.json`, the source backlog, and the prompt index.
- Every closure item is categorized as DONE, PARTIAL, BLOCKED, DEFERRED, or NOT DELIVERED.
- Backlog ledger fold-back is either complete or the blocker is recorded.
- MemPalace has a node or file-backed mirror using the tags `project:sgp, round:<n>, phase:compare, summary:complete`.
- `npm run governance:check` passes.

---

## 8. Final Self-Check

- [ ] Compare artifact exists and is non-empty.
- [ ] Delivered/partial/blocked/deferred/not-delivered tables are complete.
- [ ] Open owner decisions are carried into the next-round seed list.
- [ ] MemPalace fallback was used only non-destructively.
- [ ] Publish step was skipped unless explicitly authorized.
