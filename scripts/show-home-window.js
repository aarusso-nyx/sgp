const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

(async () => {
  const env = getRequiredEnv();
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await maybeLogin(page, env);
  await page.goto('https://sgp.detran.am.gov.br/detran-am/#!/page/home', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  const navInfo = await page.evaluate(() => {
    const nav = document.querySelector('ul#nav.nav');
    return {
      url: window.location.href,
      title: document.title,
      navExists: Boolean(nav),
      navLiCount: nav ? nav.querySelectorAll('li').length : 0,
      navLinkCount: nav ? nav.querySelectorAll('a[href]').length : 0
    };
  });

  console.log(JSON.stringify(navInfo, null, 2));
  console.log('Keeping window open for 25 seconds for visual confirmation...');
  await page.waitForTimeout(25000);

  await context.close();
  await browser.close();
})();
