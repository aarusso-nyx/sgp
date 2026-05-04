import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { repoRoot } from './audit-test-helpers';

describe('docs refs cross-reference', () => {
  it('maps every obligation-level docs/refs file to implementation evidence', async () => {
    const docsRefs = await listReferenceFiles(join(repoRoot, 'docs/refs'));
    const fiscalIntegrations = await readFile(
      join(repoRoot, 'docs/eng/domains/fiscal-integrations.md'),
      'utf8',
    );

    const missing = docsRefs.filter((path) => !fiscalIntegrations.includes(`\`${path}\``));
    expect(missing).toEqual([]);

    for (const path of docsRefs) {
      const row = fiscalIntegrations.split(/\r?\n/).find((line) => line.includes(`\`${path}\``));
      expect(row).toMatch(/(?:backend|database|docs|tests|frontend)\/[^\s|]+:\d+/);
    }
  });
});

async function listReferenceFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name.endsWith('.md') && !path.includes('/law/')) {
        files.push(relative(repoRoot, path).split('/').join('/'));
      }
    }
  }

  await visit(root);
  return files.sort();
}
