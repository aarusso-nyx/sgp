# PDF/A Trust-Period Monitoring Plan

**Effective**: 2026-05-25 (W04 telemetry ship date)  
**Duration**: Minimum 14 days; extended through one full payroll cycle if month-end anomalies arise.  
**Owner decision gate**: W07 fail-fast policy flip or period extension.

---

## Purpose

SGP R11 ships PDF/A validation in warn-only mode (W04). The trust period gathers production telemetry before any decision to transition to fail-fast policy (W07). This doc defines the metrics, thresholds, weekly review checklist, and exit criteria for the 2-week monitoring window.

---

## Window

- **Start**: 2026-05-25 (W04 telemetry production deploy)
- **Minimum duration**: 14 calendar days of steady-state document traffic
- **Extension trigger**: If payroll month-end or other known anomaly falls within the window, extend through one full payroll cycle to capture typical load patterns

---

## Metrics to Watch

Three metrics emit from `TelemetryPdfAValidator` per W04 (see `docs/ops/observability.md`):

| Metric                       | Query                                                                                                                                                 | Target                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Daily success rate**       | `1 - (sum(rate(sgp_pdf_a_validation_errors_total[24h])) by (document_kind) / sum(rate(sgp_pdf_a_validation_attempts_total[24h])) by (document_kind))` | ≥ 99.9% sustained 7 consecutive days |
| **Per-rule error sparkline** | `sum(rate(sgp_pdf_a_validation_errors_total[5m])) by (rule_id, document_kind)`                                                                        | No rule trending up                  |
| **p95 validation latency**   | `histogram_quantile(0.95, sum(rate(sgp_pdf_a_validation_duration_ms_bucket[5m])) by (le, document_kind))`                                             | Stable; alert if > 1500 ms           |

---

## Weekly Review Checklist

For each complete calendar week during the trust period:

- [ ] **Success rate**: Capture 7-day success rate split by `document_kind` (payslip, yearly_income)
- [ ] **Top errors**: List the 5 rule IDs with highest error rates this week
- [ ] **New rules**: For any rule_id appearing for the first time, classify per W03 baseline (`docs/work/round-11/pdf-a-baseline-findings.md`) as: hotfix (category a), accept-as-warning (b), or defer-to-fail-flip (c). Document decision.
- [ ] **Timeouts**: Confirm `rule_id: stynx.timeout` rate = 0 (Docker validation never hung)
- [ ] **Throughput**: Confirm `sgp_pdf_a_validation_attempts_total` rate matches document-generation forecast (no silent validation skips)

---

## Exit Criteria — Advance to W07

**ALL of the following**:

- Success rate ≥ 99.9% sustained 7 consecutive days
- Zero NEW rule IDs in the last 7 days (only rules seen in W03 baseline or earlier weeks)
- p95 latency stable (no spike > 1500 ms)
- Owner signoff (name and date) in the fail-fast policy runbook (`docs/ops/pdf-a-fail-fast-flip.md`)

---

## Exit Criteria — Extend or Revert

**ANY of the following**:

- Success rate < 99% on any single day (signals systemic issue)
- New rule appears that cannot be classified within 48 hours (blocks decision)
- Validation throughput drops below expected rate (suggests timeouts or Docker failures)

---

## Telemetry Dashboard

Recommended Grafana panels:

### Panel 1: Daily Success Rate (stat)

```
1 - (sum(rate(sgp_pdf_a_validation_errors_total[24h])) by (document_kind) / sum(rate(sgp_pdf_a_validation_attempts_total[24h])) by (document_kind))
```

Format: percentage; threshold: ≥ 99.9% (green), < 99% (red).

### Panel 2: Per-Rule Error Rate (table)

```
topk(10, sum(rate(sgp_pdf_a_validation_errors_total[5m])) by (rule_id, document_kind))
```

Sort descending; include sparkline history.

### Panel 3: p95 Latency (histogram)

```
histogram_quantile(0.95, sum(rate(sgp_pdf_a_validation_duration_ms_bucket[5m])) by (le, document_kind))
```

Overlay 1500 ms alert line.

---

## Cross-References

- **W04 observability metrics**: `docs/ops/observability.md`
- **W03 baseline findings**: `docs/work/round-11/pdf-a-baseline-findings.md`
- **STYNX R13 gap closure**: `docs/work/round-11/r13-handoff.md`
- **W07 fail-fast policy runbook**: `docs/ops/pdf-a-fail-fast-flip.md` (forward link; author parallel)
- **R2 audit row**: `docs/gov/audit/diag/round-2-stynx-adoption-gaps.md`
