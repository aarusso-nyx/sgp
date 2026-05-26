# Round 2 STYNX Adoption Residual Gaps

Date: 2026-05-24

Scope executed from `/Users/aarusso/Development/stech/align/sgp/round-2/prompts/00-orchestrator.md`.

## Verified in this pass

- `@stynx/feature-flags` is wired through a SGP `system_parameter` provider and used by `EsocialQueueTransportFlag`.
- `@stynx/integration-adapter` wraps DCTFWeb, EFD-Reinf, SIAFIC, and TCE relay dispatch retry/idempotency/circuit boundaries.
- `@stynx/pdf/evidence` is used for signed PDF verification hints and delegates
  the PAdES evidence block to `@stynx/signature`; fiscal XML signed-hash
  computation now uses the shared digest helper.
- `@stynx/pdf/public-payroll` is now used at the report PDF construction boundary while SGP keeps report-service orchestration, evidence appending, persistence, audit, RBAC/RLS, and golden acceptance.

## Historical gaps from original pass

- Full aggregate CI was not run in this pass: `npm run test`, full `npm run test:e2e`, `npm run test:coverage`, `npm run test:frontend:coverage`, and DB-backed `npm run test:db` remain unverified.
- The eSocial gateway is still delegated to `stynx-esocial`; this pass did not run a full eSocial spool transmission suite.
- At the original round-2 pass, `@stynx/signature` exposed PAdES/TSA/provider
  contracts, not XMLDSig signing. That historical gap is superseded by the
  2026-05-24 STYNX signature re-adoption update below.
- At the original round-2 pass, `@stynx/pdf` did not provide the public-payroll template pack or a PDF/A conformance adapter. The template-pack gap is superseded by the 2026-05-24 STYNX PDF adoption update below; real PDF/A conformance remains deferred.
- `npm install` still reports 6 moderate npm audit findings. No `npm audit fix` was run because that would expand dependency churn beyond this orchestrator scope.

## Gates run

- `npm install`
- `npm run test:backend -- --runInBand src/system-parameters/system-parameters.service.spec.ts src/integrations-worker/dctfweb/dctfweb-transmitter.service.spec.ts src/integrations-worker/efd-reinf/efd-reinf-transmitter.service.spec.ts src/integrations-worker/siafic/siafic-connector.service.spec.ts src/report-service/payslip/pdf-a-builder.service.spec.ts src/report-service/yearly-income/pdf-a-yearly.service.spec.ts`
- `npm run test:e2e -- --runInBand tests/backend/tce-queue-adapter.e2e-spec.ts`
- `npm run typecheck`
- `npm run format:check`
- `npm run lint:check`
- `npm run governance:check`
- `npm run build`
- `npm run test:types`

## 2026-05-24 — R4 Closure

- Full aggregate CI: partially closed by R4 worker 11 evidence capture. The new
  `tests/backend/esocial-spool-transmission.e2e-spec.ts` passed locally; broad
  CI evidence is retained under `.devai/state/test-results/` when generated.
- eSocial spool suite: closed by
  `tests/backend/esocial-spool-transmission.e2e-spec.ts`.
- Signature architecture gap: closed by
  `docs/eng/68-signature-architecture.md`.
- PDF/A builder architecture gap: closed by `docs/eng/67-pdf-a-builder.md`.
- npm audit findings: closed. `npm audit --json` reported zero vulnerabilities
  on 2026-05-24.

## 2026-05-24 — R10 STYNX signature re-adoption check

- `pnpm --filter @stynx/signature build` passed in the sibling STYNX checkout.
- The current public `@stynx/signature` API exposes PAdES/TSA/provider
  contracts and `sha256Hex`, but no public XMLDSig, GovBR sandbox, sequential
  signing, or PDF/A conformance facade was available in this pass.
- SGP therefore kept local XMLDSig signing for DCTFWeb and EFD-Reinf, local
  GovBR sandbox semantics, local recruitment-board sequential signing, and the
  existing byte-stable PDF/A-style builder until those STYNX surfaces were
  accepted upstream.

## 2026-05-24 — STYNX signature re-adoption update

- DCTFWeb XMLDSig was already migrated to `@stynx/signature/xmldsig` in
  `3f7323c4`.
- EFD-Reinf XMLDSig and the shared ICP XML signer now delegate XMLDSig signing
  and verification to `@stynx/signature/xmldsig`.
- GovBR sandbox evidence and queue-envelope verification now use
  `@stynx/signature` canonical GovBR/digest helpers while preserving SGP's API
  response shape.
- Recruitment-board document signing now uses `@stynx/signature`
  `SequentialSigner` envelopes while preserving SGP database writes, audit
  marking, and publication status behavior.
- PDF PAdES evidence blocks now use the STYNX package-owned
  `%%STYNX-PADES-SIGNATURE` envelope.

## 2026-05-24 — STYNX PDF public-payroll adoption update

- The sibling STYNX checkout now exposes `@stynx/pdf/public-payroll` with
  deterministic fixed-layout payslip and yearly-income builders.
- The sibling STYNX checkout now exposes `@stynx/pdf/evidence` with
  `PdfVerificationEvidenceAppender`; SGP deleted its local `PadesAdapter`.
- `backend/src/report-service/payslip/pdf-a-builder.service.ts` is now a thin
  SGP adapter around `PublicPayrollPdfBuilder`, preserving the existing
  `PdfABuilderService` call sites.
