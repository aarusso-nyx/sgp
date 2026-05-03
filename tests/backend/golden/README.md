# Backend Golden Fixtures

These fixtures pin deterministic regulatory and payroll output. Keep sample
identifiers fictitious, avoid secrets, and change expected files only when the
output contract intentionally changes.

## R3-016 Official Output Goldens

- `tce/state-payroll-v01/`: source-pending TCE-MG payroll adapter JSON. It
  intentionally keeps `sourceStatus=UNVERIFIED_LAYOUT` and
  `officialConformance=false`; do not promote it to an official regulatory
  layout without an owner-approved source.
- `transparency/public-payroll-v01/`: public payroll transparency JSON and CSV
  surface, including minimized fields only.
- `comprovante-anual-v01/`: annual income statement aggregate input and PDF/A
  expected output.

Regenerate these only for intentional contract changes:

```bash
SGP_UPDATE_R3_016_GOLDENS=1 npm --workspace backend exec jest -- \
  --config ../tests/backend/jest-unit.json \
  --runTestsByPath src/report-service/yearly-income/pdf-a-yearly.service.spec.ts

SGP_UPDATE_R3_016_GOLDENS=1 npm --workspace backend exec jest -- \
  --config ../tests/backend/jest-e2e.json \
  --runTestsByPath ../tests/backend/tce-golden.e2e-spec.ts ../tests/backend/transparency-public.e2e-spec.ts
```

Then rerun the same commands without `SGP_UPDATE_R3_016_GOLDENS=1` and include
the fixture diff in review.
