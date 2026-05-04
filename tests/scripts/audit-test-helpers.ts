import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export const repoRoot = resolve(__dirname, '../..');
export const fixturesRoot = join(repoRoot, 'tests', 'scripts', 'fixtures');

export async function makeFixture(fixtureName: string): Promise<string> {
  const target = await mkdtemp(join(tmpdir(), `sgp-${fixtureName}-`));
  await cp(join(fixturesRoot, fixtureName), target, { recursive: true });
  return target;
}

export async function cleanupFixture(path: string): Promise<void> {
  await rm(path, { force: true, recursive: true });
}

export async function runAuditCommand(
  subcommand: string,
  fixtureRoot: string,
  args: string[] = [],
): Promise<{ stdout: string; stderr: string }> {
  const scriptPath = join(repoRoot, 'scripts', 'audit.mjs');
  const outputRoot = join(fixtureRoot, 'out');
  return execFile(process.execPath, [
    scriptPath,
    subcommand,
    '--repo-root',
    fixtureRoot,
    '--output-root',
    outputRoot,
    '--round',
    '7',
    ...args,
  ]);
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

export async function readMarkdownHeader(path: string): Promise<string[]> {
  const content = await readFile(path, 'utf8');
  return content.split(/\r?\n/).slice(0, 4);
}
