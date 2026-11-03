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
