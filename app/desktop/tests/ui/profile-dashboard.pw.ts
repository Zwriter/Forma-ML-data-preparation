import { expect, test, type Locator, type Page } from '@playwright/test';

async function openProfile(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await page.getByRole('navigation').getByText('Profile', { exact: true }).click();
  // Demo mode answers the automatic profile run with the fixture profile at once.
  await expect(page.getByRole('list', { name: 'Dataset summary' })).toBeVisible();
}

/** How many items share the first item's row. */
async function perRow(items: Locator) {
  const tops = await items.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
  );
  return tops.filter((top) => top === tops[0]).length;
}

for (const [width, expected] of [
  [1440, 4],
  [1024, 2],
  [700, 1],
] as const) {
  test(`summary cards and panels show ${expected} per row at ${width}px`, async ({ page }) => {
    await openProfile(page, width);

    await expect.poll(() => perRow(page.locator('.summary-card'))).toBe(expected);
    await expect.poll(() => perRow(page.locator('.profile-panel'))).toBe(expected);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
