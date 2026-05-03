# TCE State Source-Pending Adapters

**Status:** Implementado como sandbox source-pending | **Wave:** 9

## Scope

The TCE state payroll adapter set registers deterministic adapters for:

`tce-mg`, `tce-rj`, `tce-rs`, `tce-pr`, `tce-ba`, `tce-pe`, `tce-ce`, `tce-df`, `tce-go`, and `tce-sc`.

These adapters implement the `TceAdapter` contract and are discoverable through the TCE registry. They intentionally do not claim official regulatory conformance and do not select a layout version. Each adapter supports internal layout `0.0.1` with `sourceStatus=UNVERIFIED_LAYOUT`.

## Source boundary

Official-source findings on 2026-05-03:

- TCE-MG published 2026 material for SICOM Folha de Pagamento, including a 2026 cartilha announcement and public PDF.
- TCE-RS publishes SIAPC/PAD layout material, including payroll file references such as `TCE_4810.TXT` and `TCE_4820.TXT`.
- TCE-RJ public SIGFIS pages were located, but no verified payroll layout dictionary was selected.
- The other state prompts remained unverified in the round backlog and require owner-selected source URLs before official output is enabled.

## Contract behavior

The source-pending adapter:

- validates only explicit sandbox payloads with `sourceStatus=UNVERIFIED_LAYOUT`;
- serializes deterministic JSON for golden testing;
- returns `PENDING` with protocol prefix `SOURCE-PENDING-*`;
- reports health as `source-pending-sandbox`;
- records `officialConformance=false`.

This keeps the registry, discovery, lifecycle, and CI golden surface green without inventing official layouts.

## Evidence

- Adapter base: `backend/src/tce/adapters/state-payroll/state-payroll-adapter.base.ts`
- State adapters: `backend/src/tce/adapters/tce-mg/` and sibling `tce-*` folders
- Golden fixture: `tests/backend/fixtures/tce/state-payroll/source-pending-goldens.json`
- Unit spec: `backend/src/tce/adapters/state-payroll/state-payroll-adapters.spec.ts`
- Registry e2e: `tests/backend/tce-01-adapter-contract.e2e-spec.ts`

## Production enablement gate

Before any adapter can submit official files:

1. Record the official source URL and layout edition in `tce.layout_version`.
2. Replace `UNVERIFIED_LAYOUT` with the approved layout status.
3. Add field-level layout metadata and parser/serializer goldens from the official dictionary.
4. Add endpoint-specific submission behavior or a tenant-owned connector.
5. Re-run `npm run test:coverage`, `npm run governance:check`, and `DATABASE_URL=... npm run db:smoke`.
