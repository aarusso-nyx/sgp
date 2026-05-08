import { createRequire } from 'node:module';

import { defineConfig } from 'vitest/config';

const nodeRequire = createRequire(import.meta.url);
const angularPeerAliases = [
  '@angular/common/locales/global/pt',
  '@angular/common/http/testing',
  '@angular/core/rxjs-interop',
  '@angular/platform-browser/testing',
  '@angular/material/progress-spinner',
  '@angular/material/form-field',
  '@angular/core/testing',
  '@angular/common/http',
  '@angular/material/checkbox',
  '@angular/material/expansion',
  '@angular/material/sidenav',
  '@angular/material/toolbar',
  '@angular/material/tooltip',
  '@angular/cdk/layout',
  '@angular/localize/init',
  '@angular/material/button',
  '@angular/material/select',
  '@angular/material/table',
  '@angular/material/card',
  '@angular/material/icon',
  '@angular/material/input',
  '@angular/material/list',
  '@angular/platform-browser',
  '@angular/common',
  '@angular/core',
  '@angular/forms',
  '@angular/localize',
  '@angular/material',
  '@angular/router',
].map((specifier) => ({
  find: specifier,
  replacement: nodeRequire.resolve(specifier, {
    paths: [import.meta.dirname],
  }),
}));

const featureThreshold = {
  statements: 90,
  branches: 90,
  functions: 90,
  lines: 90,
};

export default defineConfig({
  resolve: {
    alias: angularPeerAliases,
    dedupe: [
      '@angular/cdk',
      '@angular/common',
      '@angular/core',
      '@angular/forms',
      '@angular/material',
      '@angular/platform-browser',
      '@angular/router',
      'angular-auth-oidc-client',
      'rxjs',
      'tslib',
    ],
  },
  test: {
    server: {
      deps: {
        inline: [/^@stynx-web\//, 'angular-auth-oidc-client'],
      },
    },
    coverage: {
      thresholds: {
        'portal/src/app/pages/contracheque/**/*.ts': featureThreshold,
        'portal/src/app/core/portal/portal-{feature-catalog,route-endpoints}.ts': featureThreshold,
      },
    },
  },
});
