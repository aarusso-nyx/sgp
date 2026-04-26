const fs = require('node:fs');
const path = require('node:path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function clean(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function shortList(arr, n = 8) {
  const items = (arr || []).filter(Boolean);
  if (items.length <= n) return items;
  return [...items.slice(0, n), `... (+${items.length - n} more)`];
}

function is403Screen(screen) {
  const title = `${screen.title || ''} ${screen.details?.heading || ''}`;
  const has403 = /\b403\b/.test(title);
  const hasReturnHomeAction = (screen._actions || []).some((a) => /Retornar a p[aá]gina inicial/i.test(a.label || ''));
  return has403 || hasReturnHomeAction;
}

(function main() {
  const now = new Date().toISOString();

  const routes = readJson(path.resolve(process.cwd(), 'inventories/routes.json')).routes || [];
  const screens = readJson(path.resolve(process.cwd(), 'inventories/screens.json')).screens || [];
  const actions = readJson(path.resolve(process.cwd(), 'inventories/actions.json')).actions || [];
  const menus = readJson(path.resolve(process.cwd(), 'inventories/menus.json')).menus || [];

  const actionsByRoute = new Map();
  for (const a of actions) {
    if (!actionsByRoute.has(a.route)) actionsByRoute.set(a.route, []);
    actionsByRoute.get(a.route).push(a);
  }

  const moduleByRouteFromMenu = new Map();
  for (const m of menus) {
    if (m.targetRoute && m.module) moduleByRouteFromMenu.set(m.targetRoute, m.module);
  }

  const routeByPath = new Map(routes.map((r) => [r.path, r]));

  for (const s of screens) {
    s._actions = actionsByRoute.get(s.route) || [];
    s._moduleResolved = s.module || routeByPath.get(s.route)?.module || moduleByRouteFromMenu.get(s.route) || 'Unmapped';
  }

  const modules = new Map();
  for (const s of screens) {
    if (!modules.has(s._moduleResolved)) modules.set(s._moduleResolved, []);
    modules.get(s._moduleResolved).push(s);
  }

  for (const r of routes) {
    const moduleName = r.module || moduleByRouteFromMenu.get(r.path) || 'Unmapped';
    if (!modules.has(moduleName)) modules.set(moduleName, []);
  }

  const outDir = path.resolve(process.cwd(), 'docs/modules');
  fs.mkdirSync(outDir, { recursive: true });

  const moduleDocs = [];

  for (const [moduleName, moduleScreensRaw] of Array.from(modules.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const moduleScreens = moduleScreensRaw.sort((a, b) => (a.route || '').localeCompare(b.route || ''));
    const moduleRoutes = routes
      .filter((r) => (r.module || moduleByRouteFromMenu.get(r.path) || 'Unmapped') === moduleName)
      .sort((a, b) => a.path.localeCompare(b.path));

    const permissionFindings = moduleScreens.filter(is403Screen);

    const totalFields = moduleScreens.reduce((n, s) => n + (s.details?.fields?.length || 0), 0);
    const totalActions = moduleScreens.reduce((n, s) => n + (s._actions?.length || 0), 0);
    const totalConstraints = moduleScreens.reduce((n, s) => n + (s.details?.constraints?.length || 0), 0);

    const fileName = `${slugify(moduleName || 'unmapped')}.md`;
    const filePath = path.join(outDir, fileName);

    const lines = [];
    lines.push(`# Module: ${moduleName}`);
    lines.push('');
    lines.push(`Generated at: ${now}`);
    lines.push('');
    lines.push('## Summary');
    lines.push(`- Routes mapped: ${moduleRoutes.length}`);
    lines.push(`- Screens observed: ${moduleScreens.length}`);
    lines.push(`- Actions cataloged: ${totalActions}`);
    lines.push(`- Fields extracted: ${totalFields}`);
    lines.push(`- Constraint entries: ${totalConstraints}`);
    lines.push(`- Permission findings (403-like): ${permissionFindings.length}`);
    lines.push('');

    lines.push('## Permission Findings');
    if (permissionFindings.length === 0) {
      lines.push('- None observed in current session.');
    } else {
      for (const s of permissionFindings) {
        lines.push(`- ${s.route} | title: ${clean(s.title || s.details?.heading || '(no heading)')} | evidence: ${s.evidence?.[0] || 'n/a'}`);
      }
    }
    lines.push('');

    lines.push('## Route Matrix');
    lines.push('| Route | Screen Title | Fields | Actions | Tables | Filters | Dialogs | Nested Routes | Status |');
    lines.push('|---|---|---:|---:|---:|---:|---:|---:|---|');

    for (const r of moduleRoutes) {
      const s = moduleScreens.find((x) => x.route === r.path);
      const fieldCount = s?.details?.fields?.length || 0;
      const actionCount = s?._actions?.length || 0;
      const tableCount = s?.elements?.tables?.length || 0;
      const filterCount = s?.elements?.filters?.length || 0;
      const dialogCount = s?.elements?.dialogs?.length || 0;
      const nestedCount = s?.details?.nestedRoutes?.length || 0;
      const title = clean(s?.title || s?.details?.heading || 'not captured');
      const status = s?.status || r.status || 'unverified';
      lines.push(`| ${r.path} | ${title} | ${fieldCount} | ${actionCount} | ${tableCount} | ${filterCount} | ${dialogCount} | ${nestedCount} | ${status} |`);
    }
    lines.push('');

    lines.push('## Per-Route Details');
    for (const r of moduleRoutes) {
      const s = moduleScreens.find((x) => x.route === r.path);
      if (!s) {
        lines.push(`### ${r.path}`);
        lines.push('- Capture status: unverified (no screen record).');
        lines.push('');
        continue;
      }

      const fields = s.details?.fields || [];
      const constraints = s.details?.constraints || [];
      const nestedRoutes = unique((s.details?.nestedRoutes || []).filter((x) => x.startsWith('#!')));
      const models = unique(s.details?.models || []);
      const screenActions = s._actions || [];

      lines.push(`### ${r.path}`);
      lines.push(`- Title: ${clean(s.title || s.details?.heading || '(no title)')}`);
      lines.push(`- Evidence: ${s.evidence?.[0] || 'n/a'}`);
      lines.push(`- Fields: ${fields.length}`);
      lines.push(`- Actions: ${screenActions.length}`);
      lines.push(`- Models: ${models.length}`);
      lines.push(`- Constraints: ${constraints.length}`);
      lines.push('');

      lines.push('Field Matrix:');
      lines.push('| Label/Key | Type | ng-model | Required | Constraints |');
      lines.push('|---|---|---|---|---|');
      for (const f of fields) {
        const key = clean(f.label || f.name || f.id || f.ngModel || f.cssPath || '(unknown)');
        const type = clean(`${f.tag || ''}${f.type ? ':' + f.type : ''}`);
        const ngModel = clean(f.ngModel || '');
        const req = f.required ? 'yes' : 'no';
        const c = [];
        if (f.pattern) c.push(`pattern=${f.pattern}`);
        if (f.min != null) c.push(`min=${f.min}`);
        if (f.max != null) c.push(`max=${f.max}`);
        if (f.minlength != null) c.push(`minlength=${f.minlength}`);
        if (f.maxlength != null) c.push(`maxlength=${f.maxlength}`);
        lines.push(`| ${key} | ${type} | ${ngModel} | ${req} | ${c.join('; ')} |`);
      }
      if (fields.length === 0) lines.push('| (none) |  |  |  |  |');
      lines.push('');

      lines.push('Visible Actions:');
      for (const a of shortList(screenActions.map((x) => `${x.label} [${x.type}] ${x.result ? `=> ${x.result}` : ''}`), 25)) {
        lines.push(`- ${a}`);
      }
      if (screenActions.length === 0) lines.push('- none observed');
      lines.push('');

      lines.push('Nested Routes/Components:');
      for (const nr of shortList(nestedRoutes, 30)) lines.push(`- ${nr}`);
      if (nestedRoutes.length === 0) lines.push('- none observed');
      lines.push('');

      lines.push('Model Hints:');
      for (const m of shortList(models, 25)) lines.push(`- ${m}`);
      if (models.length === 0) lines.push('- none observed');
      lines.push('');
    }

    fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
    moduleDocs.push({ moduleName, fileName, routes: moduleRoutes.length, screens: moduleScreens.length, permissions: permissionFindings.length });
  }

  const indexLines = [];
  indexLines.push('# Module Deep Docs');
  indexLines.push('');
  indexLines.push(`Generated at: ${now}`);
  indexLines.push('');
  indexLines.push('| Module | Routes | Screens | Permission Findings | Doc |');
  indexLines.push('|---|---:|---:|---:|---|');
  for (const d of moduleDocs.sort((a, b) => a.moduleName.localeCompare(b.moduleName))) {
    indexLines.push(`| ${d.moduleName} | ${d.routes} | ${d.screens} | ${d.permissions} | [${d.fileName}](./${d.fileName}) |`);
  }

  indexLines.push('');
  indexLines.push('## Notes');
  indexLines.push('- Permission findings are based on observed 403-like pages/actions in the current session.');
  indexLines.push('- Route/module ownership is inferred from `inventories/menus.json` and existing route metadata.');
  indexLines.push('- Deep evidence screenshots live under `playwright/reports/deep/`.');

  fs.writeFileSync(path.join(outDir, 'README.md'), `${indexLines.join('\n')}\n`);

  function unique(arr) {
    return Array.from(new Set(arr));
  }

  console.log(JSON.stringify({ modules: moduleDocs.length, outputDir: 'docs/modules' }, null, 2));
})();
