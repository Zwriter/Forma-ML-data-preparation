import { expect, test } from '@playwright/test';

test('the active cell scrolls under the column headers, not over them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();

  const cell = page.getByRole('gridcell').nth(6 * 3 + 2);
  await cell.click();
  await expect(cell).toHaveAttribute('aria-selected', 'true');

  // Scroll like a user until the selected cell has passed under the sticky headers.
  const heading = page.locator('.table-wrap thead th').nth(3);
  await page.locator('.table-wrap tbody').hover();
  const headingBox = (await heading.boundingBox())!;
  for (let tick = 0; tick < 40; tick += 1) {
    const box = (await cell.boundingBox())!;
    if (box.y + box.height / 2 <= headingBox.y + headingBox.height / 2) break;
    // Small steps: the single header row is only 36px tall.
    await page.mouse.wheel(0, 10);
  }

  // Whatever is drawn at the middle of the hidden cell must be a header, not the cell.
  const box = (await cell.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(headingBox.y + headingBox.height);
  const covered = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('th') !== null,
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(covered).toBe(true);
});
