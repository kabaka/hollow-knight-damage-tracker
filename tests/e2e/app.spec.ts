import { test, expect, type Page } from '@playwright/test';

const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';
const STORAGE_VERSION = 4;
type SpellLevel = 'none' | 'base' | 'upgrade';

const numberFormatter = new Intl.NumberFormat('en-US');

const formatNumber = (value: number) => numberFormatter.format(value);
const formatHpText = (remaining: number, target: number) =>
  `${formatNumber(remaining)} / ${formatNumber(target)}`;

const getScoreboardValue = (page: Page) => page.locator('.hud-health__value');
const getBossHealthProgressbar = (page: Page) =>
  page.getByRole('progressbar', { name: 'Boss HP' });
const getMetricValue = (page: Page, id: string) =>
  page.locator(`[data-metric-id="${id}"] .hud-metrics__value-primary`);
const getMetricSublabel = (page: Page, id: string) =>
  page.locator(`[data-metric-id="${id}"] .hud-metrics__sublabel`);
const getAttackButton = (page: Page, attackId: string) =>
  page.locator(`[data-attack-id='${attackId}']`);
const getAttackDamage = async (page: Page, attackId: string) => {
  const damageText = await getAttackButton(page, attackId)
    .locator('.button-grid__damage')
    .innerText();
  return Number.parseInt(damageText, 10);
};

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

const setCustomTargetHp = async (page: Page, hp: number) => {
  const panel = await openEncounterSetup(page);
  await panel.getByRole('radio', { name: 'Custom' }).click();
  const customTargetInput = panel.getByLabel(/custom target hp/i);
  await customTargetInput.fill(hp.toString());
  await closeEncounterSetup(page);
};

const selectBossWithVersion = async (
  page: Page,
  bossName: string,
  versionLabel: string,
) => {
  const panel = await openEncounterSetup(page);
  await panel.getByRole('radio', { name: bossName }).click();
  await panel.getByRole('button', { name: 'Toggle advanced target options' }).click();
  await panel.getByLabel('Boss version').selectOption({ label: `${versionLabel}` });
  await closeEncounterSetup(page);
};

const selectSequence = async (page: Page, name: string) => {
  const panel = await openEncounterSetup(page);
  await panel.getByRole('combobox', { name: 'Mode' }).selectOption({ label: name });
  return panel;
};

type FightStateOverrides = {
  build?: {
    nailUpgradeId?: string;
    activeCharmIds?: string[];
    spellLevels?: Record<string, SpellLevel>;
    notchLimit?: number;
  };
};

type TestClock = {
  fastForward: (ms: number) => Promise<void>;
};

const installTestClock = async (page: Page): Promise<TestClock> => {
  const candidate = (
    page as unknown as {
      clock?: {
        install?: () => Promise<TestClock | undefined>;
      };
    }
  ).clock;

  if (candidate?.install) {
    const installed = await candidate.install();
    if (installed) {
      return installed;
    }
  }

  await page.evaluate(() => {
    const globalThisWithClock = window as typeof window & {
      __playwrightTestClock__?: { advance: (ms: number) => void };
    };

    if (globalThisWithClock.__playwrightTestClock__) {
      return;
    }

    const startNow = Date.now();
    const startPerformance = performance.now();
    let offset = 0;

    globalThisWithClock.__playwrightTestClock__ = {
      advance: (ms: number) => {
        offset += ms;
      },
    };

    Date.now = () => startNow + offset;
    performance.now = () => startPerformance + offset;
  });

  return {
    fastForward: async (ms: number) => {
      if (ms <= 0) {
        return;
      }
      await page.evaluate((advanceBy) => {
        const globalThisWithClock = window as typeof window & {
          __playwrightTestClock__?: { advance: (value: number) => void };
        };
        globalThisWithClock.__playwrightTestClock__?.advance(advanceBy);
      }, ms);
    },
  } satisfies TestClock;
};

const persistFightStateOverrides = async (page: Page, overrides: FightStateOverrides) => {
  const baseArgs = [STORAGE_KEY, STORAGE_VERSION, overrides] as const;

  try {
    await page.evaluate(([storageKey, version, stateOverrides]) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ version, state: stateOverrides }),
      );
    }, baseArgs);
  } catch {
    const sentinel = `fight-state-override:${Date.now()}:${Math.random()}`;
    await page.addInitScript(
      ([storageKey, version, stateOverrides, flag]) => {
        if (window.sessionStorage.getItem(flag)) {
          return;
        }
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ version, state: stateOverrides }),
          );
          window.sessionStorage.setItem(flag, 'applied');
        } catch {
          // Ignore storage errors in the fallback path to keep tests running.
        }
      },
      [...baseArgs, sentinel] as const,
    );
  }
};

