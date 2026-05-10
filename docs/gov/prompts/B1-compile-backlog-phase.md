# B1 — Compile Backlog Phase (reusable, per-round)

**Type.** Reusable phase prompt. Run after B0 produces the audit pack.
**Working directory.** /Users/aarusso/Development/stech/sgp (verify with pwd).
**Output roots.** docs/work/round-<n>/12-round-<n+1>-backlog.md + appended draft column in docs/gov/audit/backlog-ledger.md.
**Skill awareness.** Defers to sgp-round-backlog when present.
**Memory.** MemPalace required.

---

## 1. Mission

Convert the round-<n> audit pack (B0 outputs + persistent ledgers) into the prioritized round-<n+1> backlog. This is the **plan** phase of the measure → plan → execute → compare loop.

The backlog is the input to B2 (materialize prompts) and ultimately to B3 (execute). Every backlog item must be grounded in a concrete path:line evidence pointer or a docs/refs/<domain>/... regulatory anchor.

---

## 2. Skill Routing

If skills are available, invoke sgp-round-backlog first; this prompt's contract still applies.

---

## 3. Inputs to Read

Persistent ledgers (committed):

- docs/gov/audit/functional-requisites.md
- docs/gov/audit/non-functional-requisites.md
- docs/gov/audit/backlog-ledger.md
- docs/gov/audit/schema-digest.md
- docs/gov/audit/api-surface.md

Round-<n> artifacts (just produced by B0):

- docs/gov/audit/diag/round-<n>/{gaps,regulatory-adherence,promise-vs-delivery,code-quality,hotspots,delta-from-round-<n-1>}.md
- docs/gov/audit/inv/round-<n>/{db,backend,frontend,tests,legacy-parity}.md
- docs/work/round-<n>/{00-snapshot,01a-round-<n-1>-digest,06-gaps,07-executive-summary}.md

Regulatory references:

- docs/refs/lgpd/, docs/refs/esocial/, docs/refs/tce/, docs/refs/legal/ (source for every regulatory anchor URL).

Authority:

- docs/gov/audit/functional-requisites.md
- docs/gov/audit/non-functional-requisites.md
- docs/gov/audit/backlog-ledger.md
- AGENTS.md (authority order, payroll-folia, no-shims).

---

## 4. Output Format

Write docs/work/round-<n>/12-round-<n+1>-backlog.md matching docs/work/round-1/12-round-2-backlog.md's shape:

```
# Phase 14 — Round-<n+1> Backlog (Recommended)

**Date.** YYYY-MM-DD. **HEAD.** <sha>. **Working tree.** /Users/aarusso/Development/stech/sgp.

<intro paragraph>

Effort classes: S ≤ 2 person-days · M ≤ 1 week · L 2–4 weeks · XL > 1 month.
Risk classes: low · medium · high · critical.

---

## Tier 1 — <theme> [must-fix-before-go-live]

### R<n+1>-NN: <title> [<domain>] [Effort: S|M|L|XL] [Risk: low|medium|high|critical] [Reg: yes|no]

- **Current state:** Score_R<n> <0..5>; cite <path:line> — <quote or summary>.
- **Target state:** Score_R<n+1> ≥ <N>; <one-line outcome>.
- **Regulatory exposure:** <Lei NNN/AAAA, art. N> — <docs/refs/...> — <primary URL>.
- **Dependencies:** <other R<n+1>-IDs or none>.
- **Acceptance criteria:**
  - <bullet>
  - <bullet>
- **Why this rank:** <one or two sentences linking to the evidence>.
```

Tiers (reuse round-1 / round-2 themes; rename when scope shifts):

1. **Production-time blockers** — anti-pattern lines, security gaps that block any go-live.
2. **Independent regulatory items** — eSocial event builders, fiscal events (DCTFWeb/EFD-Reinf), LGPD procedural.
3. **Critical-path go-live** — golden fixtures, report worker, portal auth, structured logging.
4. **Legacy parity** — XLSX importadores, FOL-013..017 reports, AFDT/ACJEF, LAI.
5. **Code-quality decomposition** — file-by-file refactors, lint/tsconfig hardening.
6. **Frontend modernization** — signals/OnPush/i18n/portal wiring/Playwright.
7. **Test debt + observability** — RLS specs, 403-negatives, fake-timers, Pino, OTel.
8. **DB hardening** — partitioning, FK indexes, PII tags, pgcrypto.
9. **Documentation alignment + TCE state expansion**.
10. **Deferred-decision spikes** — owner-decision spikes (e.g. PAdES/GovBR, real eSocial transmission).

