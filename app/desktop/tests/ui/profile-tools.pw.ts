import { expect, test, type Page } from '@playwright/test';

const TOOLS = [
  'Column details',
  'Data quality',
  'Distribution',
  'Duplicates',
  'Patterns',
  'Anomalies',
  'Recommendations',
  'Creations',
];

/** Boxes allowed to scroll inside a tool: its own grids, lists, and side panels. */
const OWN_SCROLLERS = ['tool-table-wrap', 'suggestion-list', 'tool-panel'];

async function openTool(page: Page, command: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await page.getByRole('navigation').getByText('Profile', { exact: true }).click();
  await expect(page.getByRole('list', { name: 'Dataset summary' })).toBeVisible();
  const ribbon = page.getByRole('region', { name: 'Profile toolbar' });
  await ribbon.getByRole('button', { name: command, exact: true }).click();
  const region = page.getByRole('region', { name: command, exact: true });
  // Demo mode answers tool requests at once; wait for the result, not the loader.
  await expect(region.getByText('Loading results…')).toHaveCount(0);
  return region;
}

/** Class names of boxes, other than the tool's own, that still have content to scroll. */
const strayScrollers = (page: Page) =>
  page.evaluate(
    (own) =>
      [...document.querySelectorAll('*')]
        .filter((node) => {
          const style = getComputedStyle(node);
          const scrolls =
            (/auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) ||
            (/auto|scroll/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1);
          return scrolls && !own.some((name) => node.classList.contains(name));
        })
        .map((node) => node.className || node.tagName),
    OWN_SCROLLERS,
  );

const pageOverflow = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollHeight - root.clientHeight, root.scrollWidth - root.clientWidth);
  });

for (const [width, height] of [
  [1920, 1040],
  [1536, 816],
  [1180, 820],
] as const) {
  test(`every tool fits ${width}x${height} with only its own list or grid scrolling`, async ({
    page,
  }) => {
    for (const tool of TOOLS) {
      const region = await openTool(page, tool, width, height);
      expect(await strayScrollers(page), tool).toEqual([]);
      expect(await pageOverflow(page), tool).toBeLessThanOrEqual(0);
      const box = (await region.boundingBox())!;
      expect(box.y + box.height, tool).toBeLessThanOrEqual(height);
    }
  });
}

test('a long suggestion list scrolls inside the tool, not the page', async ({ page }) => {
  const region = await openTool(page, 'Recommendations', 900, 560);
  const list = region.getByRole('list', { name: 'Recommendations' });
  expect(await list.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  await list.hover();
  await page.mouse.wheel(0, 300);
  await expect.poll(() => list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect(await strayScrollers(page)).toEqual([]);
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
});

for (const width of [900, 600]) {
  test(`tools reflow at ${width}px without sideways page scrolling`, async ({ page }) => {
    for (const tool of TOOLS) {
      await openTool(page, tool, width);
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(sideways, tool).toBeLessThanOrEqual(0);
    }
    // Two-panel tools stack their panels once the area is narrow.
    const region = await openTool(page, 'Patterns', width);
    const tops = await region
      .locator('.tool-split > .tool-panel')
      .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(width === 600 ? 2 : 1);
  });
}

test('every control in every tool has an accessible name', async ({ page }) => {
  for (const tool of TOOLS) {
    const region = await openTool(page, tool, 1536);
    const focusable = region.locator('button, select, input, [tabindex]');
    expect(await focusable.count(), tool).toBeGreaterThan(0);
    for (const control of await focusable.all())
      await expect(control, tool).toHaveAccessibleName(/\S/);
  }
});

test.describe('keyboard', () => {
  test('Next problem moves focus between marked cells', async ({ page }) => {
    const region = await openTool(page, 'Data quality', 1536);
    const next = region.getByRole('button', { name: 'Next problem' });
    await next.focus();
    await page.keyboard.press('Enter');
    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('data-problem');
    await focused.evaluate((node) => node.setAttribute('data-visited', ''));

    await next.focus();
    await page.keyboard.press('Enter');
    await expect(focused).toHaveAttribute('data-problem');
    await expect(focused).not.toHaveAttribute('data-visited', '');
  });

  test('the Bars radio group moves with the arrow keys', async ({ page }) => {
    const region = await openTool(page, 'Distribution', 1536);
    const bars = region.getByRole('radiogroup', { name: 'Bars' });
    await bars.getByRole('radio', { name: '30' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(bars.getByRole('radio', { name: '50' })).toBeChecked();
    await expect(bars.getByRole('radio', { name: '50' })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(bars.getByRole('radio', { name: '30' })).toBeChecked();
  });

  test('the correlation table is reached with Tab and scrolls with the arrow keys', async ({
    page,
  }) => {
    const region = await openTool(page, 'Patterns', 1180, 820);
    const wrap = region.getByRole('region', { name: 'Correlations, scrollable' });
    await region.getByRole('button', { name: 'Back to dashboard' }).focus();
    let reached = false;
    for (let step = 0; step < 6 && !reached; step++) {
      await page.keyboard.press('Tab');
      reached = await wrap.evaluate((node) => node === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => wrap.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  });

  test('Add step works from the keyboard and keeps focus on the card', async ({ page }) => {
    const region = await openTool(page, 'Recommendations', 1536);
    const card = region.getByRole('article').first();
    const add = card.getByRole('button', { name: 'Add step' });
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(card.getByRole('button', { name: 'Added' })).toBeVisible();
    await expect(page.getByText(/^Added ".+" to Clean steps\.$/)).toBeVisible();
    // Focus stays inside the card, so the next Tab continues from there.
    expect(await card.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  });
});
