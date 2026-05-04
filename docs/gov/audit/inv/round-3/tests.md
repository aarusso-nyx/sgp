# Test Inventory (Round 3)

Narrative wrapper around [`test-coverage-map.json`](./test-coverage-map.json) (4 342 lines) and [`test-coverage-map.md`](./test-coverage-map.md) (597 lines).

## Counts at HEAD `50dc67c`

From [`test-coverage-map.md:7-14`](./test-coverage-map.md):

| Metric                                           |                                      Round-3 |
| ------------------------------------------------ | -------------------------------------------: |
| Detected `*.spec.ts` / `*.e2e-spec.ts`           |               **575** specs (tooling output) |
| `find tests -name '*.spec.ts'`                   |                                          226 |
| Total `find ... -name '*.spec.ts'` repo-wide     |                                          450 |
| Total `find ... -name '*.e2e-spec.ts'` repo-wide |                                          125 |
| Tests `*.{ts,mjs,js}` LOC (excl. node_modules)   |                                       30 730 |
| Functional requisites with mapped tests          | **1 / 1** parsed (parser caveat — see below) |

Round-3 LOC delta vs round-2: **+876 (+2.9 %)**, concentrated in audit-tooling specs (`tests/scripts/audit-*.spec.ts`, +338 LOC), dispatcher surface (`tests/scripts/dispatcher-surface.spec.ts`, 96 LOC), R3-013 403 negatives, R3-014 stub-spec replacement, R3-015 RLS direct specs, and R3-016 missing goldens.

## Test surface by location

| Location                                            |   Specs | Notes                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/backend/`](../../../../../tests/backend/)   | **127** | Jest backend integration + e2e. Golden subtree at [`tests/backend/golden/`](../../../../../tests/backend/golden/) covers payroll-mensal-v01, decimo-terceiro-v01, ferias-folha-v01, rescisao-v01, payslip-pdf-a-v01, comprovante-anual-v01, cnab240, tce, transparency. |
| [`tests/rls/`](../../../../../tests/rls/)           |  **80** | Per-table cross-tenant + self-only RLS specs. R3-015 added direct RLS-assertion specs across more domains.                                                                                                                                                              |
| [`tests/db/`](../../../../../tests/db/)             |      10 | DB-only specs (constraint, trigger, partition).                                                                                                                                                                                                                         |
| [`tests/scripts/`](../../../../../tests/scripts/)   |       8 | NEW in round-3: `audit-api-surface`, `audit-backlog-ledger`, `audit-fr-ledger`, `audit-hotspots`, `audit-promise-vs-delivery`, `audit-schema-digest`, `audit-test-coverage-map`, `dispatcher-surface`. Locks the audit toolchain itself.                                |
| [`tests/e2e/`](../../../../../tests/e2e/)           |       5 | Playwright admin specs (avaliacao×3, folha×1, rh×1).                                                                                                                                                                                                                    |
| [`tests/frontend/`](../../../../../tests/frontend/) |       2 | Admin + portal Vitest harness anchors.                                                                                                                                                                                                                                  |
| [`tests/audit/`](../../../../../tests/audit/)       |       1 | Cross-cutting audit invariant.                                                                                                                                                                                                                                          |
| `backend/src/**/*.spec.ts` (in-tree)                |    ~330 | Bulk of unit/integration coverage co-located with services.                                                                                                                                                                                                             |

## Per-domain coverage (sample from `test-coverage-map.md`)

The tooling currently emits a flat list of all 575 specs because the FR ledger has only one parsed entry (FR-001, the parser-misfire stub). Per-domain coverage is therefore best read from the round-2 narrative [`docs/work/round-2/04-test-coverage.md`](../../../../work/round-2/04-test-coverage.md) plus the round-3 deltas:

| Domain                  | Round-2 status                                       | Round-3 delta                                                                                          |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Payroll (FOL-\*)        | Goldens for monthly, 13º, rescisão, férias all green | R3-014 stub replacement deepens unit specs; R3-010 idempotency helper covered                          |
| eSocial (S-1xxx/S-2xxx) | XSD + dispatch + retry covered                       | unchanged in round-3 (R3-042 deferred)                                                                 |
| TCE                     | Per-state stub goldens                               | R3-016 added comprovante + transparency goldens; R3-043/044 deferred                                   |
| LGPD                    | ROPA, RCIS, DPO unit specs (round-2)                 | R3-030 DSAR procedural deepening, R3-031 public-power slice, R3-032 PII encryption batch               |
| RLS (cross-tenant)      | 70+ specs                                            | **+~10** specs (R3-015 direct RLS)                                                                     |
| API contracts           | OpenAPI 3.1 mandate (R2-230)                         | R3-003 typed responses + 4xx contracts; new spec coverage in `tests/scripts/audit-api-surface.spec.ts` |
| Audit-tooling           | none (tooling did not exist)                         | **NEW: 8 specs** locking the audit pipeline                                                            |

## Goldens inventory

Located at [`tests/backend/golden/`](../../../../../tests/backend/golden/):

| Subdir                   | Domain                  | Source          |
| ------------------------ | ----------------------- | --------------- |
| `payroll-mensal-v01/`    | Monthly payroll         | R2-50           |
| `decimo-terceiro-v01/`   | 13th salary             | R2-50           |
| `ferias-folha-v01/`      | Vacations + payroll     | R2-50           |
| `rescisao-v01/`          | Termination             | R2-50           |
| `payslip-pdf-a-v01/`     | Payslip PDF/A           | R2-92           |
| `comprovante-anual-v01/` | Annual income statement | R3-016          |
| `cnab240/`               | Banking remittance      | R2-87 (5 banks) |
| `tce/`                   | TCE adapter outputs     | R3-016          |
| `transparency/`          | Portal de Transparência | R3-016          |

## Caveats

- The FR ledger parsing in [`scripts/lib/audit/fr-ledger.mjs`](../../../../../scripts/lib/audit/fr-ledger.mjs) reads `docs/gov/evidence/implementation-status.md` for "current scope" bullets. The current copy is too narrative to parse, so the FR ledger contains only `FR-001` (a stub). This is a tooling gap, not a coverage gap. See [`fr-delta.md`](../../diag/round-3/fr-delta.md) and the gaps register at [`gaps.md`](../../diag/round-3/gaps.md).
- Because of the FR-ledger stub, the test-coverage map cannot map specs to FR-IDs at this round. Domain-level coverage continues to be tracked through the round-2 deep map and via the goldens inventory above.

## Gates referenced in NFR ledger

From [`docs/gov/audit/non-functional-requisites.md`](../../non-functional-requisites.md):

| Gate                      | Script                                                                         | Round-3 status            |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| Backend unit/integration  | `npm run test:backend -- --runInBand`                                          | green (per closure waves) |
| Backend coverage          | `npm run test:coverage -- --runInBand`                                         | green                     |
| Frontend coverage         | `npm run test:frontend:coverage`                                               | NFR-010 `DONE`            |
| Frontend e2e (Playwright) | `npm run test:frontend:e2e`                                                    | NFR-011 `DONE`            |
| RLS specs                 | `npm run test:db`                                                              | green; R3-015 expanded    |
| Audit-coverage e2e        | `npm run test:backend -- tests/backend/audit-coverage.e2e-spec.ts --runInBand` | NFR-002 `DONE`            |
