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
});
