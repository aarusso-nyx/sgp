#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..', '..', '..');
const sourceRoot = repoRoot;
const docsRoot = resolve(repoRoot, 'docs/eng');
const outputPath = resolve(repoRoot, 'docs/gov/generated/api/route-alignment.json');

const ROUTE_FAMILIES = [
  '/api/v1',
  '/api/admin/v1',
  '/api/portal/v1',
  '/api/external/v1',
  '/api/publico/v1',
];
const DOMAIN_WORKFLOW_MENU_DOCS = [
  'docs/eng/product.md',
  'docs/eng/platform.md',
  'docs/eng/experience.md',
];

const ROUTE_AUTHORITY_EXCLUDED_DOCS = new Set([
  'docs/gov/generated/database/alignment-matrix.json',
  'docs/gov/generated/api/route-alignment.json',
  'docs/eng/README.md',
  'docs/gov/evidence/implementation-status.md',
]);

const ROUTE_AUTHORITY_EXCLUDED_PREFIXES = [
  'docs/gov/generated/',
  'docs/gov/evidence/',
  'docs/eng/facts/',
  'docs/gov/',
  'docs/user/',
  'docs/leg/',
  'docs/work/',
];

const DOCUMENTATION_SEMANTICS = {
  route_contract_authority_roots: ['docs/eng'],
  governance_control_roots: ['docs/gov'],
  operator_guidance_roots: ['docs/user'],
  legacy_evidence_roots: ['docs/leg'],
  scratch_excluded_roots: ['docs/work'],
  route_contract_excluded_prefixes: ROUTE_AUTHORITY_EXCLUDED_PREFIXES,
  note: 'Route acceptance is extracted from semantic authority docs under docs/eng. Generated, evidence, facts, governance, user, legacy, and scratch documents are excluded from route-contract authority.',
};

const DEFERRED_SCOPES = [
  {
    key: 'ADMIN_INSTALL_LATER',
    status: 'postponed',
    reason:
      'Admin tree, backend routes, and administrative feature surfaces are intentionally installed later and are not current v0.0.1 parity blockers.',
    path_prefixes: ['/api/v1/admin', '/api/admin/v1'],
  },
  {
    key: 'IDENTITY_INSTALL_LATER',
    status: 'postponed',
    reason:
      'OAuth/Cognito and account-management paths are intentionally installed later with the corporate identity framework.',
    path_prefixes: ['/api/v1/auth', '/api/v1/iam', '/api/portal/v1/auth'],
  },
  {
    key: 'ARRECADACAO_PREVIDENCIARIA',
    status: 'future_version',
    reason:
      'Arrecadacao Previdenciaria is later-version scope and has no current v0.0.1 route, menu, DB, UI, or test blocker.',
    path_prefixes: ['/api/v1/arrecadacao', '/api/v1/arrecadacao-previdenciaria'],
  },
];

const DOMAIN_RUNTIME_HINTS = {
  gestao: {
    route_prefixes: ['/api/v1/master-data'],
    source_prefixes: ['backend/src/gestao/'],
  },
  rh: {
    route_prefixes: ['/api/v1/rh', '/api/v1/funcionarios'],
    source_prefixes: ['backend/src/rh/'],
  },
  folha: {
    route_prefixes: ['/api/v1/folha', '/api/v1/folhas', '/api/v1/gfip', '/api/v1/payroll-engine'],
    source_prefixes: ['backend/src/folha-pagamento/', 'backend/src/payroll-engine/'],
  },
  avaliacao: {
    route_prefixes: ['/api/v1/avaliacao'],
    source_prefixes: ['backend/src/avaliacao/'],
  },
  recrutamento: {
    route_prefixes: ['/api/v1/recrutamento'],
    source_prefixes: ['backend/src/recrutamento/'],
  },
  consultas: {
    route_prefixes: ['/api/v1/consultas'],
    source_prefixes: ['backend/src/consultas/'],
  },
  relatorios: {
    route_prefixes: ['/api/v1/relatorios', '/api/v1/reports', '/api/v1/report-service'],
    source_prefixes: [
      'backend/src/relatorio/',
      'backend/src/reports/',
      'backend/src/report-service/',
    ],
  },
  previdenciario: {
    route_prefixes: ['/api/v1/previdenciario'],
    source_prefixes: ['backend/src/previdenciario/'],
  },
  auditoria: {
    route_prefixes: ['/api/v1/auditoria'],
    source_prefixes: ['backend/src/audit/', 'backend/src/auditoria/'],
  },
  saude: {
    route_prefixes: ['/api/v1/pericia'],
    source_prefixes: ['backend/src/saude/'],
  },
  convenio: {
    route_prefixes: ['/api/v1/convenios'],
    source_prefixes: ['backend/src/convenio/'],
  },
};