Adjust tier list based on round-<n> realities. Compress empty tiers.

---

## 5. Prioritization Rule

Apply per the original assessment prompt:

order ≈ regulatory_exposure × effort_inverse × risk_to_close

- Regulatory exposure: high if cited in docs/refs/, ANPD/RFB/MTP active enforcement, breach-current deadline.
- Effort inverse: prefer S over L when regulatory + risk are similar.
- Risk to close: implementation uncertainty, dependency surface, owner decisions needed.

Within a tier, prefer easy-first and parallel-first.

---

## 6. Evidence Rules

- Every backlog item cites a concrete path:line from B0 inventories or persistent ledgers.
- Every regulatory item cites a docs/refs/<domain>/<file>.md anchor + the primary URL recorded there.
- Every DEFERRED item points at docs/gov/evidence/deferred-decision-ledger.md row.
- No invented FR-IDs. Reuse existing FR-IDs from docs/gov/audit/functional-requisites.md when the work targets a known FR.

---

## 7. Persistent-Ledger Update

After writing the backlog file, append a draft column to docs/gov/audit/backlog-ledger.md:

- Column header: R<n+1> (e.g. R4).
- For every new R<n+1>-NN item: row added with status PLANNED and a pointer to the backlog file.
- Existing rows get R<n+1> = (carry-over) only when explicitly requested in the backlog (otherwise leave blank).

Use npm run audit:backlog -- --round <n+1> --planned (built by A2) when available; otherwise edit by hand following the same schema.

---

## 8. MemPalace Protocol

Before starting:

- Query MemPalace for project:sgp, round:<n>, phase:audit (load B0 closing context).
- Query for phase:backlog, round:<n> to detect prior partial backlog work.
- If MCP lookup fails or the palace index is untrusted, use the non-destructive
  CLI fallback against `~/.mempalace/palace-coding`:
  `PATH="$HOME/Library/Python/3.9/bin:$PATH" mempalace --palace ~/.mempalace/palace-coding search --results 5 "<query>"`.
- If CLI search succeeds, mirror B1 notes under `docs/work/round-<n>/mempalace-backlog/`
  and continue with a blocker note. If both MCP and CLI are unavailable, write a
  blocker in `docs/work/round-<n>/QUESTIONS.md` and continue with file-backed
  evidence only.
- Do not run `mempalace repair`, restore backups, or rebuild indexes inside B1;
  those are owner-controlled recovery actions.

After each tier completion:

- Write a node tagged project:sgp, round:<n+1>, phase:backlog, tier:<N>, outcome:success|partial.
- Body: tier theme, item count, headline items, regulatory anchors used.

After full backlog completion:

- Write a summary node tagged project:sgp, round:<n+1>, phase:backlog, summary:complete.
- Body: total item count, per-tier counts, top 5 by regulatory_exposure × risk_to_close.

Per-item nodes are deferred to B2 / B3 (one node per item then).

---

## 9. Acceptance Criteria

- docs/work/round-<n>/12-round-<n+1>-backlog.md exists with the §4 schema.
- Every R<n+1>-NN item has Current state + Target state + Acceptance criteria + Dependencies.
- Every regulatory item has a docs/refs/... anchor + primary URL.
- docs/gov/audit/backlog-ledger.md has a new R<n+1> column with PLANNED rows for every new item.
- MemPalace per-tier nodes + summary node present.
- npm run governance:check passes (path references valid).

---

## 10. Final Self-Check

- [ ] Backlog file exists and is non-empty.
- [ ] Every item: path:line cited; regulatory items cite docs/refs/....
- [ ] Tier prioritization matches §5 rule.
- [ ] Persistent ledger updated with R<n+1> column (no rewrite of prior columns).
- [ ] MemPalace summary summary:complete present.
- [ ] Governance check passes.
