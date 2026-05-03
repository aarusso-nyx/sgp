import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['SGP_ADMIN_E2E_PORT'] ?? '4210');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/frontend/admin',
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
    command: `npm --workspace frontend run start:admin -- --host 127.0.0.1 --port ${port}`,
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
