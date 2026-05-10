#!/usr/bin/env node

// One-shot migration helper used during the W2-3 lift (Wave 2 of the QA
// scorecard plan). Replaces every `throw new Error(...)` site in
// backend/src (excluding *.spec.ts / *.test.ts / *.d.ts) with
// `throw domainError.internal('INTERNAL_INVARIANT', ...)` and ensures the
// `domainError` import is present.
//
// The script is intentionally idempotent: re-running it is a no-op once
// every site has been migrated.
//
// Reviewed by: ADR-027 (custom-lint-as-policy) for the no-bare-error-throw
// rule that this migration enables.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = join(ROOT, 'backend/src');
const DOMAIN_ERROR_ABS = join(SRC_ROOT, 'common/errors/domain-error');

function listTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

function computeImportPath(fromFile) {
  let rel = relative(dirname(fromFile), DOMAIN_ERROR_ABS);
  rel = rel.split(/[\\/]/).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function ensureDomainErrorImport(content, importPath) {
  // Already imports domainError from anywhere matching the module path.
  if (/from\s+['"][^'"]*common\/errors\/domain-error['"]/.test(content)) {
    if (/\bdomainError\b/.test(content)) return content;
    return content.replace(
      /import\s+\{([^}]*)\}\s+from\s+(['"])([^'"]*common\/errors\/domain-error)\2/,
      (_match, members, quote, modulePath) => {
        const list = members
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (!list.includes('domainError')) list.push('domainError');
        return `import { ${list.join(', ')} } from ${quote}${modulePath}${quote}`;
      },
    );
  }

  const lines = content.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^import\b/.test(lines[i])) lastImport = i;
  }
  const newImport = `import { domainError } from '${importPath}';`;
  if (lastImport === -1) {
    lines.unshift(newImport, '');
  } else {
    lines.splice(lastImport + 1, 0, newImport);
  }
  return lines.join('\n');
}

let totalSites = 0;
let touchedFiles = 0;

for (const file of listTsFiles(SRC_ROOT)) {
  const original = readFileSync(file, 'utf8');
  if (!/throw\s+new\s+Error\s*\(/.test(original)) continue;

  const updated = original.replace(/throw\s+new\s+Error\s*\(/g, () => {
    totalSites += 1;
    return "throw domainError.internal('INTERNAL_INVARIANT', ";
  });

  const importPath = computeImportPath(file);
  const finalContent = ensureDomainErrorImport(updated, importPath);

  if (finalContent !== original) {
    writeFileSync(file, finalContent, 'utf8');
    touchedFiles += 1;
  }
}

console.log(`[migrate-throws] migrated ${totalSites} sites across ${touchedFiles} files`);
