# Prompt 02 - Runtime Services

## Goal

Replace scaffolded runtime entrypoints with implemented runtime services for:

- `sgp-payroll-engine`
- `sgp-esocial-worker`
- `sgp-report-service`


## Read First

- `AGENTS.md`
- `docs/eng/product.md`
- `docs/eng/platform.md`
- `docs/eng/platform.md`
- `docs/eng/platform.md`
- `docs/eng/platform.md`
- `docs/eng/experience.md`
- `docs/eng/domains/payroll-benefits.md`
- `docs/leg/audit/inv/runtime-topology-inventory.json`
- `docs/leg/audit/diag/runtime-and-worker-gap.md`
- `docs/gov/generated/runtime-topology.json`
- `scripts/start-runtime-stub.mjs`

## Work Items

1. Inspect the current runtime topology and package scripts before editing.
2. Replace `scripts/start-runtime-stub.mjs` usage for the three scaffolded runtimes with actual service entrypoints or concrete local executable adapters.
3. Implement `sgp-payroll-engine` as a folia-first runtime boundary:
   - expose health/status and calculation request entrypoints;
   - preserve the SQL formula-engine contract;
   - include deterministic validation for payroll calculation requests;
   - avoid coupling payroll internals directly to unrelated bounded contexts.
4. Implement `sgp-esocial-worker` for eSocial S-1.2 worker behavior:
   - consume pending event messages;
   - validate event payloads;
   - build/send or sandbox-dispatch XML through a real adapter boundary;
   - persist status, receipt, retry, and error metadata.
   - expose a concrete report request contract;
   - support configured template/programmatic generation paths;
   - persist output metadata consistently with S3-only storage decisions.
7. Update runtime docs and topology metadata so health checks report implemented runtime status truthfully.
8. Add focused unit/integration tests around the new runtime entrypoints and failure paths.

## Acceptance Gates

```bash
cd . # repository root
npm run health:json
npm --workspace backend test -- --runInBand
```

Add or adjust more specific runtime tests if the repository already defines them.

The health output must not report `sgp-payroll-engine`, `sgp-esocial-worker`, or `sgp-report-service` as scaffolded.

## Deliverable