- SGP still owns database reads, LGPD legal-basis checks, RBAC/RLS/audit,
  `public.generated_report_file` persistence, storage keys, batch state, and
  payroll/fiscal reconciliation.
- The package remains PDF/A-style structural output. A real validator-backed
  PDF/A conformance adapter is still a deferred upstream capability.

## 2026-05-25 — R11 / W03 PDF/A baseline run

- SGP R11 W01 + W02 wired a real `VeraPdfDockerValidator` into both payslip
  and yearly-income builders (default Noop in CI; Docker-backed in
  environments where Docker is available). See commits `9485689b` and
  `d60c1ccb`.
- W03 ran veraPDF (PDF/A-2b flavour, pinned image
  `verapdf/cli@sha256:20202b4bcc2410a25db1f637c7b461a2e0dda1d97dd8a6df658286b30d56c842`)
  against the byte-stable goldens emitted by both builders. Result: 5
  distinct rule failures per document, IDENTICAL between the two outputs.
- All 5 findings are classified as upstream STYNX defects in `@stynx/pdf`
  `FixedLayoutDocumentBuilder` + `PdfVerificationEvidenceAppender`. No
  SGP-side adapter defect was found. Full baseline + classification:
  `docs/work/round-11/pdf-a-baseline-findings.md`. STYNX R13 gap entries:
  `docs/work/round-11/stynx-r13-gaps.md` (5 entries, ids
  `stynx-r13-pdf-a-001..005`).
- Per the W03 orchestrator instruction ("If you patch STYNX upstream during
  this round STOP and report"), W03 did NOT patch the STYNX packages and
  did NOT mutate any SGP fixture or builder wiring. The runtime
  warn-only policy from W01/W02 remains active. The build-time strict gate
  (W05) and telemetry (W04) consume the same audit shape and will start
  reporting `valid:true` once the STYNX R13 fixes ship. The trust-period
  monitoring plan (W06) is documented at `docs/ops/pdf-a-trust-period.md`.
- 2026-05-25 — STYNX R13 (`cb1916f8` "Engineer: close PDF/A-2b conformance
  gaps") closes all five upstream defects (`stynx-r13-pdf-a-001..005`):
  Liberation font subsetting, XMP `pdfaid:part`/`pdfaid:conformance` block,
  sRGB ICC `OutputIntent`, trailer `/ID` array, and incremental update / no
  bytes-after-EOF. SGP re-packed `@stynx/pdf` and regenerated the two
  byte-stable goldens (`tests/backend/golden/payslip-pdf-a-v01/expected.pdf`
  and `tests/backend/golden/comprovante-anual-v01/expected.pdf`). VeraPDF
  PDF/A-2b on the regenerated bytes now reports `compliant=true`,
  `passedRules=144`, `failedRules=0`, `failedChecks=0` for both documents.
  SGP R11 W04+ resume from this point. Details:
  `docs/work/round-11/r13-handoff.md`.

## 2026-05-26 — R11 PDF/A Row CLOSED

**Status: CLOSED** — Date: 2026-05-26

SGP R11 fully resolves the PDF/A conformance gap identified at original round-2 baseline. The following work chain delivered the closure:

- `9485689b` W01 — wired `VeraPdfDockerValidator` (warn-only) into `PdfABuilderService` for payslip output
- `d60c1ccb` W02 — wired the same validator into yearly-income builder; `buildYearlyIncomeWithAudit()` added
- `a97b5d83` W03 — ran real veraPDF baseline against byte-stable goldens; 5 rule failures (all upstream STYNX, none SGP-side); 5 gap entries filed (`stynx-r13-pdf-a-001..005`)
- `b8302a66` Pre-flight — STYNX R13 (`cb1916f8`) closed all 5 defects (font embedding, XMP pdfaid block, sRGB ICC OutputIntent, trailer /ID, bytes-after-EOF); SGP re-packed `@stynx/pdf` and regenerated goldens; VeraPDF now reports `compliant=true`, 144/144 passedRules for both documents
- `2a81d005` W04 — `TelemetryPdfAValidator` decorator emits 3 Prometheus metrics (`sgp_pdf_a_validation_attempts_total`, `sgp_pdf_a_validation_errors_total`, `sgp_pdf_a_validation_duration_ms`); observability reference: `docs/ops/observability.md`
- `97277726` W05 — build-time strict conformance gate (`tests/backend/pdf-a-conformance.e2e-spec.ts`) asserts `valid===true` for both golden fixtures using real VeraPDF; auto-skips when Docker is unavailable (Apple Silicon / CI noop path)
- `5f97c684` W06 — 14-day trust-period monitoring plan with weekly checklist, exit criteria, and Grafana panel definitions: `docs/ops/pdf-a-trust-period.md`
- `189dd70f` W07 — fail-fast policy flip runbook (prereqs, code change, deployment sequence, rollback, comms): `docs/ops/pdf-a-fail-fast-flip.md`

STYNX upstream closure: `cb1916f8` "Engineer: close PDF/A-2b conformance gaps" (STYNX R13).

**Runtime remains warn-only** per the SGP R11 phased adoption plan. The fail-fast transition is a separate operational decision gated on successful completion of the W06 trust period (minimum 14 days, owner signoff required). The runbook for that transition is docked at `docs/ops/pdf-a-fail-fast-flip.md`.
