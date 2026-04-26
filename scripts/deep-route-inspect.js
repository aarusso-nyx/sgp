const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin, saveStorageState } = require('../playwright/support/auth');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function cleanText(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

function slugify(input) {
  return String(input || '')
    .replace(/^#!/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'route';
}

function uniqueBy(items, keyFn) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function inferConstraintSummary(fields) {
  const constraints = [];
  for (const f of fields) {
    const bits = [];
    if (f.required) bits.push('required');
    if (f.min != null) bits.push(`min=${f.min}`);
    if (f.max != null) bits.push(`max=${f.max}`);
    if (f.minlength != null) bits.push(`minlength=${f.minlength}`);
    if (f.maxlength != null) bits.push(`maxlength=${f.maxlength}`);
    if (f.pattern) bits.push(`pattern=${f.pattern}`);
    if (bits.length === 0) continue;
    constraints.push({ field: f.label || f.name || f.id || f.ngModel || f.cssPath, constraints: bits });
  }
  return constraints;
}

(async () => {
  const env = getRequiredEnv();
  const now = new Date().toISOString();

  const routesPath = path.resolve(process.cwd(), 'inventories/routes.json');
  const menusPath = path.resolve(process.cwd(), 'inventories/menus.json');
  const screensPath = path.resolve(process.cwd(), 'inventories/screens.json');
  const actionsPath = path.resolve(process.cwd(), 'inventories/actions.json');
  const featureCatalogPath = path.resolve(process.cwd(), 'docs/feature-catalog.md');
  const workflowsPath = path.resolve(process.cwd(), 'docs/workflows.md');

  const routesInventory = readJson(routesPath);
  const menusInventory = readJson(menusPath);

  const routeList = uniqueBy(
    (routesInventory.routes || [])
      .map((r) => r.path)
      .filter((p) => typeof p === 'string' && p.startsWith('#!')),
    (x) => x
  );

  const moduleByRoute = new Map();
  for (const m of menusInventory.menus || []) {
    if (m.targetRoute && m.module) moduleByRoute.set(m.targetRoute, m.module);
  }

  const baseRoot = env.baseUrl.includes('#') ? env.baseUrl.split('#')[0] : env.baseUrl;
  const reportDir = path.resolve(process.cwd(), 'playwright/reports/deep');
  fs.mkdirSync(reportDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenRecords = [];
  const actionRecords = [];
  const discoveredNestedRoutes = new Set(routeList);

  try {
    await maybeLogin(page, env);

    for (let idx = 0; idx < routeList.length; idx += 1) {
      const route = routeList[idx];
      const targetUrl = `${baseRoot}${route}`;

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(600);

        const detail = await page.evaluate((currentRoute) => {
          const txt = (v) => (v || '').replace(/\s+/g, ' ').trim();
          const isVisible = (el) => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          const heading =
            txt(document.querySelector('h1, h2, .page-header, .panel-title, [ng-bind*="titulo" i]')?.textContent) ||
            txt(document.title);

          const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
            id: f.id || '',
            name: f.getAttribute('name') || '',
            ngController: f.getAttribute('ng-controller') || '',
            index: i + 1
          }));

          const fieldNodes = Array.from(document.querySelectorAll('input, select, textarea'))
            .filter((el) => !['hidden', 'submit', 'button'].includes((el.getAttribute('type') || '').toLowerCase()))
            .filter((el) => isVisible(el));

          const fields = fieldNodes.map((el) => {
            const id = el.id || '';
            const name = el.getAttribute('name') || '';
            const ngModel = el.getAttribute('ng-model') || '';
            const label = id
              ? txt(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent)
              : '';

            let cssPath = el.tagName.toLowerCase();
            if (id) cssPath += `#${id}`;
            else if (name) cssPath += `[name="${name}"]`;
            else if (ngModel) cssPath += `[ng-model="${ngModel}"]`;

            return {
              label,
              tag: el.tagName.toLowerCase(),
              type: (el.getAttribute('type') || '').toLowerCase(),
              id,
              name,
              placeholder: el.getAttribute('placeholder') || '',
              ngModel,
              required: el.hasAttribute('required') || el.getAttribute('ng-required') != null,
              disabled: el.hasAttribute('disabled') || el.getAttribute('ng-disabled') != null,
              pattern: el.getAttribute('pattern') || el.getAttribute('ng-pattern') || '',
              min: el.getAttribute('min'),
              max: el.getAttribute('max'),
              minlength: el.getAttribute('minlength') || el.getAttribute('ng-minlength'),
              maxlength: el.getAttribute('maxlength') || el.getAttribute('ng-maxlength'),
              cssPath
            };
          });

          const actionNodes = Array.from(
            document.querySelectorAll('button, [role="button"], a[href^="#!/"], a[ng-click], [ng-click]')
          ).filter((el) => isVisible(el));

          const actions = actionNodes.map((el) => {
            const href = el.getAttribute('href') || '';
            const ngClick = el.getAttribute('ng-click') || '';
            const label = txt(el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '');
            if (!label && !href && !ngClick) return null;
            return {
              label,
              tag: el.tagName.toLowerCase(),
              type: (el.getAttribute('type') || '').toLowerCase(),
              href,
              ngClick,
              title: el.getAttribute('title') || ''
            };
          }).filter(Boolean);

          const tableNodes = Array.from(document.querySelectorAll('table, .table, [role="grid"], .ui-grid'))
            .filter((el) => isVisible(el));
          const tables = tableNodes.map((t, i) => {
            const headers = Array.from(t.querySelectorAll('th, [role="columnheader"]'))
              .map((h) => txt(h.textContent))
              .filter(Boolean);
            return {
              id: t.id || `table-${i + 1}`,
              className: t.className || '',
              columnHeaders: headers
            };
          });

          const dialogs = Array.from(document.querySelectorAll('.modal, [role="dialog"], md-dialog'))
            .filter((el) => isVisible(el))
            .map((el, i) => ({
              id: el.id || `dialog-${i + 1}`,
              title: txt(el.querySelector('.modal-title, h1, h2, h3')?.textContent || '')
            }));

          const filterCandidates = fields.filter((f) =>
            /filter|filtro|pesquisa|buscar|search/i.test(
              [f.label, f.name, f.id, f.placeholder, f.ngModel].filter(Boolean).join(' ')
            )
          );

          const modelHints = Array.from(new Set([
            ...Array.from(document.querySelectorAll('[ng-model]')).map((el) => el.getAttribute('ng-model') || ''),
            ...Array.from(document.querySelectorAll('[ng-repeat]')).map((el) => el.getAttribute('ng-repeat') || ''),
            ...Array.from(document.querySelectorAll('[ng-controller]')).map((el) => el.getAttribute('ng-controller') || '')
          ].filter(Boolean)));

          const nestedRoutes = Array.from(
            new Set(
              Array.from(document.querySelectorAll('a[href^="#!/"]'))
                .map((a) => a.getAttribute('href') || '')
                .filter(Boolean)
            )
          );

          const routeStatus = window.location.hash && window.location.hash.startsWith('#!') ? window.location.hash : currentRoute;

          return {
            heading,
            routeAtCapture: routeStatus,
            forms,
            fields,
            actions,
            tables,
            dialogs,
            filters: filterCandidates,
            modelHints,
            nestedRoutes
          };
        }, route);

        const shotName = `${String(idx + 1).padStart(3, '0')}-${slugify(route)}.png`;
        const shotPath = path.join(reportDir, shotName);
        await page.screenshot({ path: shotPath, fullPage: true });

        const evidence = [`playwright/reports/deep/${shotName}`];
        const constraints = inferConstraintSummary(detail.fields);

        screenRecords.push({
          id: `screen-${String(screenRecords.length + 1).padStart(3, '0')}`,
          title: detail.heading || route,
          route,
          module: moduleByRoute.get(route) || '',
          elements: {
            forms: detail.forms.map((f) => f.name || f.id || `form-${f.index}`),
            tables: detail.tables.map((t) => `${t.id}${t.columnHeaders.length ? ` (${t.columnHeaders.join(', ')})` : ''}`),
            filters: detail.filters.map((f) => f.label || f.name || f.id || f.ngModel || f.cssPath),
            dialogs: detail.dialogs.map((d) => d.title || d.id)
          },
          details: {
            heading: detail.heading,
            routeAtCapture: detail.routeAtCapture,
            fields: detail.fields,
            constraints,
            models: detail.modelHints,
            nestedRoutes: detail.nestedRoutes
          },
          status: 'observed',
          evidence
        });

        for (const a of detail.actions) {
          actionRecords.push({
            id: `action-${String(actionRecords.length + 1).padStart(4, '0')}`,
            label: a.label || a.title || a.ngClick || a.href || '(unlabeled action)',
            type: a.tag === 'a' ? 'link' : a.tag === 'button' ? 'button' : (a.type || a.tag),
            route,
            module: moduleByRoute.get(route) || '',
            result: a.href ? `navigates:${a.href}` : a.ngClick ? `ng-click:${a.ngClick}` : '',
            raw: a,
            status: 'observed',
            evidence
          });
        }

        for (const nested of detail.nestedRoutes || []) discoveredNestedRoutes.add(nested);
      } catch {
        const shotName = `${String(idx + 1).padStart(3, '0')}-${slugify(route)}-error.png`;
        await page.screenshot({ path: path.join(reportDir, shotName), fullPage: true }).catch(() => {});

        screenRecords.push({
          id: `screen-${String(screenRecords.length + 1).padStart(3, '0')}`,
          title: route,
          route,
          module: moduleByRoute.get(route) || '',
          elements: { forms: [], tables: [], filters: [], dialogs: [] },
          details: {
            heading: '',
            routeAtCapture: page.url(),
            fields: [],
            constraints: [],
            models: [],
            nestedRoutes: []
          },
          status: 'unverified',
          evidence: [`playwright/reports/deep/${shotName}`]
        });
      }
    }

    await saveStorageState(context);
  } finally {
    await context.close();
    await browser.close();
  }

  const dedupActions = uniqueBy(actionRecords, (a) => `${a.route}|${a.type}|${a.label}|${a.result}`)
    .map((a, i) => ({ ...a, id: `action-${String(i + 1).padStart(4, '0')}` }));

  const allRoutesSorted = Array.from(discoveredNestedRoutes)
    .filter((r) => r.startsWith('#!'))
    .sort((a, b) => a.localeCompare(b));

  const routeRecords = allRoutesSorted.map((r, i) => {
    const existing = (routesInventory.routes || []).find((x) => x.path === r);
    const evidence = existing?.evidence && existing.evidence.length > 0
      ? uniqueBy([...(existing.evidence || []), 'playwright/reports/devtools-nav.png'], (x) => x)
      : ['playwright/reports/devtools-nav.png'];
    return {
      id: `route-${String(i + 1).padStart(3, '0')}`,
      path: r,
      name: existing?.name || '',
      module: existing?.module || moduleByRoute.get(r) || '',
      access: existing?.access || 'unknown',
      status: 'observed',
      evidence
    };
  });

  const screensInventory = {
    meta: {
      version: '0.1.0',
      updatedAt: now,
      source: 'playwright-deep-route-inspect'
    },
    screens: screenRecords
  };

  const actionsInventory = {
    meta: {
      version: '0.1.0',
      updatedAt: now,
      source: 'playwright-deep-route-inspect'
    },
    actions: dedupActions
  };

  const updatedRoutesInventory = {
    meta: {
      version: '0.1.0',
      updatedAt: now,
      source: 'playwright-deep-route-inspect'
    },
    routes: routeRecords
  };

  writeJson(screensPath, screensInventory);
  writeJson(actionsPath, actionsInventory);
  writeJson(routesPath, updatedRoutesInventory);

  const perModule = new Map();
  for (const s of screenRecords) {
    const m = s.module || 'Unmapped';
    if (!perModule.has(m)) perModule.set(m, { screens: 0, actions: 0, fields: 0, tables: 0, constraints: 0, nested: 0 });
    const bucket = perModule.get(m);
    bucket.screens += 1;
    bucket.fields += s.details.fields.length;
    bucket.tables += s.elements.tables.length;
    bucket.constraints += s.details.constraints.length;
    bucket.nested += s.details.nestedRoutes.length;
  }
  for (const a of dedupActions) {
    const m = a.module || 'Unmapped';
    if (!perModule.has(m)) perModule.set(m, { screens: 0, actions: 0, fields: 0, tables: 0, constraints: 0, nested: 0 });
    perModule.get(m).actions += 1;
  }

  const moduleRows = Array.from(perModule.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, v]) => `| ${module} | screens=${v.screens}; actions=${v.actions}; fields=${v.fields}; tables=${v.tables}; constraints=${v.constraints}; nested-links=${v.nested} | observed |`)
    .join('\n');

  const featureCatalog = `# Feature Catalog\n\n## Purpose\nCatalog modules, screens, actions, and key UI entities.\n\n## Modules\n| Module | Summary | Status |\n|---|---|---|\n${moduleRows || '| Unmapped | no data | unverified |'}\n\n## Deep Inspect Notes\n- Source: \`playwright-deep-route-inspect\`.\n- Screens analyzed: ${screenRecords.length}.\n- Actions cataloged: ${dedupActions.length}.\n- Routes in map: ${routeRecords.length}.\n- Evidence screenshots: \`playwright/reports/deep/*.png\`.\n\n## Cross references\n- \`inventories/routes.json\`\n- \`inventories/screens.json\`\n- \`inventories/actions.json\`\n`;

  fs.writeFileSync(featureCatalogPath, featureCatalog);

  const topWorkflows = screenRecords
    .filter((s) => s.status === 'observed')
    .slice(0, 12)
    .map((s, i) => {
      const firstAction = dedupActions.find((a) => a.route === s.route);
      const firstFilter = (s.elements.filters || [])[0] || 'none';
      return `### Workflow ${i + 1}: ${s.title}\n1. Entry point: ${s.route}\n2. Preconditions: authenticated user in module \`${s.module || 'Unmapped'}\`.\n3. Steps: open route, review form/table state, apply filter \`${firstFilter}\`, trigger action \`${firstAction ? firstAction.label : 'none observed'}\`.\n4. Expected result: screen renders with current dataset and available actions.\n5. Evidence: ${s.evidence.join(', ')}\n`;
    })
    .join('\n');

  const workflows = `# Workflows\n\n## Purpose\nDocument end-to-end user workflows from observed navigation and actions.\n\n## Workflow template\n1. Entry point:\n2. Preconditions:\n3. Steps:\n4. Expected result:\n5. Evidence:\n\n## Candidate workflows\n${topWorkflows || '- No observed workflows generated.'}\n\n## Notes\n- Workflows are generated from observed route metadata and visible actions.\n- Marked as operational baselines; validate business semantics with domain owner.\n`;

  fs.writeFileSync(workflowsPath, workflows);

  const deepReport = {
    generatedAt: now,
    source: 'playwright-deep-route-inspect',
    totalRoutesInput: routeList.length,
    totalRoutesMapped: routeRecords.length,
    totalScreens: screenRecords.length,
    totalActions: dedupActions.length
  };
  writeJson(path.resolve(process.cwd(), 'playwright/reports/deep/deep-inspect-summary.json'), deepReport);

  console.log(JSON.stringify(deepReport, null, 2));
})();
