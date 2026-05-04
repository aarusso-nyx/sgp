import { userInfo } from 'node:os';

function currentUserName() {
  return process.env.USER || process.env.LOGNAME || userInfo().username;
}

export const localTestDatabaseUrl = `postgresql://${currentUserName()}@localhost:5432/sgp_test`;

export const workspaceCommandDescriptions = {
  help: 'Show workspace orchestration help.',
  build: 'Build sgp-admin, sgp-portal, and the Nest API runtime.',
  start: 'Start sgp-admin, sgp-portal, sgp-core-api, and sgp-portal-api.',
  lint: 'Run fix-mode lint across frontend and backend workspaces.',
  format: 'Format workspace files and code.',
  typecheck: 'Run TypeScript checks across frontend and backend workspaces.',
  test: 'Run workspace tests; unit tests are the default subcommand.',
  db: 'Run database helper commands (generate, migrate, seed, studio).',
  qa: 'Run QA helper commands.',
  audit: 'Run deterministic audit helper commands.',
  evidence: 'Run the authoritative evidence gate sequence.',
  governance: 'Run governance validation.',
  health: 'Run non-destructive runtime topology and workspace health checks.',
  deploy: 'Run AWS deployment plan checks (dry-run by default).',
};

export const workspaceFormatTargets = [
  '../docs/README.md',
  '../docs/eng',
  '../docs/gov',
  '../docs/user',
  '../docs/leg/README.md',
  '../docs/leg/audit/plan/README.md',
  '../docs/leg/rev-eng/README.md',
  '../docs/leg/rev-eng/legacy-assumptions.md',
  '../tests/audit',
  '../tests/backend',
  '../tests/e2e',
  '../tests/frontend',
  '../tests/lib',
  '../tests/scripts',
  '../scripts',
  '../infra',
  '../package.json',
  '../.gitignore',
  '../.editorconfig',
  '../.prettierrc.json',
  '../eslint.config.mjs',
  '../tsconfig.json',
];

export const hardFailGateCommands = [
  'npm run lint:check',
  'npm run format:check',
  'npm run typecheck',
  'npm run api:alignment:check -- --json',
  'npm run db:alignment:check -- --json',
  'npm run health:json',
  'npm run governance:check',
];

export const evidenceSteps = [
  {
    name: 'api-alignment-sync',
    command: 'npm',
    args: ['run', 'api:alignment:sync'],
  },
  {
    name: 'api-alignment-check',
    command: 'npm',
    args: ['run', 'api:alignment:check', '--', '--json'],
  },
  {
    name: 'db-alignment-check',
    command: 'npm',
    args: ['run', 'db:alignment:check', '--', '--json'],
  },
  {
    name: 'runtime-health',
    command: 'npm',
    args: ['run', 'health:json'],
  },
  {
    name: 'lint-check',
    command: 'npm',
    args: ['run', 'lint:check'],
  },
  {
    name: 'format-check',
    command: 'npm',
    args: ['run', 'format:check'],
  },
  {
    name: 'typecheck',
    command: 'npm',
    args: ['run', 'typecheck'],
  },
  {
    name: 'openapi-client-generate',
    command: 'npm',
    args: ['run', 'api:client:generate'],
  },
  {
    name: 'build-all',
    command: 'npm',
    args: ['run', 'build'],
  },
  {
    name: 'unit-tests',
    command: 'npm',
    args: ['run', 'test'],
  },
  {
    name: 'backend-e2e',
    command: 'npm',
    args: ['run', 'test:e2e'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'frontend-e2e',
    command: 'npm',
    args: ['run', 'test:frontend:e2e'],
  },
  {
    name: 'db-smoke',
    command: 'npm',
    args: ['run', 'test:db'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'backend-coverage',
    command: 'npm',
    args: ['run', 'test:coverage'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'frontend-coverage',
    command: 'npm',
    args: ['run', 'test:frontend:coverage'],
  },
  {
    name: 'governance-check',
    command: 'npm',
    args: ['run', 'governance:check'],
  },
  {
    name: 'qa-smoke-url-config',
    command: 'node',
    args: ['scripts/qa-smoke-required-urls.mjs', '--check'],
    capturesOutput: true,
  },
  {
    name: 'qa-smoke-live',
    command: 'npm',
    args: ['run', 'test:qa'],
    capturesOutput: true,
    blockedPattern: /\[qa-smoke]\s+BLOCKED/,
  },
];
