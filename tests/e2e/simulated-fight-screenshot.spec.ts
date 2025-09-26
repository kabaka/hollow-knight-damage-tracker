import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type StorageState } from '@playwright/test';

import {
  SIMULATED_FIGHT_EXPECTED_ATTACKS,
  SIMULATED_FIGHT_EXPECTED_TOTAL_DAMAGE,
  SIMULATED_FIGHT_SCENARIO_ID,
  getScenarioFightState,
} from '../../src/features/fight-state/testScenarios';
import { STORAGE_KEY, STORAGE_VERSION } from '../../src/features/fight-state/persistence';
import {
  ensureSequenceState,
  ensureSpellLevels,
} from '../../src/features/fight-state/fightReducer';

const screenshotDirectory = path.resolve('test-results/simulated-fight');

const scenarioState = getScenarioFightState(SIMULATED_FIGHT_SCENARIO_ID);

if (!scenarioState) {
  throw new Error(
    `Unable to load scenario "${SIMULATED_FIGHT_SCENARIO_ID}" for deterministic screenshots`,
  );
}

const sanitizedScenarioState = ensureSequenceState(ensureSpellLevels(scenarioState));

const storageState: StorageState = {
  origins: [
    {
      origin: 'http://127.0.0.1:4173',
      localStorage: [
        {
          name: STORAGE_KEY,
          value: JSON.stringify({
            version: STORAGE_VERSION,
            state: sanitizedScenarioState,
          }),
        },
      ],
    },
  ],
};

test.use({ storageState });

test.describe('Simulated fight screenshot', () => {
  test('captures a deterministic combat overview', async ({ page }, testInfo) => {
    await page.goto('/');

    const heading = page.getByRole('heading', {
      name: 'Hollow Knight Damage Tracker',
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText('Damage Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText(String(SIMULATED_FIGHT_EXPECTED_TOTAL_DAMAGE), { timeout: 15_000 });
    await expect(
      page.getByText('Attacks Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText(String(SIMULATED_FIGHT_EXPECTED_ATTACKS), { timeout: 15_000 });

    await mkdir(screenshotDirectory, { recursive: true });

    const screenshotPath = path.join(
      screenshotDirectory,
      `${testInfo.project.name}-simulated-fight.png`,
    );

    const screenshot = await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled',
    });

    await testInfo.attach(`simulated-fight-${testInfo.project.name}`, {
      body: screenshot,
      contentType: 'image/png',
    });
  });
});
