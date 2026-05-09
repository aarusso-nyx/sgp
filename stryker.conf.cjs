/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// Mutation scope is curated per ADR-028 (mutation-scope-rationale).
// Expansion adds new logical surfaces deliberately with a reduced break threshold
// that is then ratcheted upward as the spec corpus catches up to the new mutants.
module.exports = {
  packageManager: 'npm',
  testRunner: 'jest',
  reporters: ['clear-text', 'progress'],
  mutate: [
    'backend/src/common/money/money.ts',
    'backend/src/common/errors/standard-exception.filter.ts',
    'backend/src/folha-pagamento/**/*.service.ts',
    '!backend/src/folha-pagamento/**/*.spec.ts',
    '!backend/src/folha-pagamento/**/*.dto.ts',
    'backend/src/iam/permissions/permissions.service.ts',
    'backend/src/iam/permissions/permissions.controller.ts',
    '!backend/src/iam/permissions/permission-catalog.generated.ts',
  ],
  jest: {
    projectType: 'custom',
    configFile: 'tests/backend/jest-mutation.json',
    enableFindRelatedTests: true,
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 60,
  },
  concurrency: 2,
  timeoutMS: 20000,
  tempDirName: '.stryker-tmp',
};
