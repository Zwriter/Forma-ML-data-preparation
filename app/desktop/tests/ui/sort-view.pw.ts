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

test('header sort arrows are visible, inside the header, and on top at 800x600', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/?demo-sort=region:descending');
  await page.getByRole('button', { name: 'Back to workspace' }).click();

  const heading = page.locator('.table-wrap thead tr:nth-child(2) th').nth(2);
  for (const name of ['Sort region ascending', 'Sort region descending']) {
    const arrow = page.getByRole('button', { name });
    await expect(arrow).toBeVisible();
    const box = (await arrow.boundingBox())!;
    const cell = (await heading.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(16);
    expect(box.x + box.width).toBeLessThanOrEqual(cell.x + cell.width);
    expect(box.y).toBeGreaterThanOrEqual(cell.y);
    expect(box.y + box.height).toBeLessThanOrEqual(cell.y + cell.height);
    // Beside the column name, not pushed below it: the header keeps its normal height.
    const title = (await heading.locator('.column-heading strong').boundingBox())!;
    expect(cell.height).toBeLessThan(80);
    expect(box.x).toBeGreaterThanOrEqual(title.x + title.width);
    const onTop = await page.evaluate(
      ([x, y, label]) => document.elementFromPoint(x, y)?.closest('button')?.ariaLabel === label,
      [box.x + box.width / 2, box.y + box.height / 2, name] as const,
    );
    expect(onTop).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Sort region descending' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
