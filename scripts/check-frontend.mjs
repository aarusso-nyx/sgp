#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseTemplate } from '@angular/compiler';

import { parseArgs } from './lib/cli.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = join(root, 'frontend');

const usage = `
Usage: node scripts/check-frontend.mjs [all|eslint|api-client|modern-angular|i18n] [--help]

Run frontend policy checks through one stable entrypoint.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
if (options.help) {
  console.log(usage.trim());
  process.exit(0);
}

const checkByName = {
  eslint: checkEslint,
  'api-client': checkApiClient,
  'modern-angular': checkModernAngular,
  i18n: checkI18n,
};

const requested = options._.length === 0 ? ['all'] : options._;
const checks = requested.includes('all') ? Object.keys(checkByName) : options._;
const unknown = checks.filter((check) => !(check in checkByName));

if (unknown.length > 0) {
  console.error(`[frontend-check] unknown check: ${unknown.join(', ')}`);
  console.error('Valid checks: all, eslint, api-client, modern-angular, i18n');
  process.exit(1);
}

let failed = false;
for (const check of checks) {
  failed = checkByName[check]() !== 0 || failed;
}
process.exitCode = failed ? 1 : 0;

function walkFiles(directory, predicate) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath, predicate));
    } else if (entry.isFile() && predicate(entry.name, absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function lineForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function checkEslint() {
  const eslintBin = join(root, 'backend', 'node_modules', 'eslint', 'bin', 'eslint.js');

  if (!existsSync(eslintBin)) {
    console.error(
      '[frontend-eslint] Missing backend/node_modules/eslint/bin/eslint.js. Run npm install before linting.',
    );
    return 1;
  }

  const result = spawnSync(
    process.execPath,
    [eslintBin, 'src/**/*.ts', 'portal/src/**/*.ts', '--max-warnings=0'],
    {
      cwd: frontendRoot,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error(`[frontend-eslint] ${result.error.message}`);
    return 1;
  }

  if (result.status !== 0) {
    return result.status ?? 1;
  }

  console.log('[frontend-eslint] OK');
  return 0;
}

function checkApiClient() {
  const scanRoots = [join(frontendRoot, 'src'), join(frontendRoot, 'portal', 'src')];
  const rawHttpPattern = /this\.http\s*(?:\n\s*)?\.(get|post|put|patch|delete)(?:<[^>]+>)?\(/g;
  const allowedFiles = new Set([
    join(frontendRoot, 'src', 'app', 'core', 'api', 'api-client.ts'),
    join(frontendRoot, 'portal', 'src', 'app', 'core', 'api', 'api-client.ts'),
  ]);
  const findings = [];

  for (const scanRoot of scanRoots) {
    for (const file of walkFiles(scanRoot, (name) => name.endsWith('.ts'))) {
      if (allowedFiles.has(file)) continue;

      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(rawHttpPattern)) {
        findings.push(
          `${relative(root, file)}:${lineForIndex(content, match.index ?? 0)}: raw this.http.${match[1]} call`,
        );
      }
    }
  }

  if (findings.length > 0) {
    console.error('[frontend-api-client] Raw HttpClient calls must go through ApiClient:');
    for (const finding of findings) {
      console.error(`  ${finding}`);
    }
    return 1;
  }

  console.log('[frontend-api-client] OK');
  return 0;
}

function checkModernAngular() {
  const adminSrcRoot = join(frontendRoot, 'src');
  const featureRoot = join(frontendRoot, 'src', 'app', 'features');
  const maxComponentSubscribeSites = 218;
  const maxFeatureSubscribeFiles = 49;
  const componentFiles = [];
  let componentSubscribeSites = 0;
  const featureSubscribeFiles = [];
  let writableSignalSites = 0;
  const missingOnPush = [];

  for (const file of walkFiles(
    adminSrcRoot,
    (name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'),
  )) {
    const content = readFileSync(file, 'utf8');
    writableSignalSites += content.match(/\bsignal\s*(?:<[^>]+>)?\s*\(/g)?.length ?? 0;

    if (!content.includes('@Component(')) continue;

    componentFiles.push(file);
    componentSubscribeSites += content.match(/\.subscribe\s*\(/g)?.length ?? 0;

    if (!content.includes('changeDetection: ChangeDetectionStrategy.OnPush')) {
      missingOnPush.push(relative(root, file));
    }
  }

  for (const file of walkFiles(featureRoot, (name) => name.endsWith('.ts'))) {
    const content = readFileSync(file, 'utf8');
    if (/\.subscribe\s*\(/.test(content)) {
      featureSubscribeFiles.push(relative(root, file));
    }
  }

  const findings = [];
  if (missingOnPush.length > 0) {
    findings.push('Components missing ChangeDetectionStrategy.OnPush:');
    findings.push(...missingOnPush.map((file) => `  ${file}`));
  }

  if (componentSubscribeSites > maxComponentSubscribeSites) {
    findings.push(
      `Component .subscribe( sites increased to ${componentSubscribeSites}; maximum allowed is ${maxComponentSubscribeSites}.`,
    );
  }

  if (featureSubscribeFiles.length > maxFeatureSubscribeFiles) {
    findings.push(
      `Feature .subscribe( files increased to ${featureSubscribeFiles.length}; maximum allowed is ${maxFeatureSubscribeFiles}.`,
    );
    findings.push(...featureSubscribeFiles.slice(0, 20).map((file) => `  ${file}`));
  }

  if (writableSignalSites === 0) {
    findings.push('No writable signal() sites found in frontend/src.');
  }

  if (findings.length > 0) {
    console.error('[frontend-modern-angular] Modern Angular guard failed:');
    for (const finding of findings) {
      console.error(finding);
    }
    return 1;
  }

  console.log(
    `[frontend-modern-angular] OK: ${componentFiles.length} components OnPush, ${componentSubscribeSites} component subscribe sites, ${featureSubscribeFiles.length} feature subscribe files, ${writableSignalSites} writable signal sites`,
  );
  return 0;
}

function checkI18n() {
  const packageJsonPath = join(frontendRoot, 'package.json');
  const mainPath = join(frontendRoot, 'src/main.ts');
  const angularJsonPath = join(frontendRoot, 'angular.json');
  const catalogPath = join(frontendRoot, 'src/app/core/i18n/admin-messages.ts');
  const messagesPath = join(frontendRoot, 'src/locale/messages.xlf');
  const enMessagesPath = join(frontendRoot, 'src/locale/messages.en-US.xlf');
  const adminSrcRoot = join(frontendRoot, 'src/app');
  const minExtractedMessages = 13;
  const findings = [];

  const fail = (message) => findings.push(message);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.dependencies?.['@angular/localize']) {
    fail('Missing @angular/localize dependency in frontend/package.json.');
  }

  if (!packageJson.devDependencies?.['ng-extract-i18n-merge']) {
    fail('Missing ng-extract-i18n-merge devDependency in frontend/package.json.');
  }

  const angularJson = JSON.parse(readFileSync(angularJsonPath, 'utf8'));
  const adminProject = angularJson.projects?.['sgp-admin'];
  const adminPolyfills = adminProject?.architect?.build?.options?.polyfills ?? [];
  if (!adminPolyfills.includes('@angular/localize/init')) {
    fail('sgp-admin build options must include @angular/localize/init as a polyfill.');
  }

  if (adminProject?.i18n?.sourceLocale !== 'pt-BR') {
    fail('sgp-admin i18n sourceLocale must be pt-BR.');
  }

  if (adminProject?.i18n?.locales?.['en-US'] !== 'src/locale/messages.en-US.xlf') {
    fail('sgp-admin must register the en-US target locale.');
  }

  const extractTarget = adminProject?.architect?.['extract-i18n'];
  if (extractTarget?.builder !== 'ng-extract-i18n-merge:ng-extract-i18n-merge') {
    fail('sgp-admin extract-i18n target must use ng-extract-i18n-merge.');
  }

  if (!extractTarget?.options?.targetFiles?.includes('messages.en-US.xlf')) {
    fail('sgp-admin extract-i18n target must merge messages.en-US.xlf.');
  }

  const main = readFileSync(mainPath, 'utf8');
  if (!main.includes('ADMIN_I18N_MESSAGES')) {
    fail('frontend/src/main.ts must keep the admin i18n seed catalog reachable.');
  }

  checkCatalog(catalogPath, fail);
  checkMessages(messagesPath, minExtractedMessages, fail);
  checkEnglishMessages(enMessagesPath, minExtractedMessages, fail);
  checkAdminTemplates(adminSrcRoot, fail);

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`[frontend-i18n] ${finding}`);
    }
    return 1;
  }

  console.log('[frontend-i18n] OK');
  return 0;
}

function checkCatalog(catalogPath, fail) {
  if (!existsSync(catalogPath)) {
    fail('Missing admin i18n seed catalog.');
    return;
  }

  const catalog = readFileSync(catalogPath, 'utf8');
  const localizeIds = catalog.match(/\$localize`:@@sgp\.admin\.module\./g) ?? [];
  if (localizeIds.length < 13) {
    fail(`Admin i18n catalog must cover at least 13 modules; found ${localizeIds.length}.`);
  }
}

