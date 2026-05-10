import playwright from '@playwright/test';

const { defineConfig, devices } = playwright;

const port = Number(process.env['SGP_PORTAL_E2E_PORT'] ?? '4310');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './frontend/portal',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  reporter: [['list']],
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm --workspace frontend run start:portal -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
