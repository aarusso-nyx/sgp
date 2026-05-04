# Legacy Parity (Round 3)

**Mode: delta-only.** The 84-feature canonical legacy parity matrix is canonical at [`docs/work/round-2/10-legacy-parity.md`](../../../../work/round-2/10-legacy-parity.md) (426 lines, dated 2026-05-03). Round-3 was a governance / tooling round (see [`docs/work/round-3/00-snapshot.md`](../../../../work/round-3/00-snapshot.md) §"Notable structural additions vs round-2"); no `docs/leg/` content changed and no new closure waves landed against legacy gaps. This file documents the round-3 verification + the small set of changes since the round-2 baseline.

## Inputs verified at round-3

| Source                                                                                            | Round-2 verdict             | Round-3 verdict                                                 | Evidence                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`docs/leg/sql-reference/`](../../../../../docs/leg/sql-reference/)                               | unchanged                   | **unchanged**                                                   | `git log c66a7b9..HEAD -- docs/leg/sql-reference/` returns no commits |
| [`docs/leg/handoff/agent-handoff.md`](../../../../../docs/leg/handoff/agent-handoff.md)           | minor (2-line carrier note) | **+8 lines** in commit `134460b` (governance reorg banner)      | `git log c66a7b9..HEAD -- docs/leg/handoff/`                          |
| [`docs/leg/rev-eng/deprecation-status.md`](../../../../../docs/leg/rev-eng/deprecation-status.md) | minor                       | **±164 lines** in `134460b` (re-organized; no new deprecations) | `git log c66a7b9..HEAD -- docs/leg/rev-eng/`                          |
| [`docs/leg/audit/plan/*.prompt.md`](../../../../../docs/leg/audit/plan/)                          | round-1                     | **small banner edits** in `134460b`, `ee13825`                  | `git log c66a7b9..HEAD -- docs/leg/audit/`                            |

Net: zero behavioral change to the legacy reference surface in round-3. The minor commits are governance/banner reflows, not new gap closures or new uncovered legacy items.

## Per-feature delta vs round-2

Because no closure-wave delivery against legacy items landed in round-3 (the R3-\* items in [`docs/work/round-2/12-round-3-backlog.md`](../../../../work/round-2/12-round-3-backlog.md) are cross-cutting / regulatory / observability, **not** parity closures), the round-2 84-feature matrix carries forward unchanged.

| Subdomain                                                      |                  R2 ≥4 | R2 =3 | R2 =2 | R2 ≤1 | R3 Δ |
| -------------------------------------------------------------- | ---------------------: | ----: | ----: | ----: | ---: |
| Gestão (35)                                                    |                      9 |    13 |    11 |     2 |    0 |
| RH (14)                                                        |                      5 |     6 |     1 |     2 |    0 |
| Folha (17)                                                     |     (per round-2 §1.3) |       |       |       |    0 |
| Ponto / Saúde / TCE / Recrutamento / Convênio / Avaliação (18) | (per round-2 §1.4-1.6) |       |       |       |    0 |

Refer to [`docs/work/round-2/10-legacy-parity.md`](../../../../work/round-2/10-legacy-parity.md) §1.1–1.6 for the per-row table.

## Items still capped pending NQ-1 (legacy XLSX byte-parity)

Round-2 capped F-FOL-007 (Importador de Lançamento Manual), F-FOL-008 (Importador de Verbas de Servidor), F-FOL-009 (Importador de Verbas de Pensionista) at maturity 3 ("Equivalent at lower fidelity") because byte-level XLSX template parity vs the legacy template was unverified. **R3-045** ("Shared regulatory fixture conventions") in the round-3 backlog is the planned vehicle to lift the cap; it remains `planned` per [`docs/gov/audit/backlog-ledger.md`](../../backlog-ledger.md) tail rows. No round-3 movement.

## Headline carry-forward

Round-2 closing parity headline (verbatim from [`docs/work/round-2/10-legacy-parity.md:60`](../../../../work/round-2/10-legacy-parity.md)):

> R2: 9 ≥4 / 13 =3 / 11 =2 / 2 ≤1 (3 promotions: F-GES-005, F-GES-007, F-GES-008).

Round-3 maintains this headline. Promotion candidates for round-4 are the F-FOL importadores (lift NQ-1 cap to 4) and F-RCR-002 / F-RCR-003 (Wave-4 exclusions in round-2; still flagged in [`docs/work/round-2/01b-legacy-digest.md`](../../../../work/round-2/01b-legacy-digest.md) §3.1).
