const fs = require('node:fs');
const path = require('node:path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function clean(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function inferScope(route, moduleName) {
  const r = (route || '').toLowerCase();
  const m = (moduleName || '').toLowerCase();

  if (r.includes('/relatorio') || m.includes('relatório') || m.includes('folha de pgt')) return 'reporting';
  if (m.includes('gestão') || r.includes('/gestao')) return 'master-data-management';
  if (m.includes('módulo rh') || m.includes('rh')) return 'hr-operations';
  if (m.includes('convênio') || r.includes('/convenios/')) return 'internship-agreements';
  if (m.includes('auditoria') || r.includes('/auditoria/')) return 'audit';
  return 'unknown';
}

function inferPermissionKey(route, moduleName) {
  const normalizedRoute = (route || '').replace(/^#!/, '').replace(/\//g, '.').replace(/[^a-zA-Z0-9.]+/g, '_');
  const moduleKey = (moduleName || 'unmapped')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${moduleKey}.access.${normalizedRoute}`;
}

(function main() {
  const screens = readJson(path.resolve(process.cwd(), 'inventories/screens.json')).screens || [];
  const actions = readJson(path.resolve(process.cwd(), 'inventories/actions.json')).actions || [];
  const routes = readJson(path.resolve(process.cwd(), 'inventories/routes.json')).routes || [];

  const actionsByRoute = new Map();
  for (const a of actions) {
    if (!actionsByRoute.has(a.route)) actionsByRoute.set(a.route, []);
    actionsByRoute.get(a.route).push(a);
  }

  const routeMeta = new Map(routes.map((r) => [r.path, r]));

  const blocked = [];
  for (const s of screens) {
    const titleBlob = `${s.title || ''} ${s.details?.heading || ''}`;
    const routeActions = actionsByRoute.get(s.route) || [];
    const has403Title = /\b403\b/.test(titleBlob);
    const hasReturnHome = routeActions.some((a) => /retornar a p[aá]gina inicial/i.test(a.label || ''));
    if (!has403Title && !hasReturnHome) continue;

    const moduleName = s.module || routeMeta.get(s.route)?.module || 'Unmapped';
    const scope = inferScope(s.route, moduleName);
    const key = inferPermissionKey(s.route, moduleName);

    blocked.push({
      route: s.route,
      module: moduleName,
      screen_title: clean(s.title || s.details?.heading || ''),
      status: s.status || 'observed',
      evidence: (s.evidence || []).join(';'),
      reason: has403Title ? '403-page' : 'return-home-guard',
      inferred_permission_scope: scope,
      inferred_permission_key: key,
      fields_count: (s.details?.fields || []).length,
      actions_count: routeActions.length,
      nested_routes_count: (s.details?.nestedRoutes || []).length,
      observed_at_route: clean(s.details?.routeAtCapture || s.route)
    });
  }

  blocked.sort((a, b) => a.route.localeCompare(b.route));

  const outCsv = path.resolve(process.cwd(), 'docs/permission-gap-report.csv');
  const outMd = path.resolve(process.cwd(), 'docs/permission-gap-report.md');

  const headers = [
    'route',
    'module',
    'screen_title',
    'status',
    'evidence',
    'reason',
    'inferred_permission_scope',
    'inferred_permission_key',
    'fields_count',
    'actions_count',
    'nested_routes_count',
    'observed_at_route'
  ];

  const csvLines = [headers.join(',')];
  for (const row of blocked) {
    csvLines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }

  fs.writeFileSync(outCsv, `${csvLines.join('\n')}\n`);

  const byModule = new Map();
  for (const row of blocked) {
    if (!byModule.has(row.module)) byModule.set(row.module, []);
    byModule.get(row.module).push(row);
  }

  const md = [];
  md.push('# Permission Gap Report');
  md.push('');
  md.push(`Generated at: ${new Date().toISOString()}`);
  md.push('');
  md.push(`Total blocked routes (403-like): ${blocked.length}`);
  md.push('');
  md.push('## By Module');
  for (const [moduleName, rows] of Array.from(byModule.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    md.push(`- ${moduleName}: ${rows.length}`);
  }
  md.push('');
  md.push('## Blocked Routes');
  md.push('| Route | Module | Reason | Inferred Permission Key | Evidence |');
  md.push('|---|---|---|---|---|');
  for (const row of blocked) {
    md.push(`| ${row.route} | ${row.module} | ${row.reason} | ${row.inferred_permission_key} | ${row.evidence} |`);
  }
  md.push('');
  md.push('## Files');
  md.push('- `docs/permission-gap-report.csv`');
  md.push('- `docs/permission-gap-report.md`');

  fs.writeFileSync(outMd, `${md.join('\n')}\n`);

  console.log(JSON.stringify({ blocked_routes: blocked.length, csv: 'docs/permission-gap-report.csv', md: 'docs/permission-gap-report.md' }, null, 2));
})();
