const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

(async () => {
  const env = getRequiredEnv();
  const targetUrl = 'https://sgp.detran.am.gov.br/detran-am/#!/page/home';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await maybeLogin(page, env);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const reportDir = path.resolve(process.cwd(), 'playwright/reports');
    fs.mkdirSync(reportDir, { recursive: true });
    const screenshot = path.join(reportDir, 'home-nav-check.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    const result = {
      attemptedUrl: targetUrl,
      finalUrl: page.url(),
      title: await page.title(),
      hasPasswordInput: await page.locator('input[type="password"]').count(),
      timestamp: new Date().toISOString(),
      screenshot: 'playwright/reports/home-nav-check.png'
    };

    fs.writeFileSync(path.join(reportDir, 'home-nav-check.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
