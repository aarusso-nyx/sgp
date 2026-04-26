const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

function clean(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

(async () => {
  const env = getRequiredEnv();
  const targetUrl = 'https://sgp.detran.am.gov.br/detran-am/#!/page/home';
  const reportDir = path.resolve(process.cwd(), 'playwright/reports');
  const evidencePath = 'playwright/reports/legacy-ul-nav-crawl.png';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await maybeLogin(page, env);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const data = await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const txt = (v) => (v || '').replace(/\s+/g, ' ').trim();
      const nav = document.querySelector('ul#nav.nav');
      if (!nav) return { navFound: false, menus: [] };

      const topLinks = Array.from(nav.querySelectorAll(':scope > li > a'));
      for (const link of topLinks) {
        try { link.click(); } catch {}
        await wait(120);
      }

      const topItems = Array.from(nav.querySelectorAll(':scope > li')).filter((li) => !li.classList.contains('nav-title'));
      const menus = topItems
        .map((li) => {
          const a = li.querySelector(':scope > a');
          const topLabel = txt(a?.textContent || '').replace(/^menu\s*/i, '').replace(/\s*$/, '').trim();
          if (!topLabel) return null;

          const subs = Array.from(li.querySelectorAll('ul li a[href]'))
            .map((s) => ({ label: txt(s.textContent || '').replace(/^menu\s*/i, '').trim(), href: s.getAttribute('href') || '' }))
            .filter((s) => s.label && s.href);

          const unique = [];
          const seen = new Set();
          for (const s of subs) {
            const key = `${s.label}|${s.href}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(s);
          }

          return { topLabel, href: a?.getAttribute('href') || '', submenus: unique };
        })
        .filter(Boolean);

      return { navFound: true, menus };
    });

    fs.mkdirSync(reportDir, { recursive: true });
    await page.screenshot({ path: path.join(reportDir, 'legacy-ul-nav-crawl.png'), fullPage: true });

    const now = new Date().toISOString();

    const menuRecords = [];
    const routeSet = new Set(['#!/page/home']);
    for (const m of data.menus) {
      for (const s of m.submenus) {
        routeSet.add(s.href);
        menuRecords.push({
          label: s.label,
          menuPath: [m.topLabel, s.label],
          targetRoute: s.href,
          module: m.topLabel,
          status: 'observed',
          evidence: [evidencePath]
        });
      }
    }

    const menus = menuRecords
      .sort((a, b) => a.menuPath.join('>').localeCompare(b.menuPath.join('>')))
      .map((m, idx) => ({ id: `menu-${String(idx + 1).padStart(3, '0')}`, ...m }));

    const routes = Array.from(routeSet)
      .sort((a, b) => a.localeCompare(b))
      .map((r, idx) => ({
        id: `route-${String(idx + 1).padStart(3, '0')}`,
        path: r,
        name: '',
        module: '',
        access: 'unknown',
        status: 'observed',
        evidence: [evidencePath]
      }));

    const menusInventory = {
      meta: { version: '0.1.0', updatedAt: now, source: 'playwright-legacy-ul-nav-crawl' },
      menus
    };

    const routesInventory = {
      meta: { version: '0.1.0', updatedAt: now, source: 'playwright-legacy-ul-nav-crawl' },
      routes
    };

    const report = {
      generatedAt: now,
      source: 'playwright-legacy-ul-nav-crawl',
      targetUrl,
      finalUrl: page.url(),
      navFound: Boolean(data.navFound),
      topMenus: data.menus.map((m) => ({ topLabel: m.topLabel, submenuCount: m.submenus.length })),
      totalTopMenus: data.menus.length,
      totalMenuLinks: menus.length,
      evidence: evidencePath
    };

    fs.writeFileSync(path.resolve(process.cwd(), 'inventories/menus.json'), JSON.stringify(menusInventory, null, 2));
    fs.writeFileSync(path.resolve(process.cwd(), 'inventories/routes.json'), JSON.stringify(routesInventory, null, 2));
    fs.writeFileSync(path.join(reportDir, 'legacy-ul-nav-crawl.json'), JSON.stringify(report, null, 2));

    const top = data.menus.map((m) => `- ${m.topLabel} (${m.submenus.length})`).join('\n') || '- none discovered';
    const paths = menus.slice(0, 120).map((m) => `- ${m.menuPath.join(' > ')} -> ${m.targetRoute}`).join('\n') || '- none discovered';
    const hashRoutes = Array.from(routeSet).filter((r) => r.startsWith('#')).sort((a, b) => a.localeCompare(b));
    const hashLines = hashRoutes.map((r) => `- ${r}`).join('\n') || '- none discovered';

    const sitemap = `# Sitemap\n\nGenerated at: ${now}\n\n## Top-level navigation\n${top}\n\n## Menu paths\n${paths}\n\n## Hash routes\n${hashLines}\n\n## Path routes\n- none discovered\n\n## Notes\n- Discovery source: legacy AngularJS sidebar container \`ul#nav.nav\`.\n- Evidence screenshot: \`${evidencePath}\`.\n`;

    fs.writeFileSync(path.resolve(process.cwd(), 'docs/sitemap.md'), sitemap);

    console.log(JSON.stringify({ navFound: data.navFound, totalTopMenus: data.menus.length, totalMenuLinks: menus.length }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
