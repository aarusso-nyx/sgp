const fs = require('node:fs');
const path = require('node:path');
const { test } = require('@playwright/test');
const { getRequiredEnv } = require('../support/env');
const { maybeLogin, saveStorageState } = require('../support/auth');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function slugify(input) {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cleanLabel(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeRoute(baseUrl, href) {
  if (!href || href.startsWith('javascript:')) return '';

  try {
    const base = new URL(baseUrl);
    const url = new URL(href, base);

    if (url.origin !== base.origin) return '';

    const hash = url.hash || '';
    if (hash.startsWith('#!/')) return hash;
    if (hash.startsWith('#/')) return hash;
    if (hash && hash !== '#') return hash;

    const route = `${url.pathname || '/'}${url.search || ''}`;
    return route || '/';
  } catch {
    return '';
  }
}

function buildRouteRecords(routeCandidates, menuCandidates, evidencePath) {
  const modulesByRoute = new Map();
  const namesByRoute = new Map();

  for (const menu of menuCandidates) {
    if (!menu.targetRoute) continue;
    if (menu.module && !modulesByRoute.has(menu.targetRoute)) {
      modulesByRoute.set(menu.targetRoute, menu.module);
    }
    if (menu.label && !namesByRoute.has(menu.targetRoute)) {
      namesByRoute.set(menu.targetRoute, menu.label);
    }
  }

  return routeCandidates.map((route, idx) => ({
    id: `route-${String(idx + 1).padStart(3, '0')}`,
    path: route,
    name: namesByRoute.get(route) || '',
    module: modulesByRoute.get(route) || '',
    access: 'unknown',
    status: 'observed',
    evidence: [evidencePath]
  }));
}

function writeSitemapDoc(filePath, generatedAt, menus, routes) {
  const topLevelModules = Array.from(
    new Set(menus.map((m) => m.module).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const hashRoutes = routes.filter((r) => r.startsWith('#'));
  const pathRoutes = routes.filter((r) => !r.startsWith('#'));

  const lines = [
    '# Sitemap',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Top-level navigation',
    ...topLevelModules.map((m) => `- ${m}`),
    topLevelModules.length === 0 ? '- none discovered' : '',
    '',
    '## Menu paths',
    ...menus.map((m) => {
      const chain = m.menuPath.join(' > ');
      const routeText = m.targetRoute ? ` -> ${m.targetRoute}` : '';
      return `- ${chain}${routeText}`;
    }),
    menus.length === 0 ? '- none discovered' : '',
    '',
    '## Hash routes',
    ...hashRoutes.map((r) => `- ${r}`),
    hashRoutes.length === 0 ? '- none discovered' : '',
    '',
    '## Path routes',
    ...pathRoutes.map((r) => `- ${r}`),
    pathRoutes.length === 0 ? '- none discovered' : '',
    '',
    '## Notes',
    '- All records in inventories are evidence-based and marked observed from shell crawl.',
    '- Evidence screenshot: `playwright/reports/shell-overview.png`.'
  ].filter((line, index, arr) => {
    if (line !== '') return true;
    return arr[index - 1] !== '';
  });

  ensureDir(filePath);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
}

test('crawl shell navigation and capture top-level navigation, submenus, and hash routes', async ({ browser }) => {
  const env = getRequiredEnv();
  const context = await browser.newContext();
  const page = await context.newPage();

  await maybeLogin(page, env);
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  const expanderSelectors = [
    'nav [aria-expanded="false"]',
    '[role="navigation"] [aria-expanded="false"]',
    'aside [aria-expanded="false"]',
    '[aria-haspopup="true"]'
  ];

  for (const selector of expanderSelectors) {
    const count = await page.locator(selector).count();
    const safeCount = Math.min(count, 25);
    for (let i = 0; i < safeCount; i += 1) {
      const node = page.locator(selector).nth(i);
      if (!(await node.isVisible().catch(() => false))) continue;
      await node.click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(75);
    }
  }

  const discovery = await page.evaluate(() => {
    function txt(v) {
      return (v || '').replace(/\s+/g, ' ').trim();
    }

    function extractAncestorPath(el) {
      const path = [];
      let current = el.parentElement;

      while (current) {
        const role = current.getAttribute('role') || '';
        const isNode = current.tagName === 'LI' || role === 'menuitem' || role === 'treeitem';
        if (isNode) {
          const labelNode = current.querySelector(':scope > a, :scope > button, :scope > [role="menuitem"], :scope > span');
          const label = txt(labelNode ? labelNode.textContent : current.textContent);
          if (label) path.unshift(label);
        }
        current = current.parentElement;
      }

      return path;
    }

    const anchorNodes = Array.from(document.querySelectorAll('a[href]'));
    const anchors = anchorNodes.map((a) => ({
      label: txt(a.textContent),
      href: a.getAttribute('href') || ''
    }));

    const menuCandidates = [];
    const menuNodes = Array.from(
      document.querySelectorAll(
        'nav a[href], nav button, aside a[href], aside button, [role="navigation"] a[href], [role="navigation"] button, [role="menuitem"], [role="menu"] a[href], [role="menu"] button'
      )
    );

    for (const node of menuNodes) {
      const label = txt(node.textContent);
      if (!label) continue;

      const href = node.getAttribute('href') || '';
      const parentPath = extractAncestorPath(node).filter(Boolean);
      const withoutSelf = parentPath.filter((entry) => entry !== label);
      const menuPath = [...withoutSelf, label];

      menuCandidates.push({
        label,
        href,
        menuPath
      });
    }

    return {
      anchors,
      menuCandidates,
      currentPath: window.location.pathname,
      currentHash: window.location.hash || ''
    };
  });

  const allRouteCandidates = new Set();
  const currentRoute = discovery.currentHash || discovery.currentPath || '/';
  allRouteCandidates.add(currentRoute);

  for (const link of discovery.anchors) {
    const route = normalizeRoute(env.baseUrl, link.href);
    if (route) allRouteCandidates.add(route);
  }

  const evidencePath = 'playwright/reports/shell-overview.png';
  const now = new Date().toISOString();

  const menuDedup = new Map();
  for (const item of discovery.menuCandidates) {
    const label = cleanLabel(item.label);
    if (!label) continue;

    const normalizedPath = (item.menuPath || [])
      .map(cleanLabel)
      .filter(Boolean);

    const targetRoute = normalizeRoute(env.baseUrl, item.href);
    if (targetRoute) allRouteCandidates.add(targetRoute);

    const module = normalizedPath[0] || label;
    const key = `${normalizedPath.join('>')}|${targetRoute}`;

    if (!menuDedup.has(key)) {
      menuDedup.set(key, {
        label,
        menuPath: normalizedPath.length > 0 ? normalizedPath : [label],
        targetRoute,
        module,
        status: 'observed',
        evidence: [evidencePath]
      });
    }
  }

  const menus = Array.from(menuDedup.values())
    .sort((a, b) => a.menuPath.join('>').localeCompare(b.menuPath.join('>')))
    .map((m, idx) => ({
      id: `menu-${String(idx + 1).padStart(3, '0')}`,
      ...m
    }));

  const routes = Array.from(allRouteCandidates)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const routeRecords = buildRouteRecords(routes, menus, evidencePath);

  const reportDir = path.resolve(process.cwd(), 'playwright/reports');
  const inventoriesDir = path.resolve(process.cwd(), 'inventories');
  const docsDir = path.resolve(process.cwd(), 'docs');

  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(inventoriesDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  await page.screenshot({ path: path.join(reportDir, 'shell-overview.png'), fullPage: true });

  const shellReport = {
    generatedAt: now,
    source: 'playwright-shell-crawl',
    routeCandidates: routes,
    menuCandidates: menus
  };
  fs.writeFileSync(path.join(reportDir, 'shell-crawl.json'), JSON.stringify(shellReport, null, 2));

  const routesInventory = {
    meta: {
      version: '0.1.0',
      updatedAt: now,
      source: 'playwright-shell-crawl'
    },
    routes: routeRecords
  };

  const menusInventory = {
    meta: {
      version: '0.1.0',
      updatedAt: now,
      source: 'playwright-shell-crawl'
    },
    menus
  };

  fs.writeFileSync(path.join(inventoriesDir, 'routes.json'), JSON.stringify(routesInventory, null, 2));
  fs.writeFileSync(path.join(inventoriesDir, 'menus.json'), JSON.stringify(menusInventory, null, 2));

  writeSitemapDoc(path.join(docsDir, 'sitemap.md'), now, menus, routes);

  await saveStorageState(context);
  await context.close();
});
