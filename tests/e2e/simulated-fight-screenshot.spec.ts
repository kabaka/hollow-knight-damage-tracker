import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { test, expect } from '@playwright/test';

type AttackCategory = 'nail' | 'spell' | 'advanced' | 'charm';

type AttackEvent = {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  timestamp: number;
  soulCost?: number;
};

type PersistedFightState = {
  selectedBossId: string;
  customTargetHp: number;
  build: {
    nailUpgradeId: string;
    activeCharmIds: string[];
    spellLevels: Record<string, 'none' | 'base' | 'upgrade'>;
    notchLimit: number;
  };
  damageLog: AttackEvent[];
  redoStack: AttackEvent[];
  activeSequenceId: string | null;
  sequenceIndex: number;
  sequenceLogs: Record<string, AttackEvent[]>;
  sequenceRedoStacks: Record<string, AttackEvent[]>;
  sequenceConditions: Record<string, Record<string, boolean>>;
};

const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';

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

const SIMULATED_STATE: PersistedFightState = {
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
    await page.addInitScript(
      ({ state, storageKey }) => {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      },
      { state: SIMULATED_STATE, storageKey: STORAGE_KEY },
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
    ).toBeVisible();

    await expect(
      page.getByText('Damage Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText('649');
    await expect(
      page.getByText('Attacks Logged').locator('..').locator('.data-list__value-text'),
    ).toHaveText('13');

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
