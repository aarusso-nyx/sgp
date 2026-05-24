# Round 2 STYNX Adoption Residual Gaps

Date: 2026-05-24

Scope executed from `/Users/aarusso/Development/stech/align/sgp/round-2/prompts/00-orchestrator.md`.

## Verified in this pass

- `@stynx/feature-flags` is wired through a SGP `system_parameter` provider and used by `EsocialQueueTransportFlag`.
- `@stynx/integration-adapter` wraps DCTFWeb, EFD-Reinf, SIAFIC, and TCE relay dispatch retry/idempotency/circuit boundaries.
- `@stynx/signature` digest and mock PAdES facade are used by signed PDF evidence, and fiscal XML signed-hash computation now uses the shared digest helper.
- `@stynx/pdf` digest helper is used at the report PDF boundary while the existing SGP PDF/A byte-stable builder remains in place.

## Remaining gaps

- Full aggregate CI was not run in this pass: `npm run test`, full `npm run test:e2e`, `npm run test:coverage`, `npm run test:frontend:coverage`, and DB-backed `npm run test:db` remain unverified.
- The eSocial gateway is still delegated to `stynx-esocial`; this pass did not run a full eSocial spool transmission suite.
- `@stynx/signature` currently exposes PAdES/TSA/provider contracts, not XMLDSig signing. SGP therefore retains local XMLDSig signing for DCTFWeb and EFD-Reinf while adopting the shared digest boundary.
- `@stynx/pdf` does not provide a PDF/A conformance adapter in the current local package. SGP therefore retains the existing `pdf-lib` PDF/A-style builder to preserve byte-for-byte golden fixtures.
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
