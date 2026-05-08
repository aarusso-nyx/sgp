// @ts-check
import { createRequire } from 'node:module';
import noMathRoundMoneyRule from './backend/eslint-rules/no-math-round-money.js';
import noHardcodedDateInSpecRule from './backend/eslint-rules/no-hardcoded-date-in-spec.js';
import noPontoDateToIsoRule from './backend/eslint-rules/no-ponto-date-to-iso.js';
import noRawHandlerLoggingRule from './backend/eslint-rules/no-raw-handler-logging.js';
import requirePermissionRule from './backend/eslint-rules/require-permission.js';

const backendRequire = createRequire(new URL('./backend/package.json', import.meta.url));
const { default: eslint } = await import(backendRequire.resolve('@eslint/js'));
const { default: eslintPluginPrettierRecommended } = await import(
  backendRequire.resolve('eslint-plugin-prettier/recommended')
);
const { default: globals } = await import(backendRequire.resolve('globals'));
const { default: tseslint } = await import(backendRequire.resolve('typescript-eslint'));

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'backend/dist/**', 'backend/generated/**', 'frontend/dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      sgp: {
        rules: {
          'no-math-round-money': noMathRoundMoneyRule,
          'no-hardcoded-date-in-spec': noHardcodedDateInSpecRule,
          'no-ponto-date-to-iso': noPontoDateToIsoRule,
          'no-raw-handler-logging': noRawHandlerLoggingRule,
          'require-permission': requirePermissionRule,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'sgp/no-math-round-money': 'error',
      'sgp/no-hardcoded-date-in-spec': 'error',
      'sgp/no-ponto-date-to-iso': 'error',
      'sgp/no-raw-handler-logging': 'error',
      'sgp/require-permission': 'error',
    },
  },
  {
    files: ['backend/src/**/*.spec.ts', 'tests/backend/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['tests/backend/**/*.ts'],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
