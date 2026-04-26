const fs = require('node:fs');
const path = require('node:path');

async function maybeLogin(page, creds) {
  await page.goto(creds.baseUrl, { waitUntil: 'domcontentloaded' });

  const passwordField = page.locator('input[type="password"]').first();
  const hasPasswordField = await passwordField.isVisible().catch(() => false);
  if (!hasPasswordField) return;

  const loginField = page
    .locator(
      'input[type="email"], input[name*="user" i], input[name*="login" i], input[id*="user" i], input[id*="login" i], input[type="text"]'
    )
    .first();

  if (await loginField.isVisible().catch(() => false)) {
    await loginField.fill(creds.login);
  }

  await passwordField.fill(creds.password);

  const submit = page
    .locator(
      'button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Entrar")'
    )
    .first();

  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
  } else {
    await passwordField.press('Enter').catch(() => {});
  }

  await page.waitForLoadState('networkidle').catch(() => {});
}

async function saveStorageState(context) {
  const storagePath = path.resolve(process.cwd(), 'playwright/auth/storage-state.json');
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  await context.storageState({ path: storagePath });
}

module.exports = {
  maybeLogin,
  saveStorageState
};