const reloadApp = async (page: Page) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(
    page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
  ).toBeVisible();
};

const configurePureNailStrengthShamanBuild = async (page: Page) => {
  await persistFightStateOverrides(page, {
    build: {
      nailUpgradeId: 'pure-nail',
      activeCharmIds: ['unbreakable-strength', 'shaman-stone'],
      spellLevels: { 'vengeful-spirit': 'upgrade' },
    },
  });
  await reloadApp(page);
  await expect(getAttackButton(page, 'nail-strike')).toBeVisible();
};

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');

    const screenshotPath = testInfo.outputPath(
      `initial-state-${testInfo.project.name}.png`,
    );
    await page.screenshot({ fullPage: true, path: screenshotPath });
    await testInfo.attach(`initial-state-${testInfo.project.name}`, {
      path: screenshotPath,
      contentType: 'image/png',
    });
  });

  test('displays the core sections', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Hollow Knight Damage Tracker' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change Encounter' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Player loadout/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Attack Log' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Combat Overview' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Boss HP' })).toBeVisible();
  });

  test('displays application help modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click();

    const helpDialog = page.getByRole('dialog', { name: 'App help' });
    await expect(helpDialog).toBeVisible();
    await expect(
      helpDialog.getByRole('heading', { name: 'Player loadout and advanced setup' }),
    ).toBeVisible();
    await helpDialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(helpDialog).not.toBeVisible();
  });

  test('restores build configuration and logs after a reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Change Encounter' }).click();
    await page.getByRole('radio', { name: 'Custom' }).click();
    const customTargetInput = page.getByLabel(/custom target hp/i);
    await customTargetInput.fill('3333');

    await page.getByRole('button', { name: /Player loadout/i }).click();

    const modal = page.getByRole('dialog', { name: 'Player Loadout' });
    await expect(modal).toBeVisible();

    await modal.locator('#nail-level').selectOption('pure-nail');
    await modal.getByRole('button', { name: 'Strength & Quick Slash' }).click();

    await modal.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByRole('button', { name: 'Nail Strike' }).click();

    const progressbar = getBossHealthProgressbar(page);
    const initialTargetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    const nailDamage = await getAttackDamage(page, 'nail-strike');
    const expectedRemaining = initialTargetHp - nailDamage;

    await expect(progressbar).toHaveAttribute(
      'aria-valuenow',
      expectedRemaining.toString(),
    );
    await expect(getScoreboardValue(page)).toHaveText(
      formatHpText(expectedRemaining, initialTargetHp),
    );

    const attacksLoggedValue = page
      .locator('.data-list__item')
      .filter({ hasText: 'Attacks Logged' })
      .locator('.data-list__value');
    await expect(attacksLoggedValue).toHaveText('1');

    await page.reload();

    await page.getByRole('button', { name: 'Change Encounter' }).click();
    const restoredCustomOption = page.getByRole('radio', {
      name: 'Custom',
      checked: true,
    });
    await expect(restoredCustomOption).toBeVisible();
    await expect(page.getByLabel(/custom target hp/i)).toHaveValue('3333');

    await page.getByRole('button', { name: /Player loadout/i }).click();
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
    await expect(progressbar).toHaveAttribute(
      'aria-valuenow',
      expectedRemaining.toString(),
    );
    await expect(getScoreboardValue(page)).toHaveText(
      formatHpText(expectedRemaining, initialTargetHp),
    );
  });
});

