#!/usr/bin/env node

// Repair script for throws-to-domain-error.mjs: the original migration's
// "find last import line" heuristic incorrectly matched the opening `{` of
// multi-line imports, splicing the new `import { domainError } ...` line
// INTO the body of an existing multi-line import block. This script:
//
//   1. Finds every file that contains a `import { domainError } from ...
//      common/errors/domain-error` line.
//   2. Removes that line from wherever it currently sits.
//   3. Re-inserts it on its own line immediately after the LAST closing
//      delimiter of any leading import block (single- or multi-line),
//      preserving the original file's import ordering.
//
// Idempotent: running twice yields the same output.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = join(ROOT, 'backend/src');
const TARGET_PATH = 'common/errors/domain-error';

function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function findEndOfImports(lines) {
  // Walk forward from line 0. Track multi-line import depth via brace
  // balance on lines that participate in an import statement. Return the
  // index of the LAST line that is part of any import (single-line ending
  // in `;` or multi-line whose `} from '...';` closes here), or -1 if no
  // imports.
  let lastImportEnd = -1;
  let inMultiline = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (inMultiline) {
      if (/^}\s*from\s+['"][^'"]+['"]\s*;?\s*$/.test(line.trim())) {
        lastImportEnd = i;
        inMultiline = false;
      }
      continue;
    }
    const trimmed = line.trim();
    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      continue;
    }
    if (/^import\b/.test(trimmed)) {
      // Single-line import?
      if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed)) {
        lastImportEnd = i;
        continue;
      }
      // Side-effect import like `import './x';`
      if (/^import\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed)) {
        lastImportEnd = i;
        continue;
      }
      // Multi-line import opening.
      inMultiline = true;
      continue;
    }
    // Hit a non-import non-comment non-empty line.
    break;
  }
  return lastImportEnd;
}

let repaired = 0;

for (const file of listTsFiles(SRC_ROOT)) {
  const original = readFileSync(file, 'utf8');
  const importLineRegex =
    /^[ \t]*import\s+\{[^}]*\bdomainError\b[^}]*\}\s+from\s+['"][^'"]*domain-error['"]\s*;?[ \t]*$/m;
  const match = original.match(importLineRegex);
  if (!match) continue;

  // Strip ALL occurrences of the domainError import line.
  let stripped = original.replace(new RegExp(importLineRegex.source, 'gm'), '');
  // Collapse multiple consecutive blank lines that the strip may produce.
  stripped = stripped.replace(/\n{3,}/g, '\n\n');

  const lines = stripped.split('\n');
  const lastImportEnd = findEndOfImports(lines);

  // Rebuild the import path relative to the current file (same as the
  // original migration's logic).
  const fromAbs = file;
  const targetAbs = join(SRC_ROOT, TARGET_PATH);
  const path = (() => {
    const relPath = relativePosix(dirAbs(fromAbs), targetAbs);
    return relPath.startsWith('.') ? relPath : `./${relPath}`;
  })();

  const importLine = `import { domainError } from '${path}';`;

  if (lastImportEnd === -1) {
    // No other imports. Place at top of file (after any leading shebang).
    const shebang = lines[0]?.startsWith('#!') ? 1 : 0;
    lines.splice(shebang, 0, importLine, '');
  } else {
    lines.splice(lastImportEnd + 1, 0, importLine);
  }

  const finalContent = lines.join('\n');
  if (finalContent !== original) {
    writeFileSync(file, finalContent, 'utf8');
    repaired += 1;
  }
}

console.log(`[throws-import-repair] repaired ${repaired} files`);

function dirAbs(p) {
  return p.split('/').slice(0, -1).join('/');
}

function relativePosix(from, to) {
  const fromParts = from.split('/');
  const toParts = to.split('/');
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i += 1;
  }
  const up = fromParts.slice(i).map(() => '..');
  const down = toParts.slice(i);
  return [...up, ...down].join('/');
}
