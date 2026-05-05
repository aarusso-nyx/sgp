import { defineConfig } from 'vitest/config';

const featureThreshold = {
  statements: 60,
  branches: 60,
  functions: 60,
  lines: 60,
};

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        'portal/src/app/pages/contracheque/**/*.ts': featureThreshold,
        'portal/src/app/core/portal/portal-{feature-catalog,route-endpoints}.ts': featureThreshold,
      },
    },
  },
});
