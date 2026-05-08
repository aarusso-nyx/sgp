#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectRlsSpecs } from '../checks/rls-specs.mjs';
import { defaultRepoRoot } from '../repo-paths.mjs';
import { hardFailGateCommands } from '../workspace-commands.mjs';

const repoRoot = defaultRepoRoot;

const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function readJson(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function readJsonc(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  const content = readFileSync(absolutePath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(content);
}

function pathExists(relativePath) {
  return existsSync(resolve(repoRoot, relativePath));
}

function assertPath(relativePath, name = relativePath) {
  record(`path:${name}`, pathExists(relativePath), relativePath);
}

function hasPinnedRuntime(packageJson) {
  return (
    packageJson.packageManager === 'npm@11.12.1' &&
    packageJson.engines?.node === '>=24.0.0 <25' &&
    packageJson.engines?.npm === '>=11.12.1 <12'
  );
}

function validatePackagePins() {
  const packages = ['package.json', 'backend/package.json', 'frontend/package.json'];

  for (const packagePath of packages) {
    const packageJson = readJson(packagePath);
    record(`runtime-pin:${packagePath}`, hasPinnedRuntime(packageJson), packagePath);
  }

  assertPath('.nvmrc');
}

function validateSingleLockfile() {
  assertPath('package-lock.json');
  record(
    'lockfile:no-backend-lockfile',
    !pathExists('backend/package-lock.json'),
    'backend/package-lock.json',
  );
  record(
    'lockfile:no-frontend-lockfile',
    !pathExists('frontend/package-lock.json'),
    'frontend/package-lock.json',
  );
}

function validateGovernanceManifest() {
  const manifest = readJson('docs/gov/generated/governance-manifest.json');
  record('governance-manifest:implemented', manifest.status === 'implemented', manifest.status);
  for (const control of manifest.controls ?? []) {
    record(
      `governance-control:${control.id}`,
      typeof control.evidence === 'string' && pathExists(control.evidence),
      control.evidence,
    );
  }
}

function validateReverseSuccession() {
  const content = readFileSync(resolve(repoRoot, 'docs/leg/rev-eng/deprecation-status.md'), 'utf8');
  const rows = content
    .split('\n')
    .filter((line) => line.includes('|') && line.includes('2026-04-26'));
  const uncovered = rows.filter((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    return cells[2] === '—' || cells[4] === 'not_covered';
  });

  record('reverse-succession:rows-present', rows.length > 0, `${rows.length} rows`);
  record(
    'reverse-succession:no-uncovered-2026-04-26',
    uncovered.length === 0,
    `${uncovered.length} uncovered rows`,
  );
}

function validateDevaiConfig() {
  const config = readJson('devai.config.json');
  record('devai:project', config.project === 'sgp', config.project);
  record('devai:source-root', config.sourceRoot === '.', config.sourceRoot);

  for (const path of config.authoritativeDocs ?? []) {
    assertPath(path, `devai-authoritative:${path}`);
  }

  for (const path of config.generatedSurfaces ?? []) {
    assertPath(path, `devai-generated:${path}`);
  }

  const hardFailCommands = new Set(config.hardFailGates?.map((gate) => gate.command) ?? []);
  for (const command of hardFailGateCommands) {
    record(`devai-hard-fail:${command}`, hardFailCommands.has(command), command);
  }
}

function validateCanonicalRootScripts() {
  const packageJson = readJson('package.json');
  const scripts = packageJson.scripts ?? {};
  const removedScripts = [
    ['start', 'dev'],
    ['start', 'frontend'],
    ['start', 'backend'],
    ['build', 'workspaces'],
    ['build', 'frontend'],
    ['lint', 'workspaces'],
    ['format', 'workspaces'],
    ['test', 'workspaces'],
    ['test', 'unit'],
    ['test', 'int'],
    ['commit', 'check'],
    ['governance', 'runtime-topology'],
  ].map((parts) => parts.join(':'));

  for (const scriptName of removedScripts) {
    record(`root-script:removed:${scriptName}`, !(scriptName in scripts), scriptName);
  }

  for (const scriptName of [
    'build',
    'start',
    'lint',
    'lint:check',
    'format',
    'format:check',
    'typecheck',
    'test',
    'test:db',
    'test:e2e',
    'test:coverage',
    'evidence:check',
    'governance:check',
  ]) {
    record(`root-script:canonical:${scriptName}`, scriptName in scripts, scriptName);
  }
}

function validateRlsSpecsExecutable() {
  const result = inspectRlsSpecs(repoRoot);

  record(
    'rls-specs:no-stub-only-files',
    result.stubOnlyFiles.length === 0,
    result.stubOnlyFiles.length === 0
      ? `${result.executableCount} executable files`
      : result.stubOnlyFiles.join('; '),
  );
  record(
    'rls-specs:tenant-insert-select-promoted',
    result.smokeExecutableCount >= 50,
    `${result.smokeExecutableCount} executable tenant-A insert + tenant-B zero-row specs`,
  );
}

function listMarkdownFiles(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      return listMarkdownFiles(relativePath);
    }
    return entry.name.endsWith('.md') ? [relativePath] : [];
  });
}

