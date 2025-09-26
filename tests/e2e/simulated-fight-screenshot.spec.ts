import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  E2E_SCENARIO_QUERY_KEY,
  SIMULATED_FIGHT_EXPECTED_ATTACKS,
  SIMULATED_FIGHT_EXPECTED_TOTAL_DAMAGE,
  SIMULATED_FIGHT_SCENARIO_ID,
  getScenarioFightState,
} from '../../src/features/fight-state/testScenarios';

const screenshotDirectory = path.resolve('test-results/simulated-fight');

if (!getScenarioFightState(SIMULATED_FIGHT_SCENARIO_ID)) {
  throw new Error(
    `Unable to load scenario "${SIMULATED_FIGHT_SCENARIO_ID}" for deterministic screenshots`,
  );
}

test.describe('Simulated fight screenshot', () => {
  test('captures a deterministic combat overview', async ({ page }, testInfo) => {
    const scenarioUrl = `/?${E2E_SCENARIO_QUERY_KEY}=${SIMULATED_FIGHT_SCENARIO_ID}`;
    await page.goto(scenarioUrl, { waitUntil: 'domcontentloaded' });

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
