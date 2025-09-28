import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';
const STORAGE_VERSION = 4;

const MID_COMBAT_STATE = {
  selectedBossId: 'gruz-mother__radiant',
  customTargetHp: 945,
  build: {
    nailUpgradeId: 'pure-nail',
    activeCharmIds: [
      'shaman-stone',
      'quick-slash',
      'unbreakable-strength',
      'steady-body',
    ],
    spellLevels: {
      'vengeful-spirit': 'upgrade',
      'desolate-dive': 'upgrade',
      'howling-wraiths': 'upgrade',
    },
    notchLimit: 11,
  },
  damageLog: [
    {
      id: 'nail-strike-1',
      label: 'Nail Strike',
      damage: 32,
      category: 'nail',
      timestamp: 1727492581000,
    },
    {
      id: 'nail-strike-2',
      label: 'Nail Strike',
      damage: 32,
      category: 'nail',
      timestamp: 1727492581500,
    },
    {
      id: 'great-slash-1',
      label: 'Great Slash',
      damage: 80,
      category: 'nail-art',
      timestamp: 1727492582000,
    },
    {
      id: 'shade-soul-1',
      label: 'Shade Soul',
      damage: 40,
      category: 'spell',
      timestamp: 1727492582500,
    },
  ],
  redoStack: [],
};

test('generate a mid-combat screenshot', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    ([storageKey, version, state]) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version,
          state,
        }),
      );
    },
    [STORAGE_KEY, STORAGE_VERSION, MID_COMBAT_STATE],
  );

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
  ).toBeVisible();

  await page.screenshot({ path: 'docs/demo.png', fullPage: true });
});
