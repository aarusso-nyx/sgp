import { expect, test } from '@playwright/test';

import { bootRound5Admin } from '../support/round5-admin-playwright';

test('navigates the concurso wizard and adds a seat row', async ({ page }) => {
  await bootRound5Admin(page);

  await page.goto('/recrutamento/concursos');

  await expect(page.getByRole('heading', { name: 'Concursos publicos' })).toBeVisible();
  await page.locator('input[name="code"]').fill('CP-2026');
  await page.locator('input[name="name"]').fill('Concurso publico e2e');
  await page.getByRole('button', { name: 'Avancar' }).click();
  await page.getByRole('button', { name: 'Adicionar vaga' }).click();

  await expect(page.locator('.seat-row')).toHaveCount(2);
});
