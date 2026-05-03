import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplate } from '@angular/compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = join(root, 'frontend');
const packageJsonPath = join(frontendRoot, 'package.json');
const mainPath = join(frontendRoot, 'src/main.ts');
const angularJsonPath = join(frontendRoot, 'angular.json');
const catalogPath = join(frontendRoot, 'src/app/core/i18n/admin-messages.ts');
const messagesPath = join(frontendRoot, 'src/locale/messages.xlf');
const enMessagesPath = join(frontendRoot, 'src/locale/messages.en-US.xlf');
const adminSrcRoot = join(frontendRoot, 'src/app');
const minExtractedMessages = 13;
const translatableText = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
const translatableAttributes = new Set(['aria-label', 'placeholder', 'title', 'alt', 'matTooltip']);
const ignoredTextHosts = new Set(['mat-icon', 'code', 'pre', 'script', 'style']);

function fail(message) {
  console.error(`[frontend-i18n] ${message}`);
  process.exitCode = 1;
}

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

if (!existsSync(catalogPath)) {
  fail('Missing admin i18n seed catalog.');
} else {
  const catalog = readFileSync(catalogPath, 'utf8');
  const localizeIds = catalog.match(/\$localize`:@@sgp\.admin\.module\./g) ?? [];
  if (localizeIds.length < 13) {
    fail(`Admin i18n catalog must cover at least 13 modules; found ${localizeIds.length}.`);
  }
}

if (!existsSync(messagesPath)) {
  fail('Missing frontend/src/locale/messages.xlf. Run npm --workspace frontend run i18n:extract.');
} else {
  const messages = readFileSync(messagesPath, 'utf8');
  const units = messages.match(/<(?:trans-unit|unit)\b/g) ?? [];
  if (units.length < minExtractedMessages) {
    fail(
      `messages.xlf must contain at least ${minExtractedMessages} extracted messages; found ${units.length}.`,
    );
  }
}

if (!existsSync(enMessagesPath)) {
  fail(
    'Missing frontend/src/locale/messages.en-US.xlf. Run npm --workspace frontend run i18n:extract.',
  );
} else {
  const messages = readFileSync(enMessagesPath, 'utf8');
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

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }
  return files;
}

function hasLiteralText(value) {
  const literal = value
    .replace(/{{[^}]*}}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return translatableText.test(literal);
}

function checkNode(node, context, findings) {
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
    checkNode(
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

const hardCodedFindings = [];
for (const file of walk(adminSrcRoot)) {
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
    checkNode(node, { file: relativeFile, hostName: undefined, inI18n: false }, hardCodedFindings);
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

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[frontend-i18n] OK');
