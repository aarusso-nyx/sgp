# SGP Observability Reference

TODO: Expand this file with metrics for all SGP subsystems as they are
instrumented. For now it documents the PDF/A validation metrics introduced in
SGP R11 W04.

---

## PDF/A Validation Metrics

Implemented in: `backend/src/report-service/pdf-a/pdf-a-validator-telemetry.decorator.ts`

These three metrics are emitted by `TelemetryPdfAValidator` for every
`validate()` call at runtime. They carry a `document_kind` label with low
cardinality (`payslip` | `yearly_income`), which enables per-document-type
analysis during the PDF/A trust period (SGP R11 W06).

### Metric names

| Name                                  | Type      | Labels                     | Description                                                                                                                                                                                                 |
| ------------------------------------- | --------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sgp_pdf_a_validation_attempts_total` | Counter   | `document_kind`            | Incremented once per `validate()` call regardless of outcome.                                                                                                                                               |
| `sgp_pdf_a_validation_errors_total`   | Counter   | `document_kind`, `rule_id` | Incremented once per non-conformant rule error in the result. A single document with 3 rule violations → 3 increments with distinct `rule_id` values. Label cardinality is bounded by veraPDF's clause set. |
| `sgp_pdf_a_validation_duration_ms`    | Histogram | `document_kind`            | Wall-clock time for a single `validate()` call, in milliseconds. Buckets: 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000 ms.                                                                         |

### Sample PromQL queries

**Rate of non-conformant documents by rule and kind (5-minute window):**

```promql
sum(rate(sgp_pdf_a_validation_errors_total[5m])) by (rule_id, document_kind)
```

**p95 validation latency by document kind (5-minute window):**

```promql
histogram_quantile(0.95, sum(rate(sgp_pdf_a_validation_duration_ms_bucket[5m])) by (le, document_kind))
```

### Failure policy

These metrics exist to support the trust-period monitoring phase (W06). The
runtime policy remains **warn-only** per the SGP R11 phased adoption plan
(RECONCILIATION D3): a `valid:false` result logs a warning but does not block
document delivery. The metrics do not influence this policy; they purely
observe it.

### Cross-references

- Upstream defect history and closure: `docs/gov/audit/diag/round-2-stynx-adoption-gaps.md`
- Baseline findings and STYNX R13 gap entries: `docs/work/round-11/stynx-r13-gaps.md`
- R13 handoff (all five defects closed, goldens regenerated): `docs/work/round-11/r13-handoff.md`
- Build-time strict gate (W05): parallel worker, separate spec file.
- Trust-period monitoring plan (W06): not yet implemented.

### Wiring

The `TelemetryPdfAValidator` decorator is wired in the default
`PdfAValidatorProvider` (production path). The `noop` path
(`SGP_PDF_A_VALIDATOR=noop`) bypasses telemetry — this keeps unit tests free
of Docker and metric side effects. Tests that want to assert metric values
should use `wrapWithTelemetry(inner, kind, metrics)` with an isolated
`PdfATelemetryMetrics` object created from a stub registry.
