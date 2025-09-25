import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('displays the core sections', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Configure Your Build' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log Attacks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Combat Overview' })).toBeVisible();
  });

  test('restores build configuration and logs after a reload', async ({ page }) => {
    await page.goto('/');

    await page.selectOption('#boss-target', 'custom');
    const customTargetInput = page.locator('#custom-target-hp');
    await customTargetInput.fill('3333');

    await page.selectOption('#nail-level', 'pure-nail');
    await page.getByRole('button', { name: 'Strength & Quick Slash' }).click();
    await page.getByRole('button', { name: 'Nail Strike' }).click();

    const attacksLoggedValue = page
      .locator('.data-list__item')
      .filter({ hasText: 'Attacks Logged' })
      .locator('.data-list__value');
    await expect(attacksLoggedValue).toHaveText('1');

    await page.reload();

    await expect(page.locator('#boss-target')).toHaveValue('custom');
    await expect(customTargetInput).toHaveValue('3333');
    await expect(page.locator('#nail-level')).toHaveValue('pure-nail');
    await expect(page.locator('#charm-unbreakable-strength')).toBeChecked();
    await expect(page.locator('#charm-quick-slash')).toBeChecked();
    await expect(attacksLoggedValue).toHaveText('1');
  });
});