function checkMessages(messagesPath, minExtractedMessages, fail) {
  if (!existsSync(messagesPath)) {
    fail(
      'Missing frontend/src/locale/messages.xlf. Run npm --workspace frontend run i18n:extract.',
    );
    return;
  }

  const messages = readFileSync(messagesPath, 'utf8');
  const units = messages.match(/<(?:trans-unit|unit)\b/g) ?? [];
  if (units.length < minExtractedMessages) {
    fail(
      `messages.xlf must contain at least ${minExtractedMessages} extracted messages; found ${units.length}.`,
    );
  }
}

function checkEnglishMessages(messagesPath, minExtractedMessages, fail) {
  if (!existsSync(messagesPath)) {
    fail(
      'Missing frontend/src/locale/messages.en-US.xlf. Run npm --workspace frontend run i18n:extract.',
    );
    return;
  }

  const messages = readFileSync(messagesPath, 'utf8');
  const units = messages.match(/<(?:trans-unit|unit)\b/g) ?? [];
  if (!messages.includes('target-language="en-US"')) {
    fail('messages.en-US.xlf must declare target-language="en-US".');
  }
  if (units.length < minExtractedMessages) {
    fail(
      `messages.en-US.xlf must contain at least ${minExtractedMessages} merged messages; found ${units.length}.`,
    );
  }
}

