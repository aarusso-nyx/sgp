Gate failed: `DATABASE_URL=postgresql://aarusso@localhost:5432/pecam npm run test`

Diagnostic output:

```text
FAIL src/tce/adapters/audesp-sp/audesp-sp.adapter.spec.ts
  ● AudespSpAdapter › fails safe when production mode is requested

    ServiceUnavailableException: AUDESP/SP production submission is disabled. Configure an installation-specific production adapter before setting TCE_STUB_MODE=false.

      93 |   submit(envelope: SerializedEnvelope): Promise<SubmissionReceipt> {
      94 |     if (!this.stubMode()) {
    > 95 |       throw new ServiceUnavailableException(
         |             ^
      96 |         'AUDESP/SP production submission is disabled. Configure an installation-specific production adapter before setting TCE_STUB_MODE=false.',
      97 |       );
      98 |     }

      at AudespSpAdapter.submit (tce/adapters/audesp-sp/audesp-sp.adapter.ts:95:13)
      at Object.<anonymous> (tce/adapters/audesp-sp/audesp-sp.adapter.spec.ts:22:26)

Summary of all failing tests
FAIL tce/adapters/audesp-sp/audesp-sp.adapter.spec.ts
  ● AudespSpAdapter › fails safe when production mode is requested

    ServiceUnavailableException: AUDESP/SP production submission is disabled. Configure an installation-specific production adapter before setting TCE_STUB_MODE=false.

Test Suites: 1 failed, 157 passed, 158 total
Tests:       1 failed, 432 passed, 433 total
Snapshots:   2 passed, 2 total
```
