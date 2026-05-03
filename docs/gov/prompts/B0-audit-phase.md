# B0 — Audit Phase (reusable, per-round)

**Type.** Reusable phase prompt. Run at the start of every SGP round.
**Working directory.** /Users/aarusso/Development/stech/sgp (verify with pwd).
**Output roots.** docs/work/round-<n>/ (round-scoped) + docs/gov/audit/{,inv/round-<n>/,diag/round-<n>/} (governance-tracked).
**Skill awareness.** Defers to sgp-round-audit when present (Claude or Codex). Falls through to inline workflow if not.
**Memory.** MemPalace required.

---

## 1. Mission

Produce the per-round audit pack: a snapshot of git state, a refresh of the persistent ledgers under docs/gov/audit/, round-scoped inventories under docs/gov/audit/inv/round-<n>/, round-scoped diagnostics under docs/gov/audit/diag/round-<n>/, and the round-context digest under docs/work/round-<n>/.

This is the **measure** phase of the measure → plan → execute → compare loop. It is read-only on product source.

---

## 2. Skill Routing

If the executing agent supports skills:

- Invoke sgp-round-audit first; it owns workflow semantics.
- This prompt's body still applies as the contract the skill must honor.

If skills are unavailable, follow the workflow inline.

---

## 3. Known Stack — Do Not Redetect

Cite as facts in 00-snapshot.md:

- npm workspaces, roots backend/, frontend/admin/, frontend/portal/.
- NestJS backend, Angular ^21.2.0 admin + portal.
- PostgreSQL with canonical raw DDL under database/sql/\*\*. prisma/schema.prisma is non-runtime.
- Jest backend, Vitest frontend, Playwright e2e.
- npm@11.12.1, Node >=24.0.0 <25.
- Dispatcher scripts/run.mjs.

The assessment-prompt.md rule "detect ORM empirically" is **superseded** by this section.

---

## 4. Workflow

### 4.1 Snapshot

Write docs/work/round-<n>/00-snapshot.md with:

- Current HEAD SHA, branch.
- Previous-round baseline SHA (read from docs/work/round-<n-1>/00-snapshot.md).
- Commits + diff stats since baseline (git rev-list --count, git diff --shortstat).
- Commits-in-window table (SHA, date, subject).
- git status --porcelain output.
- Stack delta vs previous round (LOC by surface area).
- Notable structural additions (new modules, new SQL files, new docs trees).

### 4.2 Refresh persistent ledgers (tooling)

Run, in order:

```bash
npm run audit:schema    -- --round <n>
npm run audit:api       -- --round <n>
npm run audit:fr        -- --round <n>
npm run audit:tests     -- --round <n>
npm run audit:hotspots  -- --round <n> --baseline <prev-sha>
npm run audit:pvd       -- --round <n>
```

These (built by A2) refresh:

- docs/gov/audit/schema-digest.md
- docs/gov/audit/api-surface.md
- docs/gov/audit/functional-requisites.md (status cells only; FR-IDs stable)
- docs/gov/audit/diag/round-<n>/{fr-delta,hotspots,promise-vs-delivery}.md
- docs/gov/audit/inv/round-<n>/{schema-digest.json,api-surface.json,test-coverage-map.{md,json}}

### 4.3 Round-scoped inventories

Under docs/gov/audit/inv/round-<n>/ (some written by tooling, some by the agent):

- db.md — narrative wrapper around schema-digest.json: domain clusters, smells, RLS gaps. Cite path:line.
- backend.md — module map, controller × route × DTO, workers, integrations, audit/RBAC posture.
- frontend.md — admin + portal route map, components, services, HttpClient call sites mapped to backend routes, i18n/a11y posture, signals/OnPush coverage.
- tests.md — narrative wrapper around test-coverage-map.json: per-domain coverage %, payroll/eSocial paths without golden tests.
- legacy-parity.md — comparison vs docs/leg/sql-reference/ and docs/work/round-<n-1>/10-legacy-parity.md.

### 4.4 Round-scoped diagnostics

Under docs/gov/audit/diag/round-<n>/:

