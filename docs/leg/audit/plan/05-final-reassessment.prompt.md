# Prompt 05 - Final Reassessment

## Goal

Refresh the audit package after prompts 01-04 and classify the final state against the current SGP specs.

## Read First

- `AGENTS.md`
- `docs/leg/audit/plan/README.md`
- `docs/leg/audit/plan/01-db-full-closure.prompt.md`
- `docs/leg/audit/plan/02-runtime-services.prompt.md`
- `docs/leg/audit/plan/03-portal-and-contract-cleanup.prompt.md`
- `docs/leg/audit/plan/04-test-gates-and-coverage.prompt.md`
- `docs/leg/audit/plan/future-arrecadacao.prompt.md`
- `docs/leg/audit/inv/`
- `docs/leg/audit/diag/`
- `docs/eng/`
- `scripts`

## Work Items

1. Re-run the audit inventory and diagnostic generation scripts from the live repo. Do not edit old snapshots by hand if generator scripts exist.
2. Refresh `docs/leg/audit/inv/` and `docs/leg/audit/diag/` from current command output.
3. Re-run the same gates captured in `docs/leg/audit/inv/verification-inventory.json`, plus any new gates added during prompts 01-04.
4. Confirm the next-sprint prompt sequence is:
   - `01-db-full-closure.prompt.md`
   - `02-runtime-services.prompt.md`
   - `03-portal-and-contract-cleanup.prompt.md`
   - `04-test-gates-and-coverage.prompt.md`
   - `05-final-reassessment.prompt.md`
5. Produce a final diagnostic summary with two sections:
   - closed gaps;
   - accepted future-version Arrecadacao scope;
   - still-open current-scope blockers.

## Verification Commands

Use live repository scripts where available. At minimum, rerun:

```bash
cd . # repository root
node scripts/check-api-route-alignment.mjs --json
node scripts/check-db-alignment.mjs --json
npm run health:json
npm --workspace frontend run build:portal
npm run test:portal
npm --workspace backend run test:e2e -- --runInBand
npm run db:smoke
npm --workspace backend run test:cov -- --runInBand
```

If an environment-dependent command cannot run, capture the exact missing configuration and classify it as blocked or skipped evidence, not green evidence.

## Deliverable

Refreshed audit inventories, refreshed diagnostics, and a final reassessment that distinguishes closed work from still-open blockers.
