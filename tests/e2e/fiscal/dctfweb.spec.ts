import playwright from '@playwright/test';

const { expect, test } = playwright;

import {
  bootRound5Admin,
  formControl,
  round5AdminAccessToken,
  waitForHit,
  type ApiHit,
} from '../support/round5-admin-playwright';

test('navigates DCTFWeb and generates a declaration for the selected competence', async ({
  page,
}) => {
  const hits: ApiHit[] = [];
  await bootRound5Admin(page, { hits });

  await page.goto('/fiscal/dctfweb');

  await expect(
    page.locator('#main-content').getByRole('heading', { name: 'DCTFWeb' }),
  ).toBeVisible();
  await formControl(page, 'year').fill('2026');
  await formControl(page, 'month').fill('5');
  await page.getByRole('button', { name: 'Gerar' }).click();

  const hit = await waitForHit(
    hits,
    (candidate) =>
      candidate.method === 'POST' && candidate.path === '/v1/admin/fiscal/dctfweb/gerar',
  );
  expect(hit.authorization).toBe(`Bearer ${round5AdminAccessToken}`);
  expect(hit.body).toMatchObject({ year: 2026, month: 5, kind: 'ORIGINAL' });
});
