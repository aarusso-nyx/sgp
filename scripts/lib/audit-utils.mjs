import { execFile } from 'node:child_process';
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const ignoredPathParts = new Set(['.git', 'node_modules', 'dist', 'coverage', '.angular']);
const generatedFormatExtensions = new Set(['.json', '.md']);
const localRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      options._.push(value);
      continue;
    }

    const [rawName, inlineValue] = value.slice(2).split('=', 2);
    const booleanFlags = new Set(['help', 'dry-run', 'prev-round', 'json']);
    if (booleanFlags.has(rawName)) {
      options[rawName] = inlineValue === undefined ? true : inlineValue !== 'false';
      continue;
    }

    if (inlineValue !== undefined) {
      options[rawName] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[rawName] = next;
      index += 1;
    } else {
      options[rawName] = true;
    }
  }
  return options;
}

export async function createContext(argv, usage) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage.trim());
    process.exit(0);
  }

  const repoRoot = resolve(String(options['repo-root'] ?? process.cwd()));
  const round = String(options.round ?? (await detectRound(repoRoot)));
  const auditRoot = resolve(repoRoot, String(options['output-root'] ?? 'docs/gov/audit'));
  return {
    auditRoot,
    dryRun: Boolean(options['dry-run']),
    options,
    repoRoot,
    round,
  };
}

export async function detectRound(repoRoot) {
  const workRoot = join(repoRoot, 'docs', 'work');
  try {
    const entries = await readdir(workRoot, { withFileTypes: true });
    const rounds = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => /^round-(\d+)$/.exec(entry.name)?.[1])
      .filter(Boolean)
      .map(Number);
    return rounds.length > 0 ? Math.max(...rounds) : 0;
  } catch {
    return 0;
  }
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readText(path, fallback = '') {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return fallback;
  }
}

export async function writeText(
  path,
  content,
  { dryRun = false, format = true, repoRoot = localRepoRoot } = {},
) {
  const lfContent = content.replace(/\r\n/g, '\n');
  const normalized = lfContent.endsWith('\n') ? lfContent : `${lfContent}\n`;
  if (dryRun) {
    console.log(`[dry-run] would write ${path}`);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, normalized, 'utf8');
  if (format) {
    await formatGeneratedFile(path, repoRoot);
  }
}

export async function writeJson(path, value, options = {}) {
  await writeText(path, `${stableJson(value)}\n`, options);
}

async function formatGeneratedFile(path, repoRoot) {
  if (!generatedFormatExtensions.has(extname(path))) return;

  const prettierPath = await resolvePrettierPath(repoRoot);
  if (!prettierPath) return;

  await execFileAsync(prettierPath, ['--write', '--ignore-unknown', path], {
    cwd: repoRoot,
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function resolvePrettierPath(repoRoot) {
  const binaryName = process.platform === 'win32' ? 'prettier.cmd' : 'prettier';
  const candidates = [
    join(repoRoot, 'backend', 'node_modules', '.bin', binaryName),
    join(repoRoot, 'node_modules', '.bin', binaryName),
    join(localRepoRoot, 'backend', 'node_modules', '.bin', binaryName),
    join(localRepoRoot, 'node_modules', '.bin', binaryName),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

export function stableJson(value) {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson(value[key])]),
  );
}

export async function listFiles(root, predicates = {}) {
  const files = [];
  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignoredPathParts.has(entry.name)) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (!predicates.ext || predicates.ext.some((ext) => entry.name.endsWith(ext))) {
        files.push(path);
      }
    }
  }
  await visit(root);
  return files.sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

export function normalizePath(path) {
  return path.split(sep).join('/');
}

export function repoRelative(repoRoot, path) {
  return normalizePath(relative(repoRoot, path));
}

export function markdownTable(headers, rows) {
  const escapeCell = (value) =>
    String(value ?? '')
      .replace(/\r?\n/g, '<br>')
      .replace(/\|/g, '\\|');
  const header = `| ${headers.map(escapeCell).join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`);
  return [header, separator, ...body].join('\n');
}

export function slug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isMarkdownSeparator(lines[index + 1])) {
      continue;
    }
    const headers = splitMarkdownRow(lines[index]);
    const rows = [];
    index += 2;
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const cells = splitMarkdownRow(lines[index]);
      rows.push(
        Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ''])),
      );
      index += 1;
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function isMarkdownSeparator(line) {
  if (!line.trim().startsWith('|')) return false;
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

export function firstTableRows(markdown) {
  return parseMarkdownTables(markdown)[0]?.rows ?? [];
}

export async function runNodeScript(repoRoot, scriptPath, args = []) {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      ok: false,
      status: typeof error.code === 'number' ? error.code : 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message,
    };
  }
}

export async function runGit(repoRoot, args) {
  try {
    const result = await execFileAsync('git', args, {
      cwd: repoRoot,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { ok: false, stdout: error.stdout ?? '', stderr: error.stderr ?? error.message };
  }
}

export function ownerModule(file) {
  const normalized = normalizePath(file);
  if (normalized.startsWith('backend/src/')) return normalized.split('/').slice(0, 3).join('/');
  if (normalized.startsWith('frontend/portal/')) return 'frontend/portal';
  if (normalized.startsWith('frontend/src/')) return 'frontend/admin';
  if (normalized.startsWith('database/sql/')) return 'database/sql';
  if (normalized.startsWith('docs/')) return normalized.split('/').slice(0, 3).join('/');
  if (normalized.startsWith('tests/')) return normalized.split('/').slice(0, 2).join('/');
  return normalized.split('/')[0] || '.';
}

export async function lineCount(path) {
  const content = await readText(path, '');
  return content.length === 0 ? 0 : content.split(/\r?\n/).length;
}

export async function copyFixtureToTemp(source, target) {
  await rm(target, { force: true, recursive: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}

export async function copyIfExists(source, target) {
  if (await exists(source)) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

export async function fileStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

export function stripMarkdown(value) {
  return String(value ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}