test.describe('Combat mechanics', () => {
  test('logs complex attacks and updates HP for a high-damage build', async ({
    page,
  }) => {
    await configurePureNailStrengthShamanBuild(page);
    await selectBossWithVersion(page, 'Vengefly King', 'Attuned • 450 HP');

    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    let remainingHp = targetHp;

    const logAttack = async (attackId: string) => {
      const damage = await getAttackDamage(page, attackId);
      remainingHp = Math.max(0, remainingHp - damage);
      await getAttackButton(page, attackId).click();
      await expect(getScoreboardValue(page)).toHaveText(
        formatHpText(remainingHp, targetHp),
      );
      return damage;
    };

    await expect(getScoreboardValue(page)).toHaveText(formatHpText(targetHp, targetHp));

    const damageValues = [
      await logAttack('nail-strike'),
      await logAttack('great-slash'),
      await logAttack('vengeful-spirit-shadeSoul'),
    ];

    const totalDamage = damageValues.reduce((total, value) => total + value, 0);
    await expect(getMetricSublabel(page, 'dps')).toHaveText(
      `Total: ${formatNumber(totalDamage)}`,
    );
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('3 actions');
  });

  test('tracks DPS and APM over time during a fight', async ({ page }) => {
    await configurePureNailStrengthShamanBuild(page);
    await setCustomTargetHp(page, 1000);

    const clock = await installTestClock(page);
    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    let remainingHp = targetHp;

    const logAttackAtTime = async (attackId: string, advanceMs: number) => {
      if (advanceMs > 0) {
        await clock.fastForward(advanceMs);
      }
      const damage = await getAttackDamage(page, attackId);
      remainingHp = Math.max(0, remainingHp - damage);
      await getAttackButton(page, attackId).click();
      return damage;
    };

    const damageSequence = [
      await logAttackAtTime('nail-strike', 0),
      await logAttackAtTime('great-slash', 4000),
      await logAttackAtTime('vengeful-spirit-shadeSoul', 2000),
    ];
    await clock.fastForward(4000);

    const totalDamage = damageSequence.reduce((total, value) => total + value, 0);
    const elapsedSeconds = 10;
    const expectedDps = (totalDamage / elapsedSeconds).toFixed(1);
    const expectedApm = (damageSequence.length / (elapsedSeconds / 60)).toFixed(1);

    await expect(getMetricValue(page, 'dps')).toHaveText(expectedDps);
    await expect(getMetricValue(page, 'actions-per-minute')).toHaveText(expectedApm);
    await expect(getMetricSublabel(page, 'dps')).toHaveText(
      `Total: ${formatNumber(totalDamage)}`,
    );
  });
});

test.describe('Sequence modes and navigation', () => {
  test('auto-advances to the next pantheon stage after a defeat', async ({ page }) => {
    await configurePureNailStrengthShamanBuild(page);
    await selectSequence(page, 'Pantheon of the Master');
    await closeEncounterSetup(page);

    const timelineTitle = page.locator('.hud-timeline__title');
    await expect(timelineTitle).toHaveText('Vengefly King');

    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    const shadeSoulDamage = await getAttackDamage(page, 'vengeful-spirit-shadeSoul');
    const castsNeeded = Math.ceil(targetHp / shadeSoulDamage);

    for (let index = 0; index < castsNeeded; index += 1) {
      await getAttackButton(page, 'vengeful-spirit-shadeSoul').click();
    }

    await expect(timelineTitle).toHaveText('Gruz Mother');
    await expect(progressbar).toHaveAttribute('aria-valuemax', '650');
    await expect(progressbar).toHaveAttribute('aria-valuenow', '650');
    await expect(getMetricSublabel(page, 'dps')).toHaveText('Total: 0');
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('0 actions');
  });

  test('supports manual stage navigation with persistent state', async ({ page }) => {
    await configurePureNailStrengthShamanBuild(page);
    await selectSequence(page, 'Pantheon of the Master');
    await closeEncounterSetup(page);

    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    const shadeSoulDamage = await getAttackDamage(page, 'vengeful-spirit-shadeSoul');

    await getAttackButton(page, 'vengeful-spirit-shadeSoul').click();
    await getAttackButton(page, 'vengeful-spirit-shadeSoul').click();

    const remainingAfterHits = targetHp - shadeSoulDamage * 2;
    await expect(getScoreboardValue(page)).toHaveText(
      formatHpText(remainingAfterHits, targetHp),
    );

    await page.getByRole('button', { name: 'Next stage' }).click();
    await expect(page.locator('.hud-timeline__title')).toHaveText('Gruz Mother');
    await expect(getScoreboardValue(page)).toHaveText('650 / 650');
    await expect(getMetricSublabel(page, 'dps')).toHaveText('Total: 0');
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('0 actions');

    await page.getByRole('button', { name: 'Previous stage' }).click();
    await expect(page.locator('.hud-timeline__title')).toHaveText('Vengefly King');
    await expect(getScoreboardValue(page)).toHaveText(
      formatHpText(remainingAfterHits, targetHp),
    );
    await expect(getMetricSublabel(page, 'dps')).toHaveText(
      `Total: ${formatNumber(shadeSoulDamage * 2)}`,
    );
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('2 actions');
  });

  test('toggles conditional bosses within a pantheon sequence', async ({ page }) => {
    await configurePureNailStrengthShamanBuild(page);
    const panel = await selectSequence(page, 'Pantheon of the Sage');

    const stageNamesLocator = panel.locator('.sequence-selector__stage-name');
    let stageNames = await stageNamesLocator.allInnerTexts();
    expect(stageNames).not.toContain('Grey Prince Zote');

    await panel.getByLabel('Include Grey Prince Zote').check();
    stageNames = await stageNamesLocator.allInnerTexts();
    expect(stageNames).toContain('Grey Prince Zote');

    const galienIndex = stageNames.indexOf('Galien');
    const zoteIndex = stageNames.indexOf('Grey Prince Zote');
    expect(zoteIndex).toBe(galienIndex + 1);

    await closeEncounterSetup(page);
  });
});

