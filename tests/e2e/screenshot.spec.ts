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
  fightStartOffsetMs: 12_500,
  damageLog: [
    {
      id: 'nail-strike-1',
      label: 'Nail Strike',
      damage: 32,
      category: 'nail',
      timestampOffsetMs: 0,
    },
    {
      id: 'nail-strike-2',
      label: 'Nail Strike',
      damage: 32,
      category: 'nail',
      timestampOffsetMs: 500,
    },
    {
      id: 'great-slash-1',
      label: 'Great Slash',
      damage: 80,
      category: 'nail-art',
      timestampOffsetMs: 1000,
    },
    {
      id: 'shade-soul-1',
      label: 'Shade Soul',
      damage: 40,
      category: 'spell',
      timestampOffsetMs: 1600,
    },
  ],
  redoStack: [],
};

test('generate a mid-combat screenshot', async ({ page }) => {
  await page.addInitScript(
    ({ storageKey, version, state }) => {
      try {
        const {
          fightStartOffsetMs = 0,
          damageLog = [],
          redoStack = [],
          ...rest
        } = state as typeof state;
        const fightStartTimestamp = Date.now() - fightStartOffsetMs;
        const resolveTimestamps = (events: typeof damageLog) =>
          events.map(({ timestampOffsetMs = 0, ...event }) => ({
            ...event,
            timestamp: fightStartTimestamp + timestampOffsetMs,
          }));

        const resolvedState = {
          ...rest,
          fightStartTimestamp,
          fightManuallyStarted: true,
          fightEndTimestamp: null,
          fightManuallyEnded: false,
          damageLog: resolveTimestamps(damageLog),
          redoStack: resolveTimestamps(redoStack),
        };

        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            version,
            state: resolvedState,
          }),
        );
      } catch {
        // Keep the test running even if storage writes fail in unusual environments.
      }
    },
    {
      storageKey: STORAGE_KEY,
      version: STORAGE_VERSION,
      state: MID_COMBAT_STATE,
    },
  );

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Damage Tracker' })).toBeVisible();

  const encounterBanner = page.getByRole('banner');
  await expect(encounterBanner).toContainText('Gruz Mother');
  await expect(encounterBanner).toContainText('Radiant');

  const scoreboard = page.getByRole('region', { name: 'Encounter scoreboard' });
  const elapsed = scoreboard.locator(
    '[data-metric-id="elapsed"] .hud-metrics__value-primary',
  );
  const estimatedRemaining = scoreboard.locator(
    '[data-metric-id="estimated-remaining"] .hud-metrics__value-primary',
  );

  await expect(elapsed).toHaveText(/^\d+:\d{2}\.\d{2}$/);
  await expect(estimatedRemaining).toHaveText(/^\d+:\d{2}\.\d{2}$/);

  const [elapsedMinutes, remainingMinutes] = await Promise.all([
    elapsed.innerText().then((value) => Number.parseInt(value.split(':')[0] ?? '0', 10)),
    estimatedRemaining
      .innerText()
      .then((value) => Number.parseInt(value.split(':')[0] ?? '0', 10)),
  ]);

  expect(elapsedMinutes).toBeLessThan(5);
  expect(remainingMinutes).toBeLessThan(10);

  await page.screenshot({ path: 'test-results/demo.png', fullPage: true });

  await expect(page.getByRole('group', { name: 'Attack log controls' })).toBeVisible();
  await expect(page.getByRole('log', { name: 'Combat history' })).toBeVisible();

  await test.step('capture a mobile layout screenshot', async () => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo(0, 0));

    const header = page.locator('header[role="banner"]');

    await expect(
      page.getByRole('region', { name: 'Encounter scoreboard' }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/mobile-app-overview.png',
    });

    const headerHeight = await header.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    await page.evaluate((offset) => {
      window.scrollTo({ top: offset, behavior: 'instant' });
    }, headerHeight + 360);
    await page.waitForTimeout(250);

    const headerBottom = await header.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    );
    expect(headerBottom).toBeLessThanOrEqual(1);

    await expect(page.getByRole('group', { name: 'Attack log controls' })).toBeVisible();
    await expect(page.getByRole('log', { name: 'Combat history' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/mobile-app-log.png',
    });
  });
});
