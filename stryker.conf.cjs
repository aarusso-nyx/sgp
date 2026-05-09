/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// Mutation scope is curated per ADR-028 (mutation-scope-rationale).
//
// Two W3 expansion experiments were run and documented in ADR-028:
//   1. Bulk-glob expansion to folha-pagamento/**/*.service.ts +
//      iam/permissions/** measured 34.49 % (many services have no
//      service-importing spec at all).
//   2. Targeted expansion that added folha-mensal.service.ts,
//      reintegration-order.service.ts, and margin-calculator.service.ts —
//      the three services whose specs DIRECTLY import the service so
//      enableFindRelatedTests works — measured 36.02 %. The existing
//      service-importing specs cover only 60–76 % of the file, so even
//      this best-case targeted expansion drops the total below the
//      70 % bar.
//
// Both experiments are reverted. The mutation scope returns to the two
// files whose dedicated specs reliably clear 70 %.
module.exports = {
  packageManager: 'npm',
  testRunner: 'jest',
  reporters: ['clear-text', 'progress'],
  mutate: [
    'backend/src/common/money/money.ts',
    'backend/src/common/errors/standard-exception.filter.ts',
  ],
  jest: {
    projectType: 'custom',
    configFile: 'tests/backend/jest-mutation.json',
    enableFindRelatedTests: true,
  },
  thresholds: {
    high: 80,
    low: 70,
    break: 70,
  },
  concurrency: 2,
  timeoutMS: 20000,
  tempDirName: '.stryker-tmp',
};