function listFiles(relativeDir, predicate = () => true) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  if (!existsSync(absoluteDir)) return [];
  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      return listFiles(relativePath, predicate);
    }
    return predicate(relativePath) ? [relativePath] : [];
  });
}

function validateLiveDocPaths() {
  const liveDocFiles = ['docs/eng', 'docs/gov', 'docs/user']
    .flatMap(listMarkdownFiles)
    .filter(
      (file) => !file.startsWith('docs/gov/audit/diag/') && !file.startsWith('docs/gov/audit/inv/'),
    );
  const pathPattern =
    /`((?:backend|frontend|database|scripts|docs|infra|\.github|tests|package\.json|devai\.config\.json|GOVERNANCE\.md)[^`\s]*)`/g;
  const missing = [];

  for (const file of liveDocFiles) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    for (const match of content.matchAll(pathPattern)) {
      const referencedPath = match[1].replace(/[.,;:)]+$/, '');
      if (
        referencedPath.includes('*') ||
        referencedPath.includes('${') ||
        referencedPath.includes('<') ||
        referencedPath.includes('>') ||
        referencedPath.includes('://') ||
        referencedPath.startsWith('docs/work') ||
        referencedPath.startsWith('docs/leg')
      ) {
        continue;
      }

      if (!pathExists(referencedPath)) {
        missing.push(`${file} -> ${referencedPath}`);
      }
    }
  }

  record(
    'docs:live-backtick-paths',
    missing.length === 0,
    missing.length === 0 ? `${liveDocFiles.length} files` : missing.join('; '),
  );
}

function validateAdr011CurrentState() {
  const content = readFileSync(resolve(repoRoot, 'docs/eng/platform.md'), 'utf8');
  record(
    'adr-011:current-state-marker',
    content.includes('ADR-011-CURRENT-STATE'),
    'docs/eng/platform.md',
  );
  record(
    'adr-011:no-current-nx-tree-claim',
    !content.includes('apps/\n  sgp-core-api') && !content.includes('libs/\n  @sgp/domain'),
    'docs/eng/platform.md',
  );
}

function validateArchitectureDecisions() {
  const decisionIndexPath = 'docs/eng/decisions/README.md';
  const allowedStatuses = new Set(['Proposed', 'Accepted', 'Postponed', 'Superseded']);
  const decisionFiles = listMarkdownFiles('docs/eng/decisions')
    .filter((file) => /^docs\/eng\/decisions\/adr-\d{3}-.+\.md$/.test(file))
    .sort();
  const indexContent = pathExists(decisionIndexPath)
    ? readFileSync(resolve(repoRoot, decisionIndexPath), 'utf8')
    : '';
  const invalid = [];
  const missingIndexRows = [];

  for (const file of decisionFiles) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    const status = content.match(/^Status:\s*(.+)$/m)?.[1]?.trim();
    if (!content.match(/^# ADR-\d{3}:/m)) {
      invalid.push(`${file}: missing ADR heading`);
    }
    if (!status || !allowedStatuses.has(status)) {
      invalid.push(`${file}: invalid status ${status ?? '<missing>'}`);
    }
    if (!content.match(/^Date:\s*\d{4}-\d{2}-\d{2}$/m)) {
      invalid.push(`${file}: missing Date`);
    }
    if (!indexContent.includes(file.split('/').at(-1) ?? file)) {
      missingIndexRows.push(file);
    }
  }

  record('adr:index-present', pathExists(decisionIndexPath), decisionIndexPath);
  record('adr:series-present', decisionFiles.length >= 2, `${decisionFiles.length} ADR files`);
  record(
    'adr:status-and-date-valid',
    invalid.length === 0,
    invalid.length === 0 ? 'all ADRs valid' : invalid.join('; '),
  );
  record(
    'adr:index-covers-series',
    missingIndexRows.length === 0,
    missingIndexRows.length === 0 ? 'all ADRs indexed' : missingIndexRows.join('; '),
  );
}

function validateArchitectureLayoutMap() {
  const architecturePath = 'docs/eng/architecture.md';
  const topology = readJson('docs/gov/generated/runtime-topology.json');
  const content = pathExists(architecturePath)
    ? readFileSync(resolve(repoRoot, architecturePath), 'utf8')
    : '';
  const runtimes = Array.isArray(topology.runtimes) ? topology.runtimes : [];
  const missingRuntimes = runtimes
    .map((runtime) => runtime.name)
    .filter((name) => typeof name === 'string' && !content.includes(name));
  const missingRuntimePaths = runtimes.flatMap((runtime) =>
    (runtime.required_paths ?? []).filter((path) => !pathExists(path)),
  );

  record('architecture:map-present', pathExists(architecturePath), architecturePath);
  record(
    'architecture:layout-waivers',
    content.includes('SGP-LAYOUT-WAIVER:ROOT-SRC') &&
      content.includes('SGP-LAYOUT-WAIVER:ROOT-TOOLS'),
    architecturePath,
  );
  record('architecture:admin-boundary', content.includes('ADMIN_INSTALL_LATER'), architecturePath);
  record(
    'architecture:runtime-map-current',
    missingRuntimes.length === 0,
    missingRuntimes.length === 0 ? `${runtimes.length} runtime(s)` : missingRuntimes.join('; '),
  );
  record(
    'runtime-topology:required-paths-exist',
    missingRuntimePaths.length === 0,
    missingRuntimePaths.length === 0 ? 'all required paths exist' : missingRuntimePaths.join('; '),
  );
}

function validateBoundaryImports() {
  const sourceFiles = [
    ...listFiles('backend/src', (file) => file.endsWith('.ts')),
    ...listFiles('frontend/src', (file) => file.endsWith('.ts')),
    ...listFiles('frontend/portal/src', (file) => file.endsWith('.ts')),
  ];
  const forbidden = [];

  for (const file of sourceFiles) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    if (file.startsWith('backend/src/') && /from ['"](?:\.\.\/)+frontend\//.test(content)) {
      forbidden.push(`${file}: backend imports frontend`);
    }
    if (
      (file.startsWith('frontend/src/') || file.startsWith('frontend/portal/src/')) &&
      /from ['"](?:\.\.\/)+backend\//.test(content)
    ) {
      forbidden.push(`${file}: frontend imports backend`);
    }
  }

  record(
    'architecture:forbidden-cross-tier-imports',
    forbidden.length === 0,
    forbidden.length === 0 ? `${sourceFiles.length} files scanned` : forbidden.join('; '),
  );
}

function validateFunctionalRequisiteScope() {
  const ledgerPath = 'docs/gov/audit/functional-requisites.md';
  const scopeLedgerPath = 'docs/gov/evidence/mvp-scope-ledger.md';
  const content = readFileSync(resolve(repoRoot, ledgerPath), 'utf8');
  const rows = content
    .split('\n')
    .filter((line) => /^\|\s*FR-[A-Z]+-[A-Z0-9]+\s*\|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const invalidStatus = rows.filter((row) => !['DONE', 'DEFERRED'].includes(row[2]));
  const doneWithoutProof = rows.filter(
    (row) =>
      row[2] === 'DONE' && !/source=.*test=.*command=.*audit=.*rationale=/i.test(row[4] ?? ''),
  );
  const deferredWithoutScope = rows.filter(
    (row) => row[2] === 'DEFERRED' && !(row[4] ?? '').includes(scopeLedgerPath),
  );

  record('fr-scope:ledger-present', pathExists(scopeLedgerPath), scopeLedgerPath);
  record(
    'fr-scope:no-generic-todo',
    invalidStatus.length === 0,
    invalidStatus.length === 0
      ? `${rows.length} scoped rows`
      : invalidStatus.map((row) => `${row[0]}:${row[2]}`).join('; '),
  );
  record(
    'fr-scope:done-proof-metadata',
    doneWithoutProof.length === 0,
    doneWithoutProof.length === 0
      ? `${rows.filter((row) => row[2] === 'DONE').length} DONE rows`
      : doneWithoutProof.map((row) => row[0]).join('; '),
  );
  record(
    'fr-scope:deferred-owner-ledger',
    deferredWithoutScope.length === 0,
    deferredWithoutScope.length === 0
      ? `${rows.filter((row) => row[2] === 'DEFERRED').length} DEFERRED rows`
      : deferredWithoutScope.map((row) => row[0]).join('; '),
  );
}

function validateRouteAlignmentScope() {
  const alignment = readJson('docs/gov/generated/api/route-alignment.json');
  const deferredScopes = Array.isArray(alignment.deferred_scopes) ? alignment.deferred_scopes : [];
  const adminScope = deferredScopes.find((scope) => scope.key === 'ADMIN_INSTALL_LATER');
  const counts = alignment.counts ?? {};

  record(
    'route-scope:admin-install-later-present',
    adminScope?.status === 'postponed',
    'ADMIN_INSTALL_LATER',
  );
  record(
    'route-scope:admin-postponed-count-retained',
    Number(counts.admin_menu_routes_postponed ?? 0) >= 100,
    `${counts.admin_menu_routes_postponed ?? 0} postponed admin routes`,
  );
  record(
    'route-scope:no-runtime-route-drift',
    Number(counts.documented_missing ?? 0) === 0 &&
      Number(counts.runtime_only ?? 0) === 0 &&
      Number(counts.runtime_outside_families ?? 0) === 0,
    `documented_missing=${counts.documented_missing ?? 0}, runtime_only=${
      counts.runtime_only ?? 0
    }, runtime_outside_families=${counts.runtime_outside_families ?? 0}`,
  );
}

function validatePrivacyRedactionPolicy() {
  const policyPath = 'docs/gov/privacy/redactions.json';
  const loggingConfig = readFileSync(
    resolve(repoRoot, 'backend/src/common/logging/logging.config.ts'),
    'utf8',
  );
  const policy = pathExists(policyPath) ? readJson(policyPath) : {};
  const piiKeys = Array.isArray(policy.piiKeys) ? policy.piiKeys : [];
  const secretPaths = Array.isArray(policy.secretPaths) ? policy.secretPaths : [];
  const requiredPiiKeys = ['cpf', 'cpf_cnpj', 'pisPasep', 'bankAccount', 'email'];
  const missingPiiKeys = requiredPiiKeys.filter((key) => !piiKeys.includes(key));

  record('privacy:redaction-policy-present', pathExists(policyPath), policyPath);
  record(
    'privacy:redaction-policy-json-driven',
    loggingConfig.includes('LOG_REDACTION_POLICY_PATH') && loggingConfig.includes(policyPath),
    'backend/src/common/logging/logging.config.ts',
  );
  record(
    'privacy:redaction-policy-pii-coverage',
    missingPiiKeys.length === 0 && secretPaths.includes('req.headers.authorization'),
    missingPiiKeys.length === 0 ? `${piiKeys.length} PII keys` : missingPiiKeys.join('; '),
  );
}

function collectTextFiles(relativeDirs, extensions) {
  return relativeDirs.flatMap((dir) =>
    listFiles(dir, (file) => extensions.some((extension) => file.endsWith(extension))),
  );
}

function validateTypeSafetyGate() {
  const frontendTsConfig = readJsonc('frontend/tsconfig.json');
  const backendTsConfig = readJsonc('backend/tsconfig.json');
  const packageJson = readJson('package.json');
  const runScript = readFileSync(resolve(repoRoot, 'scripts/run.mjs'), 'utf8');
  const brandedIds = pathExists('backend/src/common/types/branded-ids.ts')
    ? readFileSync(resolve(repoRoot, 'backend/src/common/types/branded-ids.ts'), 'utf8')
    : '';
  const requiredBrands = [
    'TenantId',
    'UserId',
    'EmployeeId',
    'RequestId',
    'AuditEventId',
    'WorkerJobId',
  ];
  const missingBrands = requiredBrands.filter((brand) => !brandedIds.includes(`type ${brand}`));
  const typeTestContent = pathExists('tests/types/domain-id-contracts.ts')
    ? readFileSync(resolve(repoRoot, 'tests/types/domain-id-contracts.ts'), 'utf8')
    : '';

  record(
    'types:frontend-exact-optional',
    frontendTsConfig.compilerOptions?.exactOptionalPropertyTypes === true,
    'frontend/tsconfig.json',
  );
  record(
    'types:frontend-indexed-access',
    frontendTsConfig.compilerOptions?.noUncheckedIndexedAccess === true,
    'frontend/tsconfig.json',
  );
  record(
    'types:backend-strict',
    backendTsConfig.compilerOptions?.strict === true &&
      backendTsConfig.compilerOptions?.noImplicitAny === true,
    'backend/tsconfig.json',
  );
  record(
    'types:branded-ids-present',
    missingBrands.length === 0,
    missingBrands.length === 0 ? requiredBrands.join(', ') : missingBrands.join('; '),
  );
  record(
    'types:test-script-dispatcher-backed',
    packageJson.scripts?.['test:types'] === 'node scripts/run.mjs test types' &&
      runScript.includes("'tsc'") &&
      runScript.includes("'--noEmit'") &&
      runScript.includes("'tests/types/tsconfig.json'"),
    'package.json + scripts/run.mjs',
  );
  record(
    'types:negative-assertions-present',
    pathExists('tests/types/tsconfig.json') &&
      (typeTestContent.match(/@ts-expect-error/g) ?? []).length >= 3 &&
      typeTestContent.includes('openapi-client'),
    'tests/types/domain-id-contracts.ts',
  );
  record(
    'types:retained-proof-present',
    pathExists('docs/gov/audit/type-safety-proof.md'),
    'docs/gov/audit/type-safety-proof.md',
  );
}

function validateUnsafeTypeSuppressions() {
  const generatedPathSegments = [
    '/generated/',
    'frontend/src/app/core/api/generated/',
    'frontend/portal/src/app/core/api/generated/',
    'backend/coverage/',
    'frontend/coverage/',
  ];
  const files = collectTextFiles(
    ['backend/src', 'frontend/src', 'frontend/portal/src', 'scripts', 'tests'],
    ['.ts', '.mts', '.mjs'],
  ).filter(
    (file) =>
      file !== 'scripts/lib/governance/validate.mjs' &&
      !generatedPathSegments.some((segment) => file.includes(segment)),
  );
  const violations = [];
  const suppressionPattern = /@ts-ignore|@ts-nocheck|as\s+any\b|:\s*any\b|<any>|\bany\[\]/g;

  for (const file of files) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    for (const match of content.matchAll(suppressionPattern)) {
      violations.push(`${file}:${match[0]}`);
    }
  }

  record(
    'types:no-unsafe-suppressions',
    violations.length === 0,
    violations.length === 0 ? `${files.length} files scanned` : violations.join('; '),
  );
}

function validateCoverageAndMutationGates() {
  const backendCoverage = readJson('tests/backend/jest-coverage.json');
  const angular = readJson('frontend/angular.json');
  const packageJson = readJson('package.json');
  const sourceCi = readFileSync(resolve(repoRoot, '.github/workflows/source-ci.yml'), 'utf8');
  const strykerConfig = pathExists('stryker.conf.cjs')
    ? readFileSync(resolve(repoRoot, 'stryker.conf.cjs'), 'utf8')
    : '';
  const adminThresholds =
    angular.projects?.['sgp-admin']?.architect?.test?.options?.coverageThresholds ?? {};
  const portalThresholds =
    angular.projects?.['sgp-portal']?.architect?.test?.options?.coverageThresholds ?? {};
  const backendThresholds = backendCoverage.coverageThreshold?.global ?? {};

  record(
    'coverage:backend-90-80',
    backendThresholds.statements >= 90 &&
      backendThresholds.lines >= 90 &&
      backendThresholds.functions >= 90 &&
      backendThresholds.branches >= 80,
    JSON.stringify(backendThresholds),
  );
  record(
    'coverage:portal-90-global-ratchet',
    portalThresholds.statements >= 90 &&
      portalThresholds.lines >= 90 &&
      portalThresholds.functions >= 90 &&
      portalThresholds.branches >= 90,
    JSON.stringify(portalThresholds),
  );
  record(
    'coverage:admin-90-global-ratchet',
    adminThresholds.statements >= 90 &&
      adminThresholds.lines >= 90 &&
      adminThresholds.functions >= 90 &&
      adminThresholds.branches >= 90,
    JSON.stringify(adminThresholds),
  );
  record(
    'mutation:script-dispatcher-backed',
    packageJson.scripts?.['test:mutation'] === 'node scripts/run.mjs test mutation' &&
      sourceCi.includes('npm run test:mutation'),
    'package.json + source-ci',
  );
  record(
    'mutation:scoped-break-threshold',
    strykerConfig.includes('break: 70') &&
      strykerConfig.includes('backend/src/common/money/money.ts') &&
      strykerConfig.includes('backend/src/common/errors/standard-exception.filter.ts'),
    'stryker.conf.cjs',
  );
  record(
    'test-confidence:proof-present',
    pathExists('docs/gov/audit/test-confidence-proof.md'),
    'docs/gov/audit/test-confidence-proof.md',
  );
}

function validateDocumentationGraph() {
  const architecture = pathExists('docs/eng/architecture.md')
    ? readFileSync(resolve(repoRoot, 'docs/eng/architecture.md'), 'utf8')
    : '';
  const engReadme = readFileSync(resolve(repoRoot, 'docs/eng/README.md'), 'utf8');
  const govReadme = readFileSync(resolve(repoRoot, 'docs/gov/README.md'), 'utf8');
  const userReadme = readFileSync(resolve(repoRoot, 'docs/user/README.md'), 'utf8');
  const apiReadme = pathExists('docs/eng/api/README.md')
    ? readFileSync(resolve(repoRoot, 'docs/eng/api/README.md'), 'utf8')
    : '';
  const operatorReadiness = pathExists('docs/user/operator-readiness.md')
    ? readFileSync(resolve(repoRoot, 'docs/user/operator-readiness.md'), 'utf8')
    : '';

  record(
    'docs:operator-readiness-entrypoint',
    operatorReadiness.includes('docs/gov/generated/runtime-topology.json') &&
      operatorReadiness.includes('npm run test:types') &&
      operatorReadiness.includes('npm run test:mutation'),
    'docs/user/operator-readiness.md',
  );
  record(
    'docs:api-contract-readme',
    apiReadme.includes('npm run api:client:generate') &&
      apiReadme.includes('npm run api:alignment:check -- --json') &&
      apiReadme.includes('frontend/src/app/core/api/generated') &&
      apiReadme.includes('docs/gov/generated/api/route-alignment.json'),
    'docs/eng/api/README.md',
  );
  record(
    'docs:architecture-mermaid-flows',
    (architecture.match(/```mermaid/g) ?? []).length >= 4 &&
      architecture.includes('API Request, Audit, And Logging') &&
      architecture.includes('Worker Job, Retry, Poison, And Audit') &&
      architecture.includes('Postponed Infrastructure Topology'),
    'docs/eng/architecture.md',
  );
  record(
    'docs:readme-entrypoints-linked',
    engReadme.includes('api/README.md') &&
      govReadme.includes('repository-discipline.md') &&
      govReadme.includes('type-safety-proof.md') &&
      userReadme.includes('operator-readiness.md'),
    'docs/eng + docs/gov + docs/user README.md',
  );
}

