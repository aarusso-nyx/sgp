/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
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
