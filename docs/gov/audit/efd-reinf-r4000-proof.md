# EFD-Reinf R-4000 Proof

Round: 11
FR: FR-FI-26241D
Status: DONE

## Accepted SGP Boundary

The SGP-owned EFD-Reinf R-4000 minimum path is implemented in sandbox/contract
mode for R-4010, R-4020, R-4040, R-4080, and R-4099. The worker builds
deterministic XML, persists tenant-scoped event and item rows, signs/transmits
through the existing sandbox-capable Reinf services, records accepted R-4099
receipts as R-9015 totalizers, and exposes those R-9015 totalizers to the
existing DCTFWeb totalizer query.

External RFB homologation, production certificate storage, and any official
layout choice beyond `docs/refs/esocial/efd-reinf.md` remain outside this proof.
The XML namespace intentionally remains the SGP contract namespace until an
owner pins the official production layout.

## Runtime Evidence

| Behavior                               | Evidence                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| R-4000 item generation and persistence | backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.ts line 186 |
| R-4099 closes accepted R-4000 items    | backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.ts line 313 |
| R-9015 totalizer retention payload     | backend/src/integrations-worker/efd-reinf/efd-reinf-receipt.service.ts line 69  |
| DCTFWeb totalizer handoff query        | backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts line 319     |
| RLS/RBAC data surface                  | database/sql/10-04-fiscal-ddl.sql and docs/gov/audit/schema-digest.md line 29   |

## Test Evidence

| Behavior                                                    | Evidence                                                                                                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-4010/R-4020/R-4040/R-4080/R-4099 deterministic golden XML | backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.spec.ts line 22                                                                                                                                   |
| R-4099 accepted receipt writes R-9015 payload for DCTFWeb   | tests/backend/efd-reinf-r4000-fluxo.e2e-spec.ts line 71                                                                                                                                                               |
| Golden fixtures                                             | tests/fixtures/efd-reinf/r4010.golden.xml, tests/fixtures/efd-reinf/r4020.golden.xml, tests/fixtures/efd-reinf/r4040.golden.xml, tests/fixtures/efd-reinf/r4080.golden.xml, tests/fixtures/efd-reinf/r4099.golden.xml |

## Commands

- `npm -w backend run test -- --runInBand backend/src/integrations-worker/efd-reinf/efd-reinf-builder.service.spec.ts`
- `npm run test:e2e -- --runInBand tests/backend/efd-reinf-r4000-fluxo.e2e-spec.ts`
- `npm run test:backend -- --runInBand`
- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run governance:check`
