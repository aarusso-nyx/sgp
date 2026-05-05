import { expect, test } from '@playwright/test';

import { bootRound5Admin, waitForHit, type ApiHit } from '../support/round5-admin-playwright';

test('navigates eSocial initial tables and re-emits the delta', async ({ page }) => {
  const hits: ApiHit[] = [];
  await bootRound5Admin(page, { hits });

  await page.goto('/esocial/tabelas');

  await expect(page.getByRole('heading', { name: 'Tabelas iniciais' })).toBeVisible();
  await expect(page.getByText('S-1000').first()).toBeVisible();
  await page.getByRole('button', { name: 'Re-emitir delta' }).first().click();

  const hit = await waitForHit(
    hits,
    (candidate) =>
      candidate.method === 'POST' && candidate.path === '/v1/esocial/tabelas-iniciais/emitir',
  );
  expect(hit.authorization).toBe('Bearer admin-round5-token');
  expect(hit.body).toMatchObject({ force: true });
});
