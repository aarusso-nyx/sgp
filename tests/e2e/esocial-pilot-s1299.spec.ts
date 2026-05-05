import { expect, test } from '@playwright/test';

import { bootRound5Admin, type ApiHit, waitForHit } from './support/round5-admin-playwright';

test('keeps the eSocial pilot UI on SGP backend routes only', async ({ page }) => {
  const hits: ApiHit[] = [];
  const observedUrls: string[] = [];
  page.on('request', (request) => observedUrls.push(request.url()));

  await bootRound5Admin(page, { hits });
  await page.goto('/esocial/fechamento');

  await expect(page.getByRole('heading', { name: 'Pendencias S-1200/S-1210' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Totalizadores S-5xxx' })).toBeVisible();
  await waitForHit(hits, (hit) => hit.method === 'GET' && hit.path === '/v1/esocial/fechamento');

  expect(observedUrls.some((url) => /stynx-esocial/i.test(url))).toBe(false);
  expect(hits.every((hit) => hit.path.startsWith('/v1/'))).toBe(true);
});
