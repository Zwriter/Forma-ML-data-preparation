import { expect, test, type Page } from '@playwright/test';

// Clean ribbon command and the step form it opens.
const steps: [command: string, title: string][] = [
  ['Fill', 'Fill missing values'],
  ['Replace', 'Replace values'],
  ['Remove', 'Remove duplicate rows'],
  ['Split', 'Split column'],
  ['Merge', 'Merge columns'],
  ['Rename', 'Rename columns'],
];

async function openCleanTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await page.getByRole('link', { name: 'Clean' }).click();
}

async function addStep(page: Page, command: string, title: string) {
  await page.getByRole('button', { name: command, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: title });
  if (title === 'Fill missing values') await dialog.getByLabel('Value', { exact: true }).fill('0');
  if (title === 'Rename columns') await dialog.getByLabel('New name').fill('area');
  const submit = dialog.getByRole('button', { name: 'Add step' });
  await expect(submit).toBeInViewport();
  await submit.click();
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 800, height: 600 },
]) {
  test(`worksheet fills the space and the steps panel fits at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Back to workspace' }).click();
    const dataHeight = (await page.locator('.table-wrap').boundingBox())!.height;
    await page.getByRole('link', { name: 'Clean' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Cleaning steps' })).toHaveCount(0);

    for (const [command, title] of steps) await addStep(page, command, title);
    const panel = page.getByRole('complementary', { name: 'Cleaning steps' });
    const cards = panel.getByRole('listitem');
    await expect(cards).toHaveCount(steps.length);

    // Scroll like a user: scrollIntoView would also move overflow-hidden containers.
    await cards.first().hover();
    await page.mouse.wheel(0, 2000);
    await expect(cards.last()).toBeInViewport();
    await expect(
      panel.getByRole('button', { name: `Apply ${steps.length} steps` }),
    ).toBeInViewport();
    await expect(panel.getByRole('button', { name: 'Cancel' })).toBeInViewport();
    // Nothing below the worksheet: it is as tall in Clean as in Data.
    expect((await page.locator('.table-wrap').boundingBox())!.height).toBe(dataHeight);

    const card = await cards.first().boundingBox();
    const cardTitle = await cards.first().getByText(steps[0][1]).boundingBox();
    expect(cardTitle!.x - card!.x).toBeLessThan(80);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('steps panel collapses to an edge tab and reopens from the keyboard', async ({ page }) => {
  await openCleanTab(page);
  await addStep(page, 'Remove', 'Remove duplicate rows');
  const panel = page.getByRole('complementary', { name: 'Cleaning steps' });
  const before = await page.locator('.table-wrap').boundingBox();

  await page.getByRole('button', { name: 'Collapse steps panel' }).click();
  await expect(panel).toBeHidden();
  const tab = page.getByRole('button', { name: 'Show 1 cleaning steps' });
  await expect(tab).toBeInViewport();
  // The worksheet stays full width under the floating panel.
  expect((await page.locator('.table-wrap').boundingBox())!.width).toBe(before!.width);

  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
});

test('Add step menu and step form work from the keyboard', async ({ page }) => {
  await openCleanTab(page);
  await addStep(page, 'Remove', 'Remove duplicate rows');
  const trigger = page.getByRole('button', { name: 'Add step' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const items = page.getByRole('menuitem');
  await expect(items.first()).toBeFocused();

  await page.keyboard.press('ArrowUp');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();

  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Replace values' });
  await expect(dialog.getByRole('checkbox').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('step switch and step menu work from the keyboard and are not clipped', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openCleanTab(page);
  for (const [command, title] of steps.slice(2)) await addStep(page, command, title);

  const toggle = page.getByRole('switch', { name: 'Enable step 1' });
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  const last = steps.slice(2).length;
  const list = page.getByRole('complementary').getByRole('list');
  const trigger = page.getByRole('button', { name: `Actions for step ${last}` });
  await trigger.hover();
  const scrolled = await list.evaluate((element) => element.scrollTop);
  await trigger.click();
  // The whole menu must show on top without the list scrolling (mouse users).
  for (const action of ['Edit', 'Delete']) {
    const box = (await page.getByRole('menuitem', { name: action }).boundingBox())!;
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="menuitem"]')?.textContent,
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hit).toBe(action);
  }
  expect(await list.evaluate((element) => element.scrollTop)).toBe(scrolled);

  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary').getByRole('listitem')).toHaveCount(last - 1);
});

test('narrow window shows change markers and the panel collapses to an edge tab', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openCleanTab(page);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Replace values' });
  await dialog.getByLabel('date', { exact: true }).uncheck();
  await dialog.getByLabel('region', { exact: true }).check();
  await dialog.getByLabel('Find').fill('North');
  await dialog.getByLabel('Replace with', { exact: true }).fill('N');
  await dialog.getByRole('button', { name: 'Add step' }).click();

  // Marked by colour and by screen-reader text, never colour alone.
  const changed = page.locator('td.cell-changed');
  await expect(changed.first()).toHaveText('North → changed to N');
  await expect(changed.first()).toBeInViewport();
  // The open panel must not cover the left of the worksheet where the marked column is.
  const box = (await changed.first().boundingBox())!;
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('td')?.textContent,
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit).toBe('North → changed to N');

  await page.getByRole('button', { name: 'Collapse steps panel' }).click();
  await expect(page.getByRole('button', { name: 'Show 1 cleaning steps' })).toBeInViewport();
  await expect(changed.first()).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});

test('Clean step form and steps panel share the Data popup styling', async ({ page }) => {
  const frame = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.borderColor, style.borderRadius, style.boxShadow, style.padding].join('|');
    });
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await page.getByRole('button', { name: 'Sort', exact: true }).click();
  const data = await frame('[role="dialog"]');
  const dataButton = await page
    .getByRole('button', { name: 'Apply sort' })
    .evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.getByRole('link', { name: 'Clean' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  expect(await frame('[role="dialog"]')).toBe(data);
  const add = page.getByRole('button', { name: 'Add step' });
  expect(await add.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    dataButton,
  );
  await add.click();
  expect(await frame('.steps-panel')).toBe(data);
});

test('Clean ribbon buttons toggle their step form like the Data ribbon', async ({ page }) => {
  await openCleanTab(page);
  const replace = page.getByRole('button', { name: 'Replace', exact: true });
  await replace.click();
  await expect(page.getByRole('dialog', { name: 'Replace values' })).toBeVisible();
  await expect(replace).toHaveAttribute('aria-pressed', 'true');

  await replace.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(replace).toHaveAttribute('aria-pressed', 'false');

  // Switching commands opens the other form with its own fields.
  await replace.click();
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  const fill = page.getByRole('dialog', { name: 'Fill missing values' });
  await expect(fill.getByLabel('Fill with')).toBeVisible();
  await expect(replace).toHaveAttribute('aria-pressed', 'false');
});
