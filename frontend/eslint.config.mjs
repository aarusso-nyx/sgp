import { createRequire } from 'node:module';

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { default: tseslint } = await import(backendRequire.resolve('typescript-eslint'));

const generatedOpenApiClientPattern = '**/core/api/generated/**';
const generatedOpenApiClientMessage =
  'Generated OpenAPI clients must be imported only from files under core/api.';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      '.angular/**',
      'src/app/core/api/generated/**',
      'portal/src/app/core/api/generated/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'portal/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [generatedOpenApiClientPattern],
              message: generatedOpenApiClientMessage,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/api/**/*.ts', 'portal/src/app/core/api/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
