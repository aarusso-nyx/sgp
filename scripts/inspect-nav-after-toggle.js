const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

(async () => {
  const env = getRequiredEnv();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await maybeLogin(page, env);
    await page.goto('https://sgp.detran.am.gov.br/detran-am/#!/page/home', { waitUntil: 'domcontentloaded', timeout: 45000 });

    const toggles = [
      'button.navbar-toggle',
      'a.navbar-toggle',
      '.nav-trigger',
      '.fa-bars',
      '[data-toggle="collapse"]',
      '[ng-click*="toggle" i]',
      '[ng-click*="sidebar" i]'
    ];

    for (const sel of toggles) {
      const c = await page.locator(sel).count();
      for (let i = 0; i < Math.min(c, 3); i += 1) {
        const el = page.locator(sel).nth(i);
        if (await el.isVisible().catch(() => false)) {
          await el.click({ timeout: 1200 }).catch(() => {});
          await page.waitForTimeout(400);
        }
      }
    }

    await page.waitForTimeout(5000);

    const result = await page.evaluate(() => {
      const nav = document.querySelector('ul#nav.nav');
      const lis = nav ? Array.from(nav.querySelectorAll('li')).map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim()) : [];
      const links = nav ? Array.from(nav.querySelectorAll('a[href]')).map((a) => ({ text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href') || '' })) : [];
      return {
        hasNav: Boolean(nav),
        liCount: lis.length,
        linkCount: links.length,
        lis,
        links,
        url: window.location.href
      };
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
