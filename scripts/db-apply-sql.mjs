#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const cwd = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const databaseUrl = process.env.DATABASE_URL;
const backendDir = resolve(cwd, 'backend');
const prismaMigrationsDir = resolve(backendDir, 'prisma/migrations');
const sqlDir = resolve(cwd, 'database/sql');
const optionalSqlFiles = new Set(['40-seed-loader.sql']);

class ConfigurationBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationBlockedError';
  }
}

function requireDatabaseUrl() {
  if (!databaseUrl) {
    throw new ConfigurationBlockedError(
      'DATABASE_URL is not set; canonical SQL bootstrap cannot run.',
    );
  }
}

function quotePsqlPath(filePath) {
  return `'${filePath.replaceAll("'", "''")}'`;
}

function runPrismaMigrateDeploy() {
  if (!existsSync(prismaMigrationsDir)) {
    console.log(
      '[db:migrate] no Prisma migrations directory found; skipping prisma migrate deploy',
    );
    return;
  }

  console.log('[db:migrate] applying Prisma migrations');
  const result = spawnSync(npm, ['exec', '--', 'prisma', 'migrate', 'deploy'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed with exit code ${result.status ?? 1}`);
  }
}

function runPsqlFiles(fileNames) {
  const script = fileNames
    .map((fileName) => {
      const filePath = resolve(sqlDir, fileName);
      return [
        `\\echo [db:migrate] applying ${fileName}`,
        `\\i ${quotePsqlPath(filePath)}`,
        `\\echo [db:migrate] applied ${fileName}`,
      ].join('\n');
    })
    .join('\n');

  const transactionalScript = ['\\set ON_ERROR_STOP on', 'BEGIN;', script, 'COMMIT;'].join('\n');

  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1'], {
    cwd,
    input: transactionalScript,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: process.env,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`psql failed with exit code ${result.status ?? 1}`);
  }
}

async function main() {
  requireDatabaseUrl();
  runPrismaMigrateDeploy();

  const sqlFiles = (await readdir(sqlDir))
    .filter((name) => name.endsWith('.sql'))
    .filter((name) => !optionalSqlFiles.has(name))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    throw new Error('No canonical SQL files found.');
  }

  runPsqlFiles(sqlFiles);
}

main().catch((error) => {
  console.error(`[db:migrate] ${error.message}`);
  process.exit(1);
});
