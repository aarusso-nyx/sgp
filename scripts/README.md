# Scripts

`run.mjs` is the workspace command dispatcher.

## Dispatcher Commands

From the repository root:

- `node scripts/run.mjs help`
- `node scripts/run.mjs build`
- `node scripts/run.mjs lint`
- `node scripts/run.mjs format`
- `node scripts/run.mjs test`
- `node scripts/run.mjs db help`
- `node scripts/run.mjs db generate`
- `node scripts/run.mjs db seed`
- `node scripts/run.mjs health`
- `node scripts/run.mjs deploy --target stage --stack all --dry-run`

## npm Entry Points

The root `package.json` delegates orchestration commands to `run.mjs`:

- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run db -- <subcommand>`
- `npm run db:seed`
- `npm run db:smoke`
- `npm run db:alignment:check`
  - Optional machine-readable output: `npm run db:alignment:check -- --json`
- `npm run api:alignment:sync`
- `npm run api:alignment:check`
  - Optional machine-readable output: `npm run api:alignment:check -- --json`
- `npm run health`
- `npm run deploy -- --dry-run`
