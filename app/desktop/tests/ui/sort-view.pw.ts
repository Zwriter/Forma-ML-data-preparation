import { expect, test, type Locator } from '@playwright/test';

async function expectReadable(heading: Locator) {
  const label = heading.locator('.column-sort');
  await expect(label).toBeVisible();
  const box = (await label.boundingBox())!;
  const cell = (await heading.boundingBox())!;
  // Fully inside its header and wide enough to read, not clipped to a sliver.
  expect(box.width).toBeGreaterThan(40);
  expect(box.height).toBeGreaterThan(8);
  expect(box.x + box.width).toBeLessThanOrEqual(cell.x + cell.width + 0.5);
}

test('sorted column headers show direction and priority at 800x600', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  // The browser demo reads the active sort from the URL (no engine in demo mode).
  await page.goto('/?demo-sort=region:descending,units:ascending');
  await page.getByRole('button', { name: 'Back to workspace' }).click();

  const region = page.getByRole('button', {
    name: 'Show details for region, sorted descending, priority 1',
  });
  const units = page.getByRole('button', {
    name: 'Show details for units, sorted ascending, priority 2',
  });
  await expect(region.locator('.column-sort')).toHaveText(/Descending 1/);
  await expectReadable(region);

  // Scroll the worksheet sideways like a user until the second sorted column is in view.
  await page.locator('.table-wrap').hover();
  for (let tick = 0; tick < 10 && !(await units.isVisible()); tick += 1) {
    await page.mouse.wheel(200, 0);
  }
  await expect(units.locator('.column-sort')).toHaveText(/Ascending 2/);
  await expectReadable(units);
});
