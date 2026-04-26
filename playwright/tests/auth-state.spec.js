const { test } = require('@playwright/test');
const { getRequiredEnv } = require('../support/env');
const { maybeLogin, saveStorageState } = require('../support/auth');

test('authenticate and save storage state', async ({ browser }) => {
  const env = getRequiredEnv();
  const context = await browser.newContext();
  const page = await context.newPage();

  await maybeLogin(page, env);
  await saveStorageState(context);

  await context.close();
});
