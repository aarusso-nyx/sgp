# PDF/A Fail-Fast Policy Flip

**Effective**: Upon approval by W06 trust-period owner signoff  
**Scope**: Transition `PdfABuilderService` from warn-only (W04–W06) to fail-fast validation policy  
**Risk level**: Moderate; payload is payslip and yearly-income PDF generation during payroll ops

---

## Prerequisites

### Trust-Period Exit Criteria Met

W06 monitoring must confirm exit criteria from `docs/ops/pdf-a-trust-period.md`:

- [ ] Success rate ≥ 99.9% sustained 7 consecutive days
- [ ] Zero NEW rule IDs in the last 7 days
- [ ] p95 latency stable (no spike > 1500 ms)
- [ ] Owner signoff (name and date recorded here)

**Owner Signoff**: **********\_********** Date: **\_\_\_**

### STYNX R13 Closure

STYNX R13 (`cb1916f8` "Engineer: close PDF/A-2b conformance gaps") closed all five upstream PDF/A-2b defects (`stynx-r13-pdf-a-001..005`):

- Liberation font subsetting
- XMP `pdfaid:part` / `pdfaid:conformance` block
- sRGB ICC `OutputIntent`
- Trailer `/ID` array
- Incremental update / no bytes-after-EOF

Verification: SGP R11 W02 pre-flight regenerated goldens (`tests/backend/golden/payslip-pdf-a-v01/expected.pdf` and `tests/backend/golden/comprovante-anual-v01/expected.pdf`); VeraPDF reports `compliant=true` for both on current `@stynx/pdf` version. Audit trail: `docs/gov/audit/diag/round-2-stynx-adoption-gaps.md` § "2026-05-25 — R11 / W03 PDF/A baseline run".

### Consumers Notified

Payslip and yearly-income PDF generation is consumed by:

1. **Payslip batch job**: `backend/src/report-service/payslip/payslip-render.service.ts` (`renderAndPersist` method) — called by payroll worker per payroll run
2. **Yearly-income batch job**: `backend/src/report-service/yearly-income/yearly-income-batch.service.ts` (`generate` method) — called during fiscal reconciliation
3. **Portal endpoints**: `backend/src/report-service/payslip/payslip.controller.ts` and `backend/src/report-service/yearly-income/yearly-income.controller.ts` — on-demand download endpoints

**Notification checklist**:

- [ ] Slack #payroll-ops: 24h pre-flip notice posted
- [ ] Status page entry created
- [ ] Rollback SOP acknowledged by on-call team

### Decision-Maker on Call

Designated rollback decision-maker: **********\_********** (name/contact)

---

## The Flip: Code Change

### Location

- **File**: `backend/src/report-service/pdf-a/pdf-a-validator-telemetry.decorator.ts` (or `pdf-a-validator.provider.ts` — implementation choice at flip time)
- **Related file**: `backend/src/report-service/payslip/pdf-a-builder.service.ts` (`runValidation` method)

### Change Summary

#### 1. Add Failure-Policy Parameter to Decorator

Add a `failurePolicy: 'warn' | 'fail-fast'` parameter to `TelemetryPdfAValidator` constructor (default `'warn'` during feature branch, flipped to `'fail-fast'` in provider factory):

```typescript
export class TelemetryPdfAValidator implements PdfAValidator {
  constructor(
    private readonly inner: PdfAValidator,
    private readonly defaultKind: DocumentKind,
    private readonly failurePolicy: 'warn' | 'fail-fast' = 'warn',
    metrics?: PdfATelemetryMetrics,
  ) {
    this.metrics = metrics ?? globalPdfATelemetryMetrics;
  }
  // ... existing methods
}
```

#### 2. Implement Fail-Fast Logic in `validateAs`

When validation completes and `policy === 'fail-fast' && !result.valid`, throw a new error:

```typescript
async validateAs(
  pdf: Uint8Array,
  opts: PdfAValidateOptions | undefined,
  kind: DocumentKind,
): Promise<PdfAValidationResult> {
  // ... existing instrumentation and delegation ...

  if (this.failurePolicy === 'fail-fast' && !result.valid) {
    throw new PdfAConformanceError(
      `PDF/A validation failed for ${kind}`,
      result,
    );
  }
  return result;
}
```

#### 3. Define PdfAConformanceError

New error class (co-located in same file or `pdf-a/errors/` subdir):

```typescript
export class PdfAConformanceError extends Error {
  constructor(
    message: string,
    public readonly validationResult: PdfAValidationResult,
  ) {
    super(message);
    this.name = 'PdfAConformanceError';
  }
}
```

