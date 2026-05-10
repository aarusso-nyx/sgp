#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const adrDir = join(root, 'docs', 'eng', 'decisions');
const requiredFields = ['controllers', 'migrations', 'infra', 'runbooks'];
const adrPattern = /^adr-\d{3}-.+\.md$/;

const failures = [];

for (const entry of readdirSync(adrDir)
  .filter((name) => adrPattern.test(name))
  .sort()) {
  const path = join(adrDir, entry);
  const content = readFileSync(path, 'utf8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) {
    failures.push(`${entry}: missing YAML frontmatter`);
    continue;
  }

  for (const field of requiredFields) {
    if (!frontmatter.has(field)) {
      failures.push(`${entry}: missing frontmatter field ${field}`);
      continue;
    }
    const paths = frontmatter.get(field) ?? [];
    for (const linkedPath of paths) {
      if (!existsSync(join(root, linkedPath))) {
        failures.push(`${entry}: ${field} path does not exist: ${linkedPath}`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[adr-link] ${failure}`);
  }
  process.exit(1);
}

console.log('[adr-link] ADR machine links are present and point to existing files.');

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;

  const lines = content.slice(4, end).split('\n');
  const fields = new Map();
  let currentField = null;

  for (const line of lines) {
    const fieldMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (fieldMatch) {
      currentField = fieldMatch[1];
      const value = fieldMatch[2].trim();
      if (value === '[]') {
        fields.set(currentField, []);
      } else if (value.length > 0) {
        fields.set(
          currentField,
          value
            .replace(/^\[/, '')
            .replace(/\]$/, '')
            .split(',')
            .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean),
        );
      } else {
        fields.set(currentField, []);
      }
      continue;
    }

    const itemMatch = line.match(/^\s*-\s+(.+)$/);
    if (itemMatch && currentField) {
      const values = fields.get(currentField) ?? [];
      values.push(itemMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      fields.set(currentField, values);
    }
  }

  return fields;
}
