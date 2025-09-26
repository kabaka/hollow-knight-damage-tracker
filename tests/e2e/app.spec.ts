import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('displays the core sections', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Player Loadout' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Attack Log' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Combat Overview' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Encounter selection' })).toBeVisible();
  });

  test('restores build configuration and logs after a reload', async ({ page }) => {
    await page.goto('/');

    await page.selectOption('#boss-target', 'custom');
    const customTargetInput = page.locator('#custom-target-hp');
    await customTargetInput.fill('3333');

    await page.getByRole('button', { name: 'Player Loadout' }).click();

    const modal = page.getByRole('dialog', { name: 'Player Loadout' });
    await expect(modal).toBeVisible();

    await modal.locator('#nail-level').selectOption('pure-nail');
    await modal.getByRole('button', { name: 'Strength & Quick Slash' }).click();

    await modal.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Nail Strike' }).click();

    const attacksLoggedValue = page
      .locator('.data-list__item')
      .filter({ hasText: 'Attacks Logged' })
      .locator('.data-list__value');
    await expect(attacksLoggedValue).toHaveText('1');

    await page.reload();

    await expect(page.locator('#boss-target')).toHaveValue('custom');
    await expect(page.locator('#custom-target-hp')).toHaveValue('3333');

    await page.getByRole('button', { name: 'Player Loadout' }).click();
    const reopenedModal = page.getByRole('dialog', { name: 'Player Loadout' });
    await expect(reopenedModal).toBeVisible();

    await expect(reopenedModal.locator('#nail-level')).toHaveValue('pure-nail');
    await expect(
      reopenedModal.getByRole('button', { name: /^Unbreakable Strength/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      reopenedModal.getByRole('button', { name: /^Quick Slash/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    await reopenedModal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(attacksLoggedValue).toHaveText('1');
  });
});