#### 4. Flip the Provider Factory Default

In `backend/src/report-service/pdf-a/pdf-a-validator.provider.ts`, update the factory to instantiate with `failurePolicy: 'fail-fast'`:

```typescript
const validator = new TelemetryPdfAValidator(
  innerValidator,
  'payslip', // or 'yearly_income' per context
  'fail-fast', // ← flip from 'warn'
);
```

#### 5. Update `runValidation` (if needed)

If warn-only logging is kept as a fallback, simplify the catch logic:

```typescript
private async runValidation(
  pdf: Uint8Array,
  label: string,
  kind: DocumentKind,
): Promise<PdfAValidationResult> {
  try {
    const result = isTelemetryValidator(this.validator)
      ? await this.validator.validateAs(pdf, DEFAULT_PDF_A_OPTS, kind)
      : await this.validator.validate(pdf, DEFAULT_PDF_A_OPTS);
    return result; // valid case
  } catch (error) {
    if (error instanceof PdfAConformanceError) {
      // Fail-fast policy: re-throw, caller (render service) handles
      throw error;
    }
    // Other errors: unexpected, propagate
    throw error;
  }
}
```

---

## Deployment Sequence

### 1. Feature Branch

Create branch `feat/pdf-a-fail-fast-policy-flip` with the above changes. Do **not** include long-term simplifications (removal of warn-mode code paths) — they are deferred to post-stabilization.

### 2. Pre-Flight Testing

```bash
# Full suite, including W05 conformance gate
npm run test:e2e

# Explicitly run the PDF/A conformance suite
npx jest tests/backend/pdf-a-conformance.e2e-spec.ts --testTimeout=45000

# Type check and lint
npm run typecheck
npm run lint:check
npm run governance:check
```

**Expected**: All tests pass, conformance gate validates both payslip and yearly-income PDFs as `valid: true`.

### 3. Deploy to Staging

Merge feature branch to staging environment. Run manual smoke test:

```bash
# Generate representative payslip PDF
curl -X POST https://staging-api/payslip/{runId}/{employeeId} \
  -H "Authorization: Bearer $STAGING_TOKEN"

# Generate yearly-income PDF
curl -X POST https://staging-api/yearly-income/{year} \
  -H "Authorization: Bearer $STAGING_TOKEN"
```

Both requests must **succeed** (no `PdfAConformanceError` thrown).

### 4. Monitor Staging Metrics

Check Grafana / metrics endpoint at `/metrics`:

```bash
curl https://staging-api/metrics | grep sgp_pdf_a_validation
```

Expected:

- `sgp_pdf_a_validation_attempts_total{document_kind=...}` — increments per request
- `sgp_pdf_a_validation_errors_total{...}` — **should be 0** or negligible (only rules seen in W03 baseline)
- `sgp_pdf_a_validation_duration_ms{...}` — < 1500 ms p95

If any metric shows regression, **do not proceed to production**.

### 5. Production Deploy

**Timing**: Deploy in low-traffic window (avoid payroll close). Target: off-business-hours or scheduled maintenance window.

**Cutover**:

1. Merge feature branch to main
2. Build and push container
3. Deploy to production with canary or blue-green if available
4. Verify `/health` endpoint responds

### 6. Watch Window: 4 Hours

Monitor in real time:

| Signal                                         | Action                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `PdfAConformanceError` in logs; error rate > 0 | **STOP** — initiate rollback (see § Rollback)                                                  |
| Success rate drops below 99%                   | **INVESTIGATE** — check error sparkline in Grafana; if trending NEW rule_id, consider rollback |
| Validation latency p95 > 1500 ms               | **INVESTIGATE** — check Docker runner health; may indicate resource contention                 |
| No errors, metrics stable                      | **PROCEED** — move to 24h observe window                                                       |

**24-Hour Follow-Up** (next business day):

- [ ] Review 24h error rate by rule_id
- [ ] Confirm no new failures or patterns
- [ ] File post-deploy metric snapshot in `docs/work/pdf-a-fail-fast-flip-<YYYY-MM-DD>.md`

---

## Rollback

**Trigger**: Any of the following during the 4h watch or 24h follow-up:

- New `PdfAConformanceError` thrown at rate > 0 in production
- Validation success rate drops below 99% for more than 1 hour
- Error trend includes rule_id not seen in W03 baseline

**Procedure**:

