import { expect, test, type Page } from '@playwright/test';

const stepTitles = [
  'Fill missing values',
  'Replace values',
  'Remove duplicate rows',
  'Split column',
  'Merge columns',
  'Rename columns',
];

async function openCleanTab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Back to workspace' }).click();
  await page.getByRole('link', { name: 'Clean' }).click();
}

async function addStep(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add step' }).click();
  await page.getByRole('menuitem', { name: title }).click();
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Add step' }).click();
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 800, height: 600 },
]) {
  test(`steps and footer stay reachable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openCleanTab(page);
    for (const title of stepTitles) await addStep(page, title);

    const steps = page.getByRole('list', { name: 'Cleaning steps' }).getByRole('listitem');
    await expect(steps).toHaveCount(stepTitles.length);

    const apply = page.getByRole('button', { name: `Apply ${stepTitles.length} steps` });
    // Scroll like a user: scrollIntoView would also move overflow-hidden containers.
    await steps.first().hover();
    await page.mouse.wheel(0, 2000);
    await expect(apply).toBeInViewport();

    const card = await steps.first().boundingBox();
    const title = await steps.first().getByText(stepTitles[0]).boundingBox();
    expect(title!.x - card!.x).toBeLessThan(80);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('Add step menu and step form work from the keyboard', async ({ page }) => {
  await openCleanTab(page);
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
  await expect(dialog.getByRole('button', { name: 'Add step' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});