function parsePathArgument(argumentText) {
  const arg = argumentText.trim();
  if (!arg) {
    return '';
  }
  const quoted = arg.match(/^['"`]([^'"`]+)['"`]$/);
  if (quoted) {
    return quoted[1];
  }
  return '';
}

function normalizePath(path) {
  if (!path) {
    return '';
  }

  let cleaned = path.trim();

  // Keep only the path part when docs include absolute URLs.
  const apiIndex = cleaned.indexOf('/api/');
  if (apiIndex >= 0) {
    cleaned = cleaned.slice(apiIndex);
  }

  cleaned = cleaned
    .replace(/^['"`(<\[]+/, '')
    .replace(/[>'"`)\],;.:]+$/g, '')
    .replace(/\s+\(.+$/, '')
    .replace(/\{([^}]+)\}/g, ':$1')
    .replace(/<([^>]+)>/g, ':$1')
    .replace(/\[([^\]/]+)\]/g, ':$1')
    .replace(/\/+/g, '/');

  const [withoutQuery] = cleaned.split(/[?#]/);
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;

  return withLeadingSlash.endsWith('/') && withLeadingSlash.length > 1
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function routeKey(method, path) {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

function isPathParameter(segment) {
  return segment.startsWith(':') && segment.length > 1;
}

function routePathMatches(documentedPath, runtimePath) {
  const documentedSegments = normalizePath(documentedPath).split('/').filter(Boolean);
  const runtimeSegments = normalizePath(runtimePath).split('/').filter(Boolean);
  if (documentedSegments.length !== runtimeSegments.length) {
    return false;
  }

  return documentedSegments.every(
    (segment, index) =>
      segment === runtimeSegments[index] ||
      isPathParameter(segment) ||
      isPathParameter(runtimeSegments[index]),
  );
}

function routeMatchesDocumented(runtimeRoute, documentedRoute) {
  return (
    runtimeRoute.method === documentedRoute.method &&
    routePathMatches(documentedRoute.path, runtimeRoute.path)
  );
}

function listMarkdownFiles(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  const files = [];
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(relativePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  return files;
}

function listAuthorityDocs() {
  return listMarkdownFiles('docs/eng')
    .filter((relativePath) => !ROUTE_AUTHORITY_EXCLUDED_DOCS.has(relativePath))
    .filter((relativePath) =>
      ROUTE_AUTHORITY_EXCLUDED_PREFIXES.every((prefix) => !relativePath.startsWith(prefix)),
    )
    .sort()
    .map((relativePath) => resolve(repoRoot, relativePath));
}

function listDomainWorkflowMenuDocs() {
  return DOMAIN_WORKFLOW_MENU_DOCS.map((relativePath) => resolve(repoRoot, relativePath));
}

function deferredScopeForRoute(route) {
  const normalized = normalizePath(route.path);
  return (
    DEFERRED_SCOPES.find((scope) =>
      scope.path_prefixes.some(
        (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
      ),
    ) ?? null
  );
}

function parseRuntimeRoutes() {
  const controllerFiles = execSync("rg --files backend/src -g '*controller.ts'", {
    cwd: sourceRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const routes = [];
  for (const relativePath of controllerFiles) {
    const absolutePath = resolve(sourceRoot, relativePath);
    const content = readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let controllerPath = '';

    for (const line of lines) {
      const controllerMatch = line.match(/@Controller\(([^)]*)\)/);
      if (controllerMatch) {
        controllerPath = parsePathArgument(controllerMatch[1]);
        continue;
      }

      const methodMatch = line.match(/@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/);
      if (!methodMatch) {
        continue;
      }

      const method = methodMatch[1].toUpperCase();
      const methodPath = parsePathArgument(methodMatch[2]);
      const combined = normalizePath(
        `/api/${[controllerPath, methodPath].filter(Boolean).join('/')}`,
      );

      routes.push({
        method,
        path: combined,
        source_file: relativePath,
      });
    }
  }

  const deduped = new Map();
  for (const route of routes) {
    deduped.set(routeKey(route.method, route.path), route);
  }
  return [...deduped.values()].sort((a, b) =>
    routeKey(a.method, a.path).localeCompare(routeKey(b.method, b.path)),
  );
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function parseMethodList(methodText) {
  return methodText
    .split('/')
    .map((method) => method.trim().toUpperCase())
    .filter((method) => HTTP_METHODS.has(method));
}

function extractApiPath(candidateText) {
  const match = candidateText.match(/\/api\/[^\s`|,)]+/);
  return normalizePath(match?.[0] ?? '');
}

function addDocumentedRoute(routes, method, path, sourceDoc, evidence = 'explicit_method') {
  const candidatePath = normalizePath(path);
  if (!HTTP_METHODS.has(method) || !candidatePath.startsWith('/api/')) {
    return;
  }

  const key = routeKey(method, candidatePath);
  const current = routes.get(key);
  if (!current) {
    routes.set(key, {
      method,
      path: candidatePath,
      source_doc: sourceDoc,
      evidence,
    });
    return;
  }

  if (!current.source_docs) {
    current.source_docs = [current.source_doc];
  }
  if (!current.source_docs.includes(sourceDoc)) {
    current.source_docs.push(sourceDoc);
  }
}

function parseDocumentedRoutes(docFiles, runtimeRoutes = []) {
  const routes = new Map();
  const runtimeRoutesByPath = new Map();
  for (const route of runtimeRoutes) {
    const key = normalizePath(route.path);
    const existing = runtimeRoutesByPath.get(key) ?? [];
    existing.push(route);
    runtimeRoutesByPath.set(key, existing);
  }

  const explicitMethodPatterns = [
    /`((?:GET|POST|PUT|PATCH|DELETE)(?:\s*\/\s*(?:GET|POST|PUT|PATCH|DELETE))*)\s+([^`\n]+?)`/g,
    /(?:^|\n)\s*((?:GET|POST|PUT|PATCH|DELETE)(?:\s*\/\s*(?:GET|POST|PUT|PATCH|DELETE))*)\s+(\/api\/[^\s`|)]+)/g,
  ];
  const bareApiPathPattern = /`(\/api\/[^`\s|)]+)`/g;

  for (const file of docFiles) {
    const relativeFile = file.replace(`${repoRoot}/`, '');
    const content = readFileSync(file, 'utf8');

    for (const pattern of explicitMethodPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const methods = parseMethodList(match[1] ?? '');
        const candidatePath = extractApiPath(match[2] ?? '');
        if (methods.length === 0 || !candidatePath.startsWith('/api/')) {
          continue;
        }

        for (const method of methods) {
          addDocumentedRoute(routes, method, candidatePath, relativeFile);
        }
      }
    }

    let match;
    while ((match = bareApiPathPattern.exec(content)) !== null) {
      const candidatePath = normalizePath(match[1] ?? '');
      const runtimeMatches = runtimeRoutesByPath.get(candidatePath) ?? [];
      for (const runtimeRoute of runtimeMatches) {
        addDocumentedRoute(
          routes,
          runtimeRoute.method,
          runtimeRoute.path,
          relativeFile,
          'runtime_backed_path_mention',
        );
      }
    }
  }

  return [...routes.values()].sort((a, b) =>
    routeKey(a.method, a.path).localeCompare(routeKey(b.method, b.path)),
  );
}

function parseDomainModules() {
  const briefPath = resolve(repoRoot, 'docs/eng/product.md');
  const content = readFileSync(briefPath, 'utf8');
  const sectionStart = content.indexOf('### 3. Menus de 1º nível');
  const sectionEnd = content.indexOf('### 4.', sectionStart);
  const domainSection =
    sectionStart >= 0
      ? content.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : undefined)
      : content;
  const rows = [];
  const pattern =
    /^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|$/gm;
  let match;
  while ((match = pattern.exec(domainSection)) !== null) {
    const menu = match[1].trim();
    if (menu === 'Menu legado') continue;
    rows.push({
      menu,
      category: match[2].trim(),
      nest_module: match[3].trim(),
      angular_lib: match[4].trim(),
      bounded_context: match[5].trim(),
      source_doc: 'docs/eng/product.md',
    });
  }
  return rows;
}

function routeMatchesPrefix(route, prefix) {
  return route.path === prefix || route.path.startsWith(`${prefix}/`);
}

function buildDomainAlignment(domainModules, runtimeRoutes) {
  return domainModules.map((domain) => {
    const hints = DOMAIN_RUNTIME_HINTS[domain.nest_module] ?? {
      route_prefixes: [`/api/v1/${domain.nest_module}`],
      source_prefixes: [`backend/src/${domain.nest_module}/`],
    };
    const routeEvidence = runtimeRoutes
      .filter((route) => hints.route_prefixes.some((prefix) => routeMatchesPrefix(route, prefix)))
      .slice(0, 8)
      .map((route) => ({
        method: route.method,
        path: route.path,
        source_file: route.source_file,
      }));
    const sourceEvidence = runtimeRoutes
      .filter((route) =>
        hints.source_prefixes.some((prefix) => route.source_file.startsWith(prefix)),
      )
      .slice(0, 8)
      .map((route) => route.source_file);

    return {
      ...domain,
      status: routeEvidence.length > 0 || sourceEvidence.length > 0 ? 'implemented' : 'missing',
      route_evidence: routeEvidence,
      source_evidence: [...new Set(sourceEvidence)],
      frontend_status: 'postponed_admin_tree',
      frontend_deferred_scope: 'ADMIN_INSTALL_LATER',
      frontend_note:
        'Admin tree parity is postponed under ADMIN_INSTALL_LATER and ignored by current alignment gates.',
    };
  });
}

function parseMarkdownTableRoutes(markdown, sectionStart, sectionEnd) {
  const startIndex = markdown.indexOf(sectionStart);
  if (startIndex < 0) return [];
  const endIndex = sectionEnd ? markdown.indexOf(sectionEnd, startIndex) : -1;
  const section = markdown.slice(startIndex, endIndex > startIndex ? endIndex : markdown.length);
  const routes = [];

  for (const line of section.split(/\r?\n/)) {
    if (!line.trim().startsWith('|') || line.includes('|---')) continue;
    const columns = line
      .split('|')
      .slice(1, -1)
      .map((column) => column.trim());
    const routeColumn = columns.find((column) => /^`\/.+`$/.test(column));
    if (!routeColumn) continue;
    routes.push({
      label: columns.slice(0, 2).join(' / '),
      path: routeColumn.slice(1, -1),
      module: (columns[4] ?? '').replace(/`/g, ''),
    });
  }

  return routes;
}

function parsePortalRuntimePaths() {
  const catalogPath = resolve(
    sourceRoot,
    'frontend/portal/src/app/core/portal/portal-feature-catalog.ts',
  );
  const content = readFileSync(catalogPath, 'utf8');
  return ['/', ...[...content.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1])];
}

function pathMatchesPattern(pattern, actual) {
  if (pattern === actual) return true;
  const escaped = pattern
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? '[^/]+' : segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${escaped}$`).test(actual);
}

function buildMenuAlignment() {
  const menuPath = resolve(repoRoot, 'docs/eng/experience.md');
  const content = readFileSync(menuPath, 'utf8');
  const adminMenuRoutes = parseMarkdownTableRoutes(
    content,
    '### 3. Árvore Completa — `sgp-admin`',
    '### 4. Árvore do `sgp-portal`',
  );
  const portalMenuRoutes = parseMarkdownTableRoutes(
    content,
    '#### 4.1 Tabela detalhada — `sgp-portal`',
    '### 5. Regras de Exibição de Menu',
  );
  const portalRuntimePaths = parsePortalRuntimePaths();
  const adminRows = adminMenuRoutes.map((route) => ({
    ...route,
    status: 'postponed',
    deferred_scope: 'ADMIN_INSTALL_LATER',
  }));
  const portalRows = portalMenuRoutes.map((route) => {
    const deferred = route.module === 'auth' ? 'IDENTITY_INSTALL_LATER' : undefined;
    const implemented = portalRuntimePaths.some((runtimePath) =>
      pathMatchesPattern(route.path, runtimePath),
    );
    return {
      ...route,
      status: deferred ? 'postponed' : implemented ? 'implemented' : 'missing',
      deferred_scope: deferred,
    };
  });

  return {
    admin: {
      status: 'postponed',
      deferred_scope: 'ADMIN_INSTALL_LATER',
      documented_routes: adminRows.length,
      implemented: 0,
      postponed: adminRows.length,
      missing: [],
      routes: adminRows,
    },
    portal: {
      status: portalRows.some((row) => row.status === 'missing') ? 'missing' : 'implemented',
      documented_routes: portalRows.length,
      implemented: portalRows.filter((row) => row.status === 'implemented').length,
      postponed: portalRows.filter((row) => row.status === 'postponed').length,
      missing: portalRows.filter((row) => row.status === 'missing'),
      routes: portalRows,
    },
  };
}

function main() {
  const authorityDocs = listAuthorityDocs();
  const domainWorkflowMenuDocs = listDomainWorkflowMenuDocs();
  const runtimeRoutes = parseRuntimeRoutes();
  const documentedRouteCandidates = parseDocumentedRoutes(authorityDocs, runtimeRoutes);
  const documentedRoutesAll = documentedRouteCandidates.filter(
    (route) =>
      deferredScopeForRoute(route) ||
      runtimeRoutes.some((runtimeRoute) => routeMatchesDocumented(runtimeRoute, route)),
  );
  const documentedOutsideRuntime = documentedRouteCandidates.filter(
    (route) => !documentedRoutesAll.includes(route),
  );
  const deferredDocumentedRoutes = documentedRoutesAll
    .map((route) => ({ route, scope: deferredScopeForRoute(route) }))
    .filter((entry) => entry.scope);
  const documentedRoutes = documentedRoutesAll.filter((route) => !deferredScopeForRoute(route));
  const deferredRuntimeRoutes = runtimeRoutes
    .map((route) => ({ route, scope: deferredScopeForRoute(route) }))
    .filter((entry) => entry.scope);
  const currentRuntimeRoutes = runtimeRoutes.filter((route) => !deferredScopeForRoute(route));

  const runtimeByKey = new Map(
    currentRuntimeRoutes.map((route) => [routeKey(route.method, route.path), route]),
  );

  const routes = documentedRoutes.map((route) => {
    const key = routeKey(route.method, route.path);
    const implemented =
      runtimeByKey.has(key) ||
      currentRuntimeRoutes.some((runtimeRoute) => routeMatchesDocumented(runtimeRoute, route));
    return {
      method: route.method,
      path: route.path,
      status: implemented ? 'implemented' : 'explicitly_excluded',
      source_doc: route.source_doc,
      source_docs: route.source_docs,
      evidence: route.evidence,
      note: implemented
        ? 'Implemented in runtime route map.'
        : 'Documented route not currently implemented in runtime.',
    };
  });

  const runtimeOnly = currentRuntimeRoutes.filter(
    (route) =>
      !documentedRoutes.some((documentedRoute) => routeMatchesDocumented(route, documentedRoute)),
  );

  const documentedMissing = routes
    .filter((route) => route.status === 'explicitly_excluded')
    .map((route) => ({
      method: route.method,
      path: route.path,
      source_doc: route.source_doc,
      source_docs: route.source_docs,
      evidence: route.evidence,
    }));

  const runtimeOutsideFamilies = currentRuntimeRoutes.filter(
    (route) =>
      !ROUTE_FAMILIES.some(
        (family) => route.path === family || route.path.startsWith(`${family}/`),
      ),
  );
  const domainAlignment = buildDomainAlignment(parseDomainModules(), currentRuntimeRoutes);
  const menuAlignment = buildMenuAlignment();

  const output = {
    generated_at: new Date().toISOString().slice(0, 10),
    authority: [...new Set([...authorityDocs, ...domainWorkflowMenuDocs])].map((file) =>
      file.replace(`${repoRoot}/`, ''),
    ),
    route_contract_authority: authorityDocs.map((file) => file.replace(`${repoRoot}/`, '')),
    documentation_semantics: DOCUMENTATION_SEMANTICS,
    domain_workflow_menu_authority: domainWorkflowMenuDocs.map((file) =>
      file.replace(`${repoRoot}/`, ''),
    ),
    supplemental_runtime_route_authority: [],
    route_families: ROUTE_FAMILIES,
    deferred_scopes: DEFERRED_SCOPES,
    approved_out_of_scope_routes: [],
    counts: {
      documented_total: documentedRoutesAll.length,
      documented_candidates_total: documentedRouteCandidates.length,
      documented_outside_runtime: documentedOutsideRuntime.length,
      documented: documentedRoutes.length,
      runtime_total: runtimeRoutes.length,
      runtime: currentRuntimeRoutes.length,
      deferred_documented: deferredDocumentedRoutes.length,
      deferred_runtime: deferredRuntimeRoutes.length,
      implemented: routes.filter((route) => route.status === 'implemented').length,
      explicitly_excluded: routes.filter((route) => route.status === 'explicitly_excluded').length,
      documented_missing: documentedMissing.length,
      runtime_only: runtimeOnly.length,
      runtime_outside_families: runtimeOutsideFamilies.length,
      domain_modules: domainAlignment.length,
      domain_modules_implemented: domainAlignment.filter(
        (domain) => domain.status === 'implemented',
      ).length,
      portal_menu_routes: menuAlignment.portal.documented_routes,
      portal_menu_missing: menuAlignment.portal.missing.length,
      admin_menu_routes: menuAlignment.admin.documented_routes,
      admin_menu_implemented: menuAlignment.admin.implemented,
      admin_menu_missing: menuAlignment.admin.missing.length,
      admin_menu_routes_postponed: menuAlignment.admin.postponed,
    },
    deferred_documented_routes: deferredDocumentedRoutes.map(({ route, scope }) => ({
      method: route.method,
      path: route.path,
      source_doc: route.source_doc,
      source_docs: route.source_docs,
      evidence: route.evidence,
      deferred_scope: scope.key,
      reason: scope.reason,
    })),
    documented_outside_runtime: documentedOutsideRuntime.map((route) => ({
      method: route.method,
      path: route.path,
      source_doc: route.source_doc,
      source_docs: route.source_docs,
      evidence: route.evidence,
      note: 'Mentioned in docs/eng but not part of the current runtime-backed route gate.',
    })),
    deferred_runtime_routes: deferredRuntimeRoutes.map(({ route, scope }) => ({
      method: route.method,
      path: route.path,
      source_file: route.source_file,
      deferred_scope: scope.key,
      reason: scope.reason,
    })),
    documented_missing: documentedMissing,
    runtime_only: runtimeOnly.map((route) => ({
      method: route.method,
      path: route.path,
      source_file: route.source_file,
    })),
    runtime_outside_families: runtimeOutsideFamilies.map((route) => ({
      method: route.method,
      path: route.path,
      source_file: route.source_file,
    })),
    domain_alignment: domainAlignment,
    workflow_alignment: {
      status:
        domainAlignment.every((domain) => domain.status === 'implemented') &&
        menuAlignment.portal.missing.length === 0
          ? 'implemented'
          : 'missing',
      domain_modules: domainAlignment,
      portal_menu: menuAlignment.portal,
    },
    menu_alignment: menuAlignment,
    routes,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  execSync(
    'npm --workspace backend exec -- prettier --write --ignore-unknown ../docs/gov/generated/api/route-alignment.json',
    {
      cwd: sourceRoot,
      stdio: 'inherit',
    },
  );

  console.log(
    `[api-alignment] wrote ${outputPath} (documented=${output.counts.documented}, runtime=${output.counts.runtime}, missing=${output.counts.documented_missing}, runtime_only=${output.counts.runtime_only})`,
  );
}

main();
