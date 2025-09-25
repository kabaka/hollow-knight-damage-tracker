import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CUSTOM_BOSS_ID, FightStateProvider, useFightState } from './FightStateContext';

const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';

describe('FightStateProvider persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('hydrates state from localStorage when data is available', () => {
    const persistedState = {
      version: 1,
      state: {
        selectedBossId: CUSTOM_BOSS_ID,
        customTargetHp: 3333.7,
        build: {
          nailUpgradeId: 'pure-nail',
          activeCharmIds: ['shaman-stone', 'quick-slash'],
          spellLevels: {
            'vengeful-spirit': 'upgrade',
          },
        },
        damageLog: [
          {
            id: 'spell-vengeful-1',
            label: 'Vengeful Spirit',
            damage: 45,
            category: 'spell',
            timestamp: 1700000000000,
            soulCost: 33,
          },
        ],
        redoStack: [],
      },
    } satisfies Record<string, unknown>;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));

    const Consumer = () => {
      const { state } = useFightState();
      return (
        <div>
          <span data-testid="selected-boss">{state.selectedBossId}</span>
          <span data-testid="custom-hp">{state.customTargetHp}</span>
          <span data-testid="nail-upgrade">{state.build.nailUpgradeId}</span>
          <span data-testid="charms">{state.build.activeCharmIds.join(',')}</span>
          <span data-testid="spell-level">
            {state.build.spellLevels['vengeful-spirit']}
          </span>
          <span data-testid="logged-attacks">{state.damageLog.length}</span>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    expect(screen.getByTestId('selected-boss').textContent).toBe(CUSTOM_BOSS_ID);
    expect(screen.getByTestId('custom-hp').textContent).toBe('3334');
    expect(screen.getByTestId('nail-upgrade').textContent).toBe('pure-nail');
    expect(screen.getByTestId('charms').textContent).toBe('shaman-stone,quick-slash');
    expect(screen.getByTestId('spell-level').textContent).toBe('upgrade');
    expect(screen.getByTestId('logged-attacks').textContent).toBe('1');
  });

  it('persists updates to localStorage whenever state changes', async () => {
    const user = userEvent.setup();

    const Consumer = () => {
      const { actions, state } = useFightState();
      return (
        <button type="button" onClick={() => actions.setCustomTargetHp(4321)}>
          {state.customTargetHp}
        </button>
      );
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      if (!stored) {
        throw new Error('Expected persisted fight state');
      }

      const parsed = JSON.parse(stored) as {
        version: number;
        state: { selectedBossId: string; customTargetHp: number };
      };
      expect(parsed.version).toBe(1);
      expect(parsed.state.selectedBossId).toBe(CUSTOM_BOSS_ID);
      expect(parsed.state.customTargetHp).toBe(4321);
    });
  });
});