function validateRepositoryDiscipline() {
  const codeowners = readFileSync(resolve(repoRoot, '.github/CODEOWNERS'), 'utf8');
  const dependabot = readFileSync(resolve(repoRoot, '.github/dependabot.yml'), 'utf8');
  const sourceCi = readFileSync(resolve(repoRoot, '.github/workflows/source-ci.yml'), 'utf8');
  const gitignore = readFileSync(resolve(repoRoot, '.gitignore'), 'utf8');
  const disciplineEvidence = pathExists('docs/gov/evidence/repository-discipline.md')
    ? readFileSync(resolve(repoRoot, 'docs/gov/evidence/repository-discipline.md'), 'utf8')
    : '';
  const requiredCodeowners = [
    '/package.json',
    '/.github/workflows/',
    '/backend/',
    '/frontend/',
    '/database/sql/',
    '/scripts/',
    '/docs/eng/decisions/',
    '/docs/gov/generated/',
    '/docs/gov/privacy/',
    '/tests/backend/',
    '/tests/rls/',
    '/tests/types/',
  ];
  const missingCodeowners = requiredCodeowners.filter((pattern) => !codeowners.includes(pattern));

  record(
    'repo-discipline:codeowners-high-risk-surfaces',
    missingCodeowners.length === 0,
    missingCodeowners.length === 0
      ? `${requiredCodeowners.length} surfaces`
      : missingCodeowners.join('; '),
  );
  record(
    'repo-discipline:dependabot-ecosystems',
    dependabot.includes("package-ecosystem: 'npm'") &&
      dependabot.includes("package-ecosystem: 'github-actions'"),
    '.github/dependabot.yml',
  );
  record(
    'repo-discipline:husky-commitlint',
    pathExists('.husky/commit-msg') &&
      pathExists('.husky/pre-commit') &&
      pathExists('commitlint.config.cjs'),
    '.husky + commitlint.config.cjs',
  );
  record(
    'repo-discipline:source-ci-enforces-gates',
    sourceCi.includes('commitlint') &&
      sourceCi.includes('npm run test:types') &&
      sourceCi.includes('npm run test:mutation') &&
      sourceCi.includes('npm run governance:check'),
    '.github/workflows/source-ci.yml',
  );
  record('repo-discipline:docs-work-ignored', gitignore.includes('docs/work/**'), '.gitignore');
  record(
    'repo-discipline:branch-protection-evidence',
    disciplineEvidence.includes('required reviews') &&
      disciplineEvidence.includes('CODEOWNERS review') &&
      disciplineEvidence.includes('no force pushes') &&
      disciplineEvidence.includes('no deletions'),
    'docs/gov/evidence/repository-discipline.md',
  );
}

function main() {
  validatePackagePins();
  validateSingleLockfile();
  validateGovernanceManifest();
  validateReverseSuccession();
  validateDevaiConfig();
  validateCanonicalRootScripts();
  validateRlsSpecsExecutable();
  validateLiveDocPaths();
  validateAdr011CurrentState();
  validateArchitectureDecisions();
  validateArchitectureLayoutMap();
  validateBoundaryImports();
  validateFunctionalRequisiteScope();
  validateRouteAlignmentScope();
  validatePrivacyRedactionPolicy();
  validateTypeSafetyGate();
  validateUnsafeTypeSuppressions();
  validateCoverageAndMutationGates();
  validateDocumentationGraph();
  validateRepositoryDiscipline();

  const failures = checks.filter((check) => !check.ok);
  for (const check of checks) {
    console.log(`[governance] ${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
  }

  if (failures.length > 0) {
    console.error(`[governance] failed checks: ${failures.length}`);
    process.exitCode = 1;
  }
}

main();
