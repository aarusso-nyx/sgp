const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { getRequiredEnv } = require('../support/env');
const { maybeLogin } = require('../support/auth');

test('crawl a module and capture screen/action candidates', async ({ browser }) => {
  const env = getRequiredEnv();
  expect(env.moduleName, 'MODULE_NAME is required').toBeTruthy();

  const context = await browser.newContext();
  const page = await context.newPage();
  await maybeLogin(page, env);
  await page.goto(env.baseUrl, { waitUntil: 'domcontentloaded' });

  const moduleLower = env.moduleName.toLowerCase();
  const moduleLink = page.locator('a[href]', { hasText: new RegExp(moduleLower, 'i') }).first();

  if (await moduleLink.isVisible().catch(() => false)) {
    await moduleLink.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  const buttons = await page.$$eval('button, [role="button"]', (nodes) =>
    nodes.map((n) => (n.textContent || '').trim()).filter(Boolean)
  );

  const forms = await page.$$eval('form', (nodes) => nodes.map((n) => n.getAttribute('id') || n.getAttribute('name') || 'form'));
  const tables = await page.$$eval('table', (nodes) => nodes.map((n, i) => n.getAttribute('id') || `table-${i + 1}`));

  const moduleDir = path.resolve(process.cwd(), `playwright/reports/${env.moduleName}`);
  fs.mkdirSync(moduleDir, { recursive: true });
  const screenshotPath = path.join(moduleDir, 'module-overview.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const output = {
    generatedAt: new Date().toISOString(),
    module: env.moduleName,
    url: page.url(),
    screenCandidates: [
      {
        title: await page.title(),
        route: new URL(page.url()).pathname,
        forms,
        tables
      }
    ],
    actionCandidates: Array.from(new Set(buttons))
  };

  fs.writeFileSync(path.join(moduleDir, 'module-crawl.json'), JSON.stringify(output, null, 2));
  await context.close();
});
