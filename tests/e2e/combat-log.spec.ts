import { test, expect, type Page } from '@playwright/test';

const openEncounterSetup = async (page: Page) => {
  await page.getByRole('button', { name: 'Change Encounter' }).click();
  const panel = page.locator('#encounter-setup');
  await expect(panel).toBeVisible();
  return panel;
};

const closeEncounterSetup = async (page: Page) => {
  await page.getByRole('button', { name: 'Change Encounter' }).click();
  await expect(page.locator('#encounter-setup')).toBeHidden();
};

const recordNailStrike = async (page: Page) => {
  await page.locator("[data-attack-id='nail-strike']").click();
};

test.describe('Combat log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('persists history, clears cleanly, and ignores per-boss caches', async ({
    page,
  }) => {
    await expect(page.getByText(/Target:/i)).toBeVisible();

    await recordNailStrike(page);
    const getCombatHistory = () => page.getByRole('log', { name: 'Combat history' });
    await expect(getCombatHistory().getByText('Nail Strike')).toHaveCount(1);

    const setupPanel = await openEncounterSetup(page);
    await setupPanel.getByRole('radio', { name: 'Custom target' }).click();
    await closeEncounterSetup(page);

    await expect(page.getByText(/Target: Custom target/i)).toBeVisible();

    await recordNailStrike(page);
    await expect(getCombatHistory().getByText('Nail Strike')).toHaveCount(2);

    await page.reload({ waitUntil: 'networkidle' });

    await expect(getCombatHistory().getByText('Nail Strike')).toHaveCount(2);
    await expect(page.getByText(/Target: Custom target/i)).toBeVisible();

    await page.getByRole('button', { name: 'Clear combat log' }).click();

    const nailStrikeEntries = getCombatHistory().getByText('Nail Strike');
    await expect(nailStrikeEntries).toHaveCount(0);
    await expect(page.locator('.combat-log__entry')).toHaveCount(1);

    const reopenPanel = await openEncounterSetup(page);
    await reopenPanel.getByRole('radio', { name: 'False Knight' }).click();
    await closeEncounterSetup(page);

    await expect(page.getByText(/Target: False Knight/i)).toBeVisible();
    await expect(nailStrikeEntries).toHaveCount(0);

    await recordNailStrike(page);
    await expect(getCombatHistory().getByText('Nail Strike')).toHaveCount(1);
  });
});
