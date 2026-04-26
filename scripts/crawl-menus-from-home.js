const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

function clean(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeRoute(baseUrl, href) {
  if (!href || href.startsWith('javascript:')) return '';
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, base);
    if (url.origin !== base.origin) return '';
    if (url.hash && url.hash !== '#') return url.hash;
    return `${url.pathname || '/'}${url.search || ''}`;
  } catch {
    return '';
  }
}

(async () => {
  const env = getRequiredEnv();
  const homeUrl = 'https://sgp.detran.am.gov.br/detran-am/#!/page/home';
  const evidencePath = 'playwright/reports/home-menu-crawl.png';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await maybeLogin(page, env);
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const expanderSelectors = [
      'ul#nav.nav li.has-sub > a',
      'ul#nav.nav [aria-expanded="false"]',
      'nav [aria-expanded="false"]',
      '[role="navigation"] [aria-expanded="false"]',
      'aside [aria-expanded="false"]',
      '[aria-haspopup="true"]'
    ];

    for (const selector of expanderSelectors) {
      const count = await page.locator(selector).count();
      for (let i = 0; i < Math.min(count, 40); i += 1) {
        const item = page.locator(selector).nth(i);
        if (!(await item.isVisible().catch(() => false))) continue;
        await item.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(75);
      }
    }

    const rawMenus = await page.evaluate(() => {
      function txt(v) {
        return (v || '').replace(/\s+/g, ' ').trim();
      }

      function semanticText(node) {
        const clone = node.cloneNode(true);
        const iconSelectors = [
          '.material-icons',
          '.material-symbols-outlined',
          '.material-symbols-rounded',
          'mat-icon',
          'i'
        ];
        for (const sel of iconSelectors) {
          clone.querySelectorAll(sel).forEach((n) => n.remove());
        }
        return txt(clone.textContent || node.textContent || '');
      }

      function findPath(node) {
        const path = [];
        let current = node.parentElement;
        const navRoot = document.querySelector('ul#nav.nav');
        while (current) {
          if (navRoot && current === navRoot) break;
          const role = current.getAttribute('role') || '';
          const isNode = current.tagName === 'LI' || role === 'menuitem' || role === 'treeitem';
          if (isNode) {
            const labelNode = current.querySelector(':scope > a, :scope > button, :scope > [role="menuitem"], :scope > span, :scope > div');
            const label = semanticText(labelNode || current);
            if (label) path.unshift(label);
          }
          current = current.parentElement;
        }
        return path;
      }

      const navRoot = document.querySelector('ul#nav.nav');
      const selectors = navRoot
        ? [
            'ul#nav.nav li > a',
            'ul#nav.nav li > button',
            'ul#nav.nav a[href]',
            'ul#nav.nav [role="menuitem"]'
          ]
        : [
            'nav a[href]',
            'nav button',
            'aside a[href]',
            'aside button',
            '[role="navigation"] a[href]',
            '[role="navigation"] button',
            '[role="menu"] a[href]',
            '[role="menu"] button',
            '[role="menuitem"]'
          ];

      const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
      return nodes
        .map((node) => {
          const label = semanticText(node);
          if (!label) return null;
          const href = node.getAttribute('href') || '';
          const parentPath = findPath(node).filter(Boolean).filter((x) => x !== label);
          const menuPath = [...parentPath, label];
          return { label, href, menuPath };
        })
        .filter(Boolean);
    });

    const unique = new Map();
    for (const item of rawMenus) {
      const label = clean(item.label);
      if (!label) continue;
      const menuPath = (item.menuPath || []).map(clean).filter(Boolean);
      const targetRoute = normalizeRoute(homeUrl, item.href);
      const module = menuPath[0] || label;
      const key = `${menuPath.join('>')}|${targetRoute}`;

      if (!unique.has(key)) {
        unique.set(key, {
          label,
          menuPath: menuPath.length > 0 ? menuPath : [label],
          targetRoute,
          module,
          status: 'observed',
          evidence: [evidencePath]
        });
      }
    }

    const menus = Array.from(unique.values())
      .sort((a, b) => a.menuPath.join('>').localeCompare(b.menuPath.join('>')))
      .map((m, idx) => ({ id: `menu-${String(idx + 1).padStart(3, '0')}`, ...m }));

    const now = new Date().toISOString();
    const reportDir = path.resolve(process.cwd(), 'playwright/reports');
    fs.mkdirSync(reportDir, { recursive: true });
    await page.screenshot({ path: path.join(reportDir, 'home-menu-crawl.png'), fullPage: true });

    const report = {
      generatedAt: now,
      source: 'playwright-home-menu-crawl',
      homeUrl,
      finalUrl: page.url(),
      totalMenus: menus.length,
      menus
    };
    fs.writeFileSync(path.join(reportDir, 'home-menu-crawl.json'), JSON.stringify(report, null, 2));

    const menusInventory = {
      meta: {
        version: '0.1.0',
        updatedAt: now,
        source: 'playwright-home-menu-crawl'
      },
      menus
    };
    fs.writeFileSync(path.resolve(process.cwd(), 'inventories/menus.json'), JSON.stringify(menusInventory, null, 2));

    console.log(JSON.stringify({ totalMenus: menus.length, finalUrl: page.url() }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
