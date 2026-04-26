const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './playwright/tests',
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  reporter: [['list']]
});
