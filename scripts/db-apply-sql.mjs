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

function quotePsqlPath(filePath) {
  return `'${filePath.replaceAll("'", "''")}'`;
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

  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1'], {
    cwd,
    input: script,
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
