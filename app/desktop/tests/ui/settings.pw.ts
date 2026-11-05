import { expect, test } from '@playwright/test';

test('rows-per-page warning shows inside the setting at 800x600', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const field = page.getByRole('spinbutton', { name: 'Rows per page' });
  await expect(field).toHaveValue('500');
  await expect(page.getByRole('status')).toHaveCount(0);

  await field.fill('8000');
  const warning = page.getByRole('status');
  await expect(warning).toContainText('slow');

  // Fully readable inside its setting card, with no sideways page scroll.
  const card = (await page.locator('fieldset', { has: field }).boundingBox())!;
  const box = (await warning.boundingBox())!;
  expect(box.width).toBeGreaterThan(200);
  expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width);
  // A fieldset grows to fit its content, so also require the warning to fit the window.
  expect(box.x + box.width).toBeLessThanOrEqual(800);
  expect(card.width).toBeLessThanOrEqual(560);

  await field.press('Enter');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Rows per page' })).toHaveValue('8000');
});