test.describe('UI controls and shortcuts', () => {
  test('supports undo, redo, and quick reset actions', async ({ page }) => {
    await configurePureNailStrengthShamanBuild(page);
    await setCustomTargetHp(page, 1000);

    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );
    const nailDamage = await getAttackDamage(page, 'nail-strike');
    const spellDamage = await getAttackDamage(page, 'vengeful-spirit-shadeSoul');

    await getAttackButton(page, 'nail-strike').click();
    const afterNail = targetHp - nailDamage;
    await getAttackButton(page, 'vengeful-spirit-shadeSoul').click();
    const afterSpell = afterNail - spellDamage;

    await expect(getScoreboardValue(page)).toHaveText(formatHpText(afterSpell, targetHp));

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(getScoreboardValue(page)).toHaveText(formatHpText(afterNail, targetHp));
    await expect(getMetricSublabel(page, 'dps')).toHaveText(
      `Total: ${formatNumber(nailDamage)}`,
    );
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('1 action');

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(getScoreboardValue(page)).toHaveText(formatHpText(afterSpell, targetHp));
    await expect(getMetricSublabel(page, 'dps')).toHaveText(
      `Total: ${formatNumber(nailDamage + spellDamage)}`,
    );

    await page.getByRole('button', { name: /Quick reset/ }).click();
    await expect(getScoreboardValue(page)).toHaveText(formatHpText(targetHp, targetHp));
    await expect(getMetricSublabel(page, 'dps')).toHaveText('Total: 0');
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('0 actions');
  });

  test('shows overcharmed warnings and resolves charm conflicts', async ({ page }) => {
    await reloadApp(page);
    await page.getByRole('button', { name: /Player loadout/i }).click();
    const modal = page.getByRole('dialog', { name: 'Player Loadout' });
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: 'Clear charms' }).click();
    await modal.locator('#notch-limit').fill('4');

    await modal.getByRole('button', { name: /^Shaman Stone,/ }).click();
    await modal.getByRole('button', { name: /^Quick Slash,/ }).click();
    await expect(modal.locator('.overcharm-banner')).toBeVisible();
    await expect(modal.getByRole('button', { name: /Spell Twister/ })).toBeDisabled();

    await modal.getByRole('button', { name: /^Quick Slash,/ }).click();
    await modal.getByRole('button', { name: /^Shaman Stone,/ }).click();
    await expect(modal.locator('.overcharm-banner')).toBeHidden();

    await modal.getByRole('button', { name: /^Fragile Strength,/ }).click();
    await modal.getByRole('button', { name: /^Unbreakable Strength,/ }).click();
    await expect(
      modal.getByRole('button', { name: /^Unbreakable Strength,/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      modal.getByRole('button', { name: /^Fragile Strength,/ }),
    ).toHaveAttribute('aria-pressed', 'false');

    await modal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal).toBeHidden();
  });

  test('records damage via keyboard shortcuts and resets with Escape', async ({
    page,
  }) => {
    await configurePureNailStrengthShamanBuild(page);
    await setCustomTargetHp(page, 1000);

    const progressbar = getBossHealthProgressbar(page);
    const targetHp = Number.parseInt(
      (await progressbar.getAttribute('aria-valuemax')) ?? '0',
      10,
    );

    const nailDamage = await getAttackDamage(page, 'nail-strike');
    const greatSlashDamage = await getAttackDamage(page, 'great-slash');
    let remaining = targetHp;

    const expectRemaining = async (value: number) => {
      await expect(getScoreboardValue(page)).toHaveText(formatHpText(value, targetHp));
      await expect(getMetricSublabel(page, 'dps')).toHaveText(
        `Total: ${formatNumber(targetHp - value)}`,
      );
    };

    const nailKey = await getAttackButton(page, 'nail-strike').getAttribute(
      'aria-keyshortcuts',
    );
    const greatSlashKey = await getAttackButton(page, 'great-slash').getAttribute(
      'aria-keyshortcuts',
    );

    if (!nailKey || !greatSlashKey) {
      throw new Error('Expected hotkeys for Nail Strike and Great Slash');
    }

    await page.keyboard.press(nailKey);
    remaining -= nailDamage;
    await expectRemaining(remaining);

    await page.keyboard.press(greatSlashKey);
    remaining -= greatSlashDamage;
    await expectRemaining(remaining);

    await page.keyboard.press('Escape');
    await expect(getScoreboardValue(page)).toHaveText(formatHpText(targetHp, targetHp));
    await expect(getMetricSublabel(page, 'dps')).toHaveText('Total: 0');
    await expect(getMetricSublabel(page, 'actions-per-minute')).toHaveText('0 actions');
  });
});
