import { test, expect, type Locator, type Page } from '@playwright/test';

type BossFightSetup = { modal: Locator; panel: Locator };

const openLoadoutModal = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: /Open loadout configuration/i }).click();
  const modal = page.getByRole('dialog', { name: 'Player Loadout' });
  await expect(modal).toBeVisible();
  return modal;
};

const closeLoadoutModal = async (modal: Locator) => {
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(modal).not.toBeVisible();
};

const openBossFightSetup = async (page: Page): Promise<BossFightSetup> => {
  const modal = await openLoadoutModal(page);
  const bossFightTab = modal.getByRole('tab', { name: 'Boss Fight' });
  await bossFightTab.scrollIntoViewIfNeeded();
  await bossFightTab.click({ force: true });
  await expect(bossFightTab).toHaveAttribute('aria-selected', 'true');

  const panel = modal.locator('.boss-config');
  await expect(panel).toBeVisible();
  return { modal, panel };
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

    const { modal, panel } = await openBossFightSetup(page);
    await panel.getByRole('radio', { name: 'Custom target' }).click();
    await closeLoadoutModal(modal);

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

    const reopened = await openBossFightSetup(page);
    await reopened.panel.getByRole('radio', { name: 'False Knight' }).click();
    await closeLoadoutModal(reopened.modal);

    await expect(page.getByText(/Target: False Knight/i)).toBeVisible();
    await expect(nailStrikeEntries).toHaveCount(0);

    await recordNailStrike(page);
    await expect(getCombatHistory().getByText('Nail Strike')).toHaveCount(1);
  });
});
