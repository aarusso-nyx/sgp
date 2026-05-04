import { userInfo } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const defaultRepoRoot = resolve(scriptRoot, '..');
export const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function currentUserName() {
  return process.env.USER || process.env.LOGNAME || userInfo().username;
}

export const localTestDatabaseUrl = `postgresql://${currentUserName()}@localhost:5432/sgp_test`;

export function localTestDatabaseEnv(env = process.env) {
  return {
    ...env,
    DATABASE_URL: env.DATABASE_URL || localTestDatabaseUrl,
  };
}

export function repoRootFromCwd(cwd = process.cwd()) {
  return resolve(cwd);
}
