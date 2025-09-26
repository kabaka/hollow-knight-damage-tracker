import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import type {
  AttackEvent,
  FightState,
} from '../../src/features/fight-state/FightStateContext';
import { STORAGE_KEY, STORAGE_VERSION } from '../../src/features/fight-state/persistence';

const SIMULATED_DAMAGE_LOG: AttackEvent[] = [
  {
    id: 'nail-strike',
    label: 'Nail Strike',
    damage: 32,
    category: 'nail',
    timestamp: 0,
  },
  {
    id: 'great-slash',
    label: 'Great Slash',
    damage: 79,
    category: 'advanced',
    timestamp: 2400,
  },
  {
    id: 'vengeful-spirit-shadeSoul',
    label: 'Shade Soul',
    damage: 40,
    category: 'spell',
    soulCost: 33,
    timestamp: 4100,
  },
  {
    id: 'cyclone-slash-hit',
    label: 'Cyclone Slash (Hit 1)',
    damage: 32,
    category: 'advanced',
    timestamp: 6300,
  },
  {
    id: 'cyclone-slash-hit',
    label: 'Cyclone Slash (Hit 2)',
    damage: 32,
    category: 'advanced',
    timestamp: 6650,
  },
  {
    id: 'cyclone-slash-hit',
    label: 'Cyclone Slash (Hit 3)',
    damage: 32,
    category: 'advanced',
    timestamp: 7000,
  },
  {
    id: 'desolate-dive-descendingDark',
    label: 'Descending Dark',
    damage: 91,
    category: 'spell',
    soulCost: 33,
    timestamp: 9400,
  },
  {
    id: 'nail-strike',
    label: 'Nail Strike',
    damage: 32,
    category: 'nail',
    timestamp: 11300,
  },
  {
    id: 'dash-slash',
    label: 'Dash Slash',
    damage: 63,
    category: 'advanced',
    timestamp: 13500,
  },
  {
    id: 'howling-wraiths-abyssShriek',
    label: 'Abyss Shriek',
    damage: 120,
    category: 'spell',
    soulCost: 33,
    timestamp: 16800,
  },
  {
    id: 'nail-strike',
    label: 'Nail Strike',
    damage: 32,
    category: 'nail',
    timestamp: 19100,
  },
  {
    id: 'nail-strike',
    label: 'Nail Strike',
    damage: 32,
    category: 'nail',
    timestamp: 21500,
  },
  {
    id: 'nail-strike',
    label: 'Nail Strike',
    damage: 32,
    category: 'nail',
    timestamp: 24200,
  },
];

const SIMULATED_STATE: FightState = {
  selectedBossId: 'the-radiance__standard',
  customTargetHp: 3000,
  build: {
    nailUpgradeId: 'pure-nail',
    activeCharmIds: ['unbreakable-strength', 'quick-slash', 'shaman-stone'],
    spellLevels: {
      'vengeful-spirit': 'upgrade',
      'desolate-dive': 'upgrade',
      'howling-wraiths': 'upgrade',
    },
    notchLimit: 11,
  },
  damageLog: SIMULATED_DAMAGE_LOG,
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceRedoStacks: {},
  sequenceConditions: {},
};

test.describe('Simulated fight screenshot', () => {
  test('captures a deterministic combat overview', async ({ page }, testInfo) => {
    const serializedState = JSON.stringify({
      version: STORAGE_VERSION,
      state: SIMULATED_STATE,
    });

    await page.addInitScript(
      ({ payload, storageKey }) => {
        try {
          const protocol = window.location.protocol;
          const isHttpOrigin = protocol === 'http:' || protocol === 'https:';
          if (!isHttpOrigin) {
            return;
          }

          window.localStorage.clear();
          window.localStorage.setItem(storageKey, payload);
        } catch {
          // Ignore storage access errors on about:blank or restricted contexts.
        }
      },
      {
        payload: serializedState,
        storageKey: STORAGE_KEY,
      },
    );

    await page.goto('/');

    const heading = page.getByRole('heading', {
      name: 'Hollow Knight Damage Tracker',
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByText('Damage Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText('649', { timeout: 15_000 });
    await expect(
      page.getByText('Attacks Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText('13', { timeout: 15_000 });

    const screenshotDirectory = path.resolve('test-results/simulated-fight');
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
