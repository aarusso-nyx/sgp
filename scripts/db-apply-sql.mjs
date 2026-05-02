#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const cwd = process.cwd();
const databaseUrl = process.env.DATABASE_URL;
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

function runPsqlFile(filePath) {
  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', filePath], {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`psql failed for ${filePath} with exit code ${result.status ?? 1}`);
  }
}

async function main() {
  requireDatabaseUrl();

  const sqlFiles = (await readdir(sqlDir))
    .filter((name) => name.endsWith('.sql'))
    .filter((name) => !optionalSqlFiles.has(name))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    throw new Error('No canonical SQL files found.');
  }

  for (const fileName of sqlFiles) {
    const filePath = resolve(sqlDir, fileName);
    runPsqlFile(filePath);
    console.log(`[db:migrate] applied ${fileName}`);
  }
}

main().catch((error) => {
  console.error(`[db:migrate] ${error.message}`);
  process.exit(1);
});
