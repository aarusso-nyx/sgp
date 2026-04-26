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
    await page.waitForTimeout(2000);

    const info = await page.evaluate(() => {
      const navRoot = document.querySelector('ul#nav.nav');
      const navLike = Array.from(document.querySelectorAll('ul[id], ul[class], nav, aside')).slice(0, 50)
        .map((n) => ({ tag: n.tagName.toLowerCase(), id: n.id || '', className: (n.className || '').toString().slice(0, 120) }));
      const iframes = Array.from(document.querySelectorAll('iframe')).map((f) => ({ id: f.id || '', name: f.name || '', src: f.getAttribute('src') || '' }));
      return {
        hasNavRoot: Boolean(navRoot),
        navRootPreview: navRoot ? navRoot.outerHTML.slice(0, 600) : '',
        navLike,
        iframes,
        title: document.title,
        location: window.location.href
      };
    });

    console.log(JSON.stringify(info, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
