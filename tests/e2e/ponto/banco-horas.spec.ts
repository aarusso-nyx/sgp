import playwright from '@playwright/test';

const { expect, test } = playwright;

import {
  bootRound5Admin,
  formControl,
  waitForHit,
  type ApiHit,
} from '../support/round5-admin-playwright';

test('navigates the hour bank workspace and records a manual adjustment', async ({ page }) => {
  const hits: ApiHit[] = [];
  await bootRound5Admin(page, { hits });

  await page.goto('/ponto/banco-horas');

  await expect(
    page.locator('#main-content').getByRole('heading', { name: 'Banco de horas' }),
  ).toBeVisible();
  await expect(page.getByText('11111111-1111-4111-8111-111111111111')).toBeVisible();
  await formControl(page, 'hourBankId').fill('hb-2026-05');
  await formControl(page, 'workDate').fill('2026-05-04');
  await formControl(page, 'minutes').fill('45');
  await page.getByRole('button', { name: 'Registrar' }).click();

  const hit = await waitForHit(
    hits,
    (candidate) =>
      candidate.method === 'POST' && candidate.path === '/v1/ponto/banco-horas/ajuste-manual',
  );
  expect(hit.body).toMatchObject({
    hourBankId: 'hb-2026-05',
    workDate: '2026-05-04',
    minutes: 45,
  });
});
