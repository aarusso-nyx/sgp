#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceRoot = process.cwd();
const alignmentPath = resolve(workspaceRoot, 'docs/eng/69-api-route-alignment.json');
const ALLOWED_STATUSES = new Set(['implemented', 'explicitly_excluded']);
const ROUTE_CONTRACT_AUTHORITY_ROOT = 'docs/eng/';
const FORBIDDEN_ROUTE_AUTHORITY_PREFIXES = ['docs/gov/', 'docs/user/', 'docs/leg/', 'docs/work/'];

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');

const findings = [];

function ok(message) {
  findings.push({ level: 'ok', message });
}

function fail(message) {
  findings.push({ level: 'error', message });
  process.exitCode = 1;
}

function routeLabel(route) {
  return `${route.method} ${route.path}`;
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

function isAllowedRouteAuthorityDoc(path) {
  return (
    path.startsWith(ROUTE_CONTRACT_AUTHORITY_ROOT) &&
    FORBIDDEN_ROUTE_AUTHORITY_PREFIXES.every((prefix) => !path.startsWith(prefix))
  );
}

function assertDocumentationSemantics(alignment) {
  const routeAuthority = asStringArray(alignment.route_contract_authority);
  if (routeAuthority.length === 0) {
    fail('Route alignment is missing route_contract_authority metadata.');
  }

  const invalidAuthority = routeAuthority.filter((path) => !isAllowedRouteAuthorityDoc(path));
  if (invalidAuthority.length > 0) {
    fail(
      `Route contract authority includes non-docs/eng files: ${invalidAuthority
        .slice(0, 20)
        .join(', ')}`,
    );
  } else if (routeAuthority.length > 0) {
    ok(`Route contract authority is limited to ${ROUTE_CONTRACT_AUTHORITY_ROOT} documents.`);
  }

  const allAuthority = asStringArray(alignment.authority);
  const forbiddenAuthority = allAuthority.filter((path) =>
    FORBIDDEN_ROUTE_AUTHORITY_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
  if (forbiddenAuthority.length > 0) {
    fail(
      `Route authority includes excluded documentation roots: ${forbiddenAuthority
        .slice(0, 20)
        .join(', ')}`,
    );
  }

  const semantics = alignment.documentation_semantics ?? {};
  const routeRoots = asStringArray(semantics.route_contract_authority_roots);
  const excludedPrefixes = asStringArray(semantics.route_contract_excluded_prefixes);
  if (!routeRoots.includes('docs/eng')) {
    fail('Documentation semantics must name docs/eng as route_contract_authority_roots.');
  }

  const missingExcludedPrefix = FORBIDDEN_ROUTE_AUTHORITY_PREFIXES.filter(
    (prefix) => !excludedPrefixes.includes(prefix),
  );
  if (missingExcludedPrefix.length > 0) {
    fail(
      `Documentation semantics must exclude route authority prefixes: ${missingExcludedPrefix.join(
        ', ',
      )}`,
    );
  } else if (routeRoots.includes('docs/eng')) {
    ok(
      'Documentation semantics exclude governance, user, legacy, and scratch docs from route authority.',
    );
  }
}

function main() {
  const alignment = JSON.parse(readFileSync(alignmentPath, 'utf8'));
  const routes = Array.isArray(alignment.routes) ? alignment.routes : [];

  assertDocumentationSemantics(alignment);

  if (routes.length === 0) {
    fail('Route alignment file has no routes.');
  } else {
    ok(`Route alignment contains ${routes.length} documented routes.`);
  }

  const invalidStatus = routes.filter((route) => !ALLOWED_STATUSES.has(route.status));
  if (invalidStatus.length > 0) {
    fail(
      `Route alignment has invalid statuses: ${invalidStatus
        .slice(0, 20)
        .map((route) => `${route.method} ${route.path}:${route.status}`)
        .join(', ')}`,
    );
  } else {
    ok('All route statuses are valid.');
  }

  const approved = new Set(
    (Array.isArray(alignment.approved_out_of_scope_routes)
      ? alignment.approved_out_of_scope_routes
      : []
    ).map((entry) => {
      if (typeof entry === 'string') {
        return entry.toUpperCase();
      }
      if (entry && typeof entry === 'object' && entry.method && entry.path) {
        return `${String(entry.method).toUpperCase()} ${String(entry.path)}`;
      }
      return '';
    }),
  );

  const excluded = routes.filter((route) => route.status === 'explicitly_excluded');
  const unapprovedExcluded = excluded.filter(
    (route) => !approved.has(routeLabel(route).toUpperCase()),
  );
  if (unapprovedExcluded.length > 0) {
    fail(
      `Route alignment has unapproved explicit exclusions: ${unapprovedExcluded
        .slice(0, 20)
        .map(routeLabel)
        .join(', ')}`,
    );
  } else {
    ok('All explicitly excluded routes are approved out-of-scope exceptions.');
  }

  const documentedMissing = Array.isArray(alignment.documented_missing)
    ? alignment.documented_missing
    : [];
  if (documentedMissing.length > 0) {
    fail(
      `Documented routes missing in runtime: ${documentedMissing
        .slice(0, 20)
        .map(routeLabel)
        .join(', ')}`,
    );
  } else {
    ok('Runtime covers all documented routes.');
  }

  const runtimeOnly = Array.isArray(alignment.runtime_only) ? alignment.runtime_only : [];
  if (runtimeOnly.length > 0) {
    fail(
      `Runtime exposes undocumented routes: ${runtimeOnly.slice(0, 20).map(routeLabel).join(', ')}`,
    );
  } else {
    ok('Runtime exposes only documented routes.');
  }

  const runtimeOutsideFamilies = Array.isArray(alignment.runtime_outside_families)
    ? alignment.runtime_outside_families
    : [];
  if (runtimeOutsideFamilies.length > 0) {
    fail(
      `Runtime routes outside canonical families: ${runtimeOutsideFamilies
        .slice(0, 20)
        .map(routeLabel)
        .join(', ')}`,
    );
  } else {
    ok('All runtime routes are in canonical /api path families.');
  }

  const domainAlignment = Array.isArray(alignment.domain_alignment)
    ? alignment.domain_alignment
    : [];
  if (domainAlignment.length > 0) {
    const missingDomains = domainAlignment.filter((domain) => domain.status !== 'implemented');
    if (missingDomains.length > 0) {
      fail(
        `Current-scope domain modules missing runtime evidence: ${missingDomains
          .slice(0, 20)
          .map((domain) => `${domain.menu} (${domain.nest_module})`)
          .join(', ')}`,
      );
    } else {
      ok(`Domain/workflow alignment covers ${domainAlignment.length} current SGP domain modules.`);
    }
  }

  const menuAlignment = alignment.menu_alignment ?? {};
  const portalMenu = menuAlignment.portal ?? {};
  const portalMissing = Array.isArray(portalMenu.missing) ? portalMenu.missing : [];
  if (portalMissing.length > 0) {
    fail(
      `Portal menu routes missing runtime coverage: ${portalMissing
        .slice(0, 20)
        .map((route) => route.path)
        .join(', ')}`,
    );
  } else if (portalMenu.documented_routes !== undefined) {
    ok(
      `Portal menu alignment covers ${portalMenu.implemented ?? 0} implemented route(s) and ${portalMenu.postponed ?? 0} postponed identity route(s).`,
    );
  }

  const adminMenu = menuAlignment.admin ?? {};
  const adminMissing = Array.isArray(adminMenu.missing) ? adminMenu.missing : [];
  if (adminMissing.length > 0) {
    fail(
      `Admin menu routes missing current-scope coverage: ${adminMissing
        .slice(0, 20)
        .map((route) => route.path)
        .join(', ')}`,
    );
  } else if (adminMenu.status === 'implemented') {
    ok(`Admin menu alignment covers ${adminMenu.implemented ?? 0} current-scope route(s).`);
  } else if (adminMenu.status === 'postponed') {
    ok(`Admin menu parity is postponed under ${adminMenu.deferred_scope ?? 'deferred scope'}.`);
  }

  const output = {
    ok: !(process.exitCode && process.exitCode !== 0),
    findings,
    counts: alignment.counts ?? null,
  };

  if (asJson) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  for (const finding of findings) {
    const prefix = finding.level === 'error' ? 'ERROR' : 'OK';
    console.log(`[api-alignment] ${prefix}: ${finding.message}`);
  }
  console.log(`[api-alignment] ${output.ok ? 'PASSED' : 'FAILED'}`);
}

main();
