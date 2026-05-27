#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(__dirname, '..');
const REPO_DOCS = resolve(SITE_ROOT, '..');
const SITE_DOCS = join(SITE_ROOT, 'docs');

const EXPOSED = ['eng', 'gov', 'user', 'leg', 'ops', 'refs'];

const EXCLUDED_DIR_NAMES = new Set(['site', 'work', 'node_modules', 'build', '.docusaurus']);

const EXCLUDED_PATH_PARTS = new Set(['generated', 'observability', 'privacy']);

function shouldSkipDirectory(path) {
  const base = path.split('/').pop();
  if (base !== undefined && EXCLUDED_DIR_NAMES.has(base)) return true;
  const rel = relative(REPO_DOCS, path);
  return rel.split('/').some((part) => EXCLUDED_PATH_PARTS.has(part));
}

async function copyMarkdownTree(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(srcPath)) continue;
      await copyMarkdownTree(srcPath, dstPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const target = entry.name === 'README.md' ? join(dst, 'index.md') : dstPath;
    const route = relative(SITE_DOCS, target).replace(/\.md$/, '');
    await fs.writeFile(
      target,
      await withDocusaurusMetadata(srcPath, makeId(route), makeSlug(route)),
    );
  }
}

function makeId(route) {
  return route.replace(/\//g, '--');
}

function makeSlug(route) {
  if (route === 'index') return '/';
  if (route.endsWith('/index')) return `/${route.slice(0, -'/index'.length)}`;
  return `/${route}`;
}

async function withDocusaurusMetadata(srcPath, id, slug) {
  const content = await fs.readFile(srcPath, 'utf8');
  if (!content.startsWith('---\n')) {
    return `---\nid: ${id}\nslug: ${slug}\n---\n\n${content}`;
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return `---\nid: ${id}\nslug: ${slug}\n---\n\n${content}`;

  const frontmatter = content.slice(4, end);
  const lines = [];
  if (!/^id:\s*/m.test(frontmatter)) lines.push(`id: ${id}`);
  if (!/^slug:\s*/m.test(frontmatter)) lines.push(`slug: ${slug}`);
  if (lines.length === 0) return content;

  return `---\n${lines.join('\n')}\n${frontmatter}\n---\n${content.slice(end + 5)}`;
}

async function main() {
  await fs.rm(SITE_DOCS, { recursive: true, force: true });
  await fs.mkdir(SITE_DOCS, { recursive: true });
  await fs.copyFile(join(REPO_DOCS, 'README.md'), join(SITE_DOCS, 'index.md'));

  for (const name of EXPOSED) {
    const src = join(REPO_DOCS, name);
    const dst = join(SITE_DOCS, name);
    try {
      const stat = await fs.stat(src);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    await copyMarkdownTree(src, dst);
    console.log(`synced: ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