- gaps.md — top 10 missing features by regulatory exposure; top 10 critical-path features at maturity ≤ 2; cross-cutting concerns (idempotency, retro-processing, money rounding, tz, RBAC, audit trail, concurrency, multi-tenant).
- regulatory-adherence.md — score per docs/ref/<domain>/ set (eSocial / LGPD / TCE / Legal). Cite docs/ref/... for the obligation, path:line for the implementation.
- code-quality.md — repeats round-1 §08 schema (LOC per file, cyclomatic-complexity proxies, dependency-graph hotspots).
- delta-from-round-<n-1>.md — feature-level matrix delta + global-completeness delta + readiness verdict update.
- hotspots.md and promise-vs-delivery.md come from §4.2 tooling.

### 4.5 Round-context digest

Write docs/work/round-<n>/01a-round-<n-1>-digest.md:

- Mirror the format of docs/work/round-2/01a-round-1-digest.md.
- **Link to** docs/gov/audit/{schema-digest,api-surface,functional-requisites}.md rather than duplicating.
- Section headings same as round-2 digest for downstream-prompt continuity.

### 4.6 Optional synthesis

Write the audit-pack synthesis files (kept for continuity with rounds 1–3):

- docs/work/round-<n>/05-feature-matrix.md — points at docs/gov/audit/functional-requisites.md; supplements with maturity 0–5 score and round-specific notes.
- docs/work/round-<n>/05-metrics.md — completeness, stated-vs-implemented gap, test density.
- docs/work/round-<n>/06-gaps.md — extends docs/gov/audit/diag/round-<n>/gaps.md with round-specific narrative.
- docs/work/round-<n>/07-executive-summary.md — ≤ 3 pages: global %, per-domain %, three readiness verdicts, top-5 risks, top-5 quick wins, suggested 90-day roadmap.

---

## 5. Evidence Rules

- Cite path:line for every positive implementation claim.
- Use not located only after listing the search surface (file globs, regex used).
- No if present. The repo's parent paths are known; state them.
- Anchor regulatory claims in docs/ref/<domain>/.... Do **not** re-fetch primary sources unless the user explicitly says "refresh ref".
- Pick the lower maturity score on uncertainty; justify in Notes.

---

## 6. MemPalace Protocol

Before starting:

- Query MemPalace for project:sgp, round:<n-1>, phase:audit, gov:audit to load the previous-round closing context.

After each artifact:

- Write a node tagged project:sgp, round:<n>, phase:audit, artifact:<filename>, head:<git rev-parse HEAD>, outcome:success|partial.
- Body: artifact path, source files consumed, key findings (≤ 5 bullets), surprises, downstream-prompt hooks.

At round-audit completion:

- Write a summary node tagged project:sgp, round:<n>, phase:audit, summary:complete. List all artifacts written and their paths.

---

## 7. Read-Only Constraints

- No edits to backend/, frontend/, database/, scripts/ (other than dispatcher consumption).
- No edits to docs/eng/, docs/user/, docs/leg/ (those are authoritative; audit observes them).
- Writes only under docs/work/round-<n>/, docs/gov/audit/{,inv/round-<n>/,diag/round-<n>/}.
- Do not run product builds, broad tests, or migrations. Tooling under audit:\* is the only sanctioned dynamic command.

---

## 8. Acceptance Criteria

- docs/work/round-<n>/00-snapshot.md exists with current HEAD + previous-round baseline.
- docs/gov/audit/{schema-digest,api-surface,functional-requisites,non-functional-requisites}.md refreshed (or unchanged with a last_refreshed: <sha> line).
- docs/gov/audit/inv/round-<n>/{db,backend,frontend,tests,legacy-parity}.md exist.
- docs/gov/audit/diag/round-<n>/{gaps,regulatory-adherence,code-quality,delta-from-round-<n-1>,hotspots,promise-vs-delivery}.md exist.
- docs/work/round-<n>/01a-round-<n-1>-digest.md exists.
- git status shows changes only under sanctioned write roots.
- MemPalace summary node present with summary:complete.
- npm run governance:check exits 0.

---

## 9. Final Self-Check

- [ ] No write outside docs/work/round-<n>/ and docs/gov/audit/ subtrees.
- [ ] HEAD SHA recorded in 00-snapshot.md matches git rev-parse HEAD.
- [ ] Every artifact in §8 exists and is non-empty.
- [ ] path:line citations used; not located only with search surface.
- [ ] Regulatory claims anchored in docs/ref/.
- [ ] MemPalace nodes present for every artifact + summary.
- [ ] Governance check passes.
