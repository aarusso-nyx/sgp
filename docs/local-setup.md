# Local Setup

This guide is for local development from the repository root.

## 1. Prerequisites

- Node.js `>=24 <25`
- npm `>=11.12.1 <12`
- Docker (optional, for local PostgreSQL workflows)
- PostgreSQL (optional if not using Docker)

## 2. Install Dependencies

From the repository root:

```bash
npm install
```

## 3. Configure Environment

Copy `.env.example` to `.env` and fill values for your machine.

```bash
cp .env.example .env
```

Never commit `.env`.

## 4. Run Health Check

```bash
npm run health
```

Use JSON output if needed:

```bash
node scripts/run.mjs health --json
```

## 5. Common Workspace Commands

- Start sgp-admin + sgp-portal + core API + portal API dev servers: `npm run start:dev`
- Start only `sgp-admin`: `npm run start:admin`
- Start only `sgp-portal`: `npm run start:portal`
- Start only the core API: `npm run start:core-api`
- Start only the portal API: `npm run start:portal-api`
- Start only the backend (core API alias): `npm run start:backend`
- Start only the frontend: `npm run start:frontend`
- Start split service/worker runtimes:
  - `npm run start:payroll-engine`
  - `npm run start:esocial-worker`
  - `npm run start:integrations-worker`
  - `npm run start:report-service`
- Build all workspaces: `npm run build`
- Lint all workspaces: `npm run lint`
- Format all workspaces: `npm run format`
- Test all workspaces: `npm run test`
- DB helper commands: `npm run db -- help`
- API alignment sync/check: `npm run api:alignment:sync` / `npm run api:alignment:check`
- Deploy planning (dry-run): `npm run deploy -- --target stage --stack all --dry-run`

## 6. Database Helper Commands

- `npm run db -- generate`
- `npm run db -- migrate`
- `npm run db -- studio`

These commands execute Prisma through the backend workspace.

## 7. Runtime Topology

The documented runtime split is tracked in `runtime/topology.json`. Run:

```bash
npm run runtime:topology
```

to inspect the current deployable/runtime inventory and scaffold status.
