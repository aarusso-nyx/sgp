import playwright from '@playwright/test';

const { expect, test } = playwright;

import {
  bootRound5Admin,
  round5AdminAccessToken,
  waitForHit,
  type ApiHit,
} from '../support/round5-admin-playwright';

test('navigates the TCE queue and replays a failed submission', async ({ page }) => {
  const hits: ApiHit[] = [];
  await bootRound5Admin(page, { hits });

  await page.goto('/tce/queue');

  await expect(
    page.locator('#main-content').getByRole('heading', { name: 'Fila TCE' }),
  ).toBeVisible();
  const result = await page.evaluate(async (accessToken) => {
    const response = await fetch('/api/v1/tce/queue/tce-job-1/replay', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    return response.json();
  }, round5AdminAccessToken);
  expect(result).toMatchObject({ id: 'tce-job-1', status: 'RETRY' });

  const hit = await waitForHit(
    hits,
    (candidate) =>
      candidate.method === 'POST' && candidate.path === '/v1/tce/queue/tce-job-1/replay',
  );
  expect(hit.authorization).toBe(`Bearer ${round5AdminAccessToken}`);
});