1. **Revert configuration**: Flip `failurePolicy` back to `'warn'` in `pdf-a-validator.provider.ts`
2. **Redeploy**: Push container with reverted change; deploy to production
3. **Verify**: Confirm payslip and yearly-income endpoints return 200 OK; check `/metrics` for successful validation attempts
4. **Restart trust period**: Update `docs/ops/pdf-a-trust-period.md` with regression finding and reset monitoring window to day-0

**Post-Rollback**:

- File detailed findings in `docs/work/pdf-a-fail-fast-flip-rollback-<YYYY-MM-DD>.md` (root cause, rule IDs involved, remediation plan)
- Notify #payroll-ops with summary
- Update status page entry (e.g., "Rolled back due to X; investigating...") and re-assign to W08 for remediation

---

## Communications

### Pre-Flip (24 hours before)

**Slack #payroll-ops**:

```
:warning: PDF/A Validation Fail-Fast Policy Flip

We are deploying a stricter validation policy for payslip and yearly-income
PDFs tomorrow at <TIME> in low-traffic window.

— Payslips and yearly-income files are now validated against PDF/A-2b
  strict mode. Non-conforming PDFs will reject the request (fail-fast).
— This change is preceded by 2-week monitoring (W06) with 99.9% success rate.
— Rollback SOP is ready if needed; on-call team has full contact list.

Questions: @slack-handle-of-owner
```

### Post-Flip (immediate)

**Status page**: Create incident entry

```
[2026-MM-DD HH:MM] Deployed PDF/A fail-fast validation policy.
Monitoring in real-time. Will update hourly. ETA stability check: <TIME>.
```

**Internal log**: File `docs/work/pdf-a-fail-fast-flip-<YYYY-MM-DD>.md` with:

- Deployment timestamp
- Metrics snapshot at +30min, +1h, +4h
- Any incidents or warnings observed
- Decision: stable → monitoring, or rollback → file findings

---

## Long-Term (30+ Days Stable)

Once 30 consecutive days pass with:

- Zero `PdfAConformanceError` in production
- Success rate sustained ≥ 99.9%
- No new rule IDs beyond W03 baseline

**Cleanup tasks** (file as W08 or later):

1. Remove warn-only code paths from `TelemetryPdfAValidator` (the `failurePolicy` parameter, the warn-log branch if kept)
2. Simplify `runValidation` in `PdfABuilderService` — drop warn-case logging
3. Close PDF/A row in `docs/gov/audit/diag/round-2-stynx-adoption-gaps.md` permanently with entry:
   ```
   - **PDF/A-2b conformance (CLOSED)**: SGP R11 W07 flipped to fail-fast on
     YYYY-MM-DD. Production stable 30+ days. All upstream STYNX defects resolved.
     Warn-mode code removed in W08.
   ```

---

## Platform Note: Apple Silicon

**Issue**: The upstream `@stynx/pdf-a-vera-docker` runner does not pass `--platform linux/amd64` to Docker. On Apple Silicon (darwin/arm64) without Rosetta 2 emulation, this causes SIGSEGV during Docker invocation.

**Current Status**:

- **CI (Linux/amd64)**: Unaffected. Conformance gate runs cleanly on GitHub Actions.
- **Developer machines (Apple Silicon)**: Test suite `tests/backend/pdf-a-conformance.e2e-spec.ts` auto-skips. See `docs/user/testing.md` § PDF/A Conformance Suite.

**Recommended Before Flip**:

- STYNX team patches `@stynx/pdf-a-vera-docker` to pass `--platform linux/amd64` by default
- OR SGP documents local override: `export STYNX_VERAPDF_DOCKER_ARGS="--platform linux/amd64"` in developer shell initialization

**Impact on Flip**: No impact. Conformance gate (W05) runs only in CI. Production does not use Docker validation (uses in-process STYNX validator). Apple Silicon devs remain on the existing skip.

---

## Cross-References

- **W06 trust-period plan**: `docs/ops/pdf-a-trust-period.md` (exit criteria, weekly checklist, metrics)
- **W04 telemetry & observability**: `docs/ops/observability.md`
- **W03 baseline findings & STYNX gaps**: `docs/work/round-11/pdf-a-baseline-findings.md`, `docs/work/round-11/stynx-r13-gaps.md`
- **STYNX R13 closure audit**: `docs/gov/audit/diag/round-2-stynx-adoption-gaps.md` § "2026-05-25 — R11 / W03 PDF/A baseline run" and "2026-05-25 — R11 / W03 PDF/A baseline run"
- **Build-time conformance gate**: `tests/backend/pdf-a-conformance.e2e-spec.ts`
- **Testing guide (platform notes)**: `docs/user/testing.md` § PDF/A Conformance Suite