function checkAdminTemplates(adminSrcRoot, fail) {
  const hardCodedFindings = [];
  for (const file of walkFiles(adminSrcRoot, (name) => name.endsWith('.html'))) {
    const relativeFile = relative(root, file);
    const parsed = parseTemplate(readFileSync(file, 'utf8'), relativeFile, {
      preserveWhitespaces: true,
    });
    if (parsed.errors?.length) {
      for (const error of parsed.errors) {
        hardCodedFindings.push(`${relativeFile}: ${error.msg}`);
      }
      continue;
    }
    for (const node of parsed.nodes) {
      checkTemplateNode(
        node,
        { file: relativeFile, hostName: undefined, inI18n: false },
        hardCodedFindings,
      );
    }
  }

  if (hardCodedFindings.length > 0) {
    fail(
      `Admin templates contain ${hardCodedFindings.length} hard-coded user-facing strings without Angular i18n markers:\n${hardCodedFindings
        .slice(0, 20)
        .map((finding) => `  ${finding}`)
        .join('\n')}`,
    );
  }
}

function checkTemplateNode(node, context, findings) {
  const translatableAttributes = new Set([
    'aria-label',
    'placeholder',
    'title',
    'alt',
    'matTooltip',
  ]);
  const ignoredTextHosts = new Set(['mat-icon', 'code', 'pre', 'script', 'style']);
  const nodeName = node.name ?? context.hostName;
  const inI18n = context.inI18n || Boolean(node.i18n);
  const ignoreHost = ignoredTextHosts.has(nodeName);

  if (node.constructor?.name === 'Text' && !ignoreHost && !inI18n && hasLiteralText(node.value)) {
    findings.push(`${context.file}: hard-coded text "${node.value.trim().slice(0, 80)}"`);
  }

  if (
    node.constructor?.name === 'BoundText' &&
    !ignoreHost &&
    !inI18n &&
    typeof node.value?.source === 'string' &&
    hasLiteralText(node.value.source)
  ) {
    findings.push(
      `${context.file}: hard-coded bound text "${node.value.source.trim().slice(0, 80)}"`,
    );
  }

  for (const attribute of node.attributes ?? []) {
    if (
      translatableAttributes.has(attribute.name) &&
      !attribute.i18n &&
      hasLiteralText(attribute.value ?? '')
    ) {
      findings.push(
        `${context.file}: hard-coded ${attribute.name}="${attribute.value.slice(0, 80)}"`,
      );
    }
  }

  for (const child of node.children ?? []) {
    checkTemplateNode(
      child,
      {
        file: context.file,
        hostName: nodeName,
        inI18n,
      },
      findings,
    );
  }
}

function hasLiteralText(value) {
  const literal = value
    .replace(/{{[^}]*}}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(literal);
}
