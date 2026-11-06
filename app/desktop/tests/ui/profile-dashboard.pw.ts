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
  [1180, 4],
  [900, 2],
  [600, 1],
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

test('the columns table scrolls inside its region with a sticky header', async ({ page }) => {
  await openProfile(page, 600);
  const wrap = page.locator('.profile-table-wrap');
  const header = page.getByRole('columnheader', { name: 'Column name' });

  // Scroll like a user: wheel over the table, not scrollIntoView.
  await wrap.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => wrap.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  const [wrapBox, headerBox] = [await wrap.boundingBox(), await header.boundingBox()];
  expect(Math.abs(headerBox!.y - wrapBox!.y)).toBeLessThanOrEqual(2);

  // Wide tables scroll sideways inside the region, never the page.
  const sideways = await wrap.evaluate((node) => node.scrollWidth > node.clientWidth);
  expect(sideways).toBe(true);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('table controls work from the keyboard and Escape returns focus', async ({ page }) => {
  await openProfile(page, 1440);
  await page.getByRole('searchbox', { name: 'Search columns' }).focus();

  for (const name of ['Type filter', 'Quality filter']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  const settings = page.getByRole('button', { name: 'Table settings' });
  await expect(settings).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitemcheckbox', { name: 'Type' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(settings).toBeFocused();

  const actions = page.getByRole('button', { name: 'Actions for customerID' });
  await actions.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Copy column name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(actions).toBeFocused();
});

for (const [width, height] of [
  [1920, 1040],
  [1536, 816],
  [1180, 820],
] as const) {
  test(`the dashboard fits ${width}x${height} with only the table scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.getByRole('button', { name: 'Back to workspace' }).click();
    await page.getByRole('navigation').getByText('Profile', { exact: true }).click();
    await expect(page.getByRole('table', { name: 'Column profiles' })).toBeVisible();

    await expect(page.locator('.dataset-heading')).toHaveCount(0);
    // Every scrollable box except the columns table must have nothing left to scroll.
    const scrollers = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((node) => {
          const style = getComputedStyle(node);
          return (
            /auto|scroll/.test(style.overflowY) &&
            node.scrollHeight > node.clientHeight + 1 &&
            !node.classList.contains('profile-table-wrap')
          );
        })
        .map((node) => node.className || node.tagName),
    );
    expect(scrollers).toEqual([]);
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);
    // The table keeps room for several rows and ends inside the window.
    const table = (await page.locator('.profile-table-wrap').boundingBox())!;
    expect(table.height).toBeGreaterThanOrEqual(140);
    expect(table.y + table.height).toBeLessThanOrEqual(height);
    // ...and uses the spare height instead of leaving a gap under the dashboard.
    expect(height - (table.y + table.height)).toBeLessThan(60);
  });
}

test('no tab shows a dataset heading or breadcrumb', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  for (const tab of ['Data', 'Clean', 'Profile', 'Pipelines', 'Export']) {
    await page.getByRole('navigation').getByText(tab, { exact: true }).click();
    await expect(page.getByText(/Datasets\s*›/)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  }
});

test('the dashboard sits flush with the ribbon and window edges', async ({ page }) => {
  await openProfile(page, 1180);
  const [body, dashboard] = await Promise.all([
    page.locator('.workspace-body').boundingBox(),
    page.locator('.profile-dashboard').boundingBox(),
  ]);
  expect(dashboard).toEqual(body);
});

test('the table frame runs to the Columns card edges', async ({ page }) => {
  await openProfile(page, 1180);
  const [card, frame] = await Promise.all([
    page.locator('.profile-columns').boundingBox(),
    page.locator('.profile-table-wrap').boundingBox(),
  ]);
  const border = 1;
  expect(frame!.x).toBeCloseTo(card!.x + border, 0);
  expect(frame!.x + frame!.width).toBeCloseTo(card!.x + card!.width - border, 0);
  expect(frame!.y + frame!.height).toBeCloseTo(card!.y + card!.height - border, 0);
});

test('chart panels touch, split by inset lines, with the Columns card attached below', async ({
  page,
}) => {
  await openProfile(page, 1180);
  const panels = page.locator('.profile-panel');
  const boxes = await panels.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().toJSON()),
  );
  for (let i = 1; i < boxes.length; i += 1)
    expect(boxes[i].x).toBeCloseTo(boxes[i - 1].x + boxes[i - 1].width, 0);

  const lines = await panels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const line = getComputedStyle(node, '::before');
      return {
        shown: line.content !== 'none',
        top: parseFloat(line.top),
        bottom: parseFloat(line.bottom),
      };
    }),
  );
  expect(lines[0].shown).toBe(false);
  for (const line of lines.slice(1)) {
    expect(line.shown).toBe(true);
    expect(line.top).toBeGreaterThan(0);
    expect(line.bottom).toBeGreaterThan(0);
  }

  const row = (await page.locator('.profile-panels').boundingBox())!;
  const columns = (await page.locator('.profile-columns').boundingBox())!;
  expect(columns.y).toBeLessThanOrEqual(row.y + row.height);
});

test('summary cards touch, split by inset lines, with the chart strip attached below', async ({
  page,
}) => {
  await openProfile(page, 1180);
  const cards = page.locator('.summary-card');
  const boxes = await cards.evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().toJSON()),
  );
  for (let i = 1; i < boxes.length; i += 1)
    expect(boxes[i].x).toBeCloseTo(boxes[i - 1].x + boxes[i - 1].width, 0);

  const lines = await cards.evaluateAll((nodes) =>
    nodes.map((node) => {
      const line = getComputedStyle(node, '::before');
      return {
        shown: line.content !== 'none',
        top: parseFloat(line.top),
        bottom: parseFloat(line.bottom),
      };
    }),
  );
  expect(lines[0].shown).toBe(false);
  for (const line of lines.slice(1)) {
    expect(line.shown).toBe(true);
    expect(line.top).toBeGreaterThan(0);
    expect(line.bottom).toBeGreaterThan(0);
  }

  const summary = (await page.locator('.profile-summary').boundingBox())!;
  const panels = (await page.locator('.profile-panels').boundingBox())!;
  expect(panels.y).toBeLessThanOrEqual(summary.y + summary.height);
});
