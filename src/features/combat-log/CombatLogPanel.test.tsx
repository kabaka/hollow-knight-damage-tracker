import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEffect } from 'react';

import { CombatLogPanel } from './CombatLogPanel';
import { useFightActions } from '../fight-state/FightStateContext';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';

type FightActions = ReturnType<typeof useFightActions>;

const ActionsBridge = ({ onReady }: { onReady: (actions: FightActions) => void }) => {
  const actions = useFightActions();
  useEffect(() => {
    onReady(actions);
  }, [actions, onReady]);
  return null;
};

describe('CombatLogPanel', () => {
  it('records fight lifecycle entries with timestamps', async () => {
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogPanel />
      </>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.startFight(1_000);
    });

    act(() => {
      actions?.logAttack({
        id: 'nail-strike',
        label: 'Nail Strike',
        category: 'nail',
        damage: 100,
        timestamp: 1_600,
      });
      actions?.logAttack({
        id: 'great-slash',
        label: 'Great Slash',
        category: 'nail-art',
        damage: 200,
        timestamp: 3_400,
      });
    });

    act(() => {
      actions?.endFight(4_200);
    });

    await waitFor(() => {
      expect(screen.getByText(/fight started vs/i)).toBeInTheDocument();
      expect(screen.getByText('Starting HP')).toBeInTheDocument();
      expect(screen.getByText('Nail Strike')).toBeInTheDocument();
      expect(screen.getByText('Great Slash')).toBeInTheDocument();
      expect(screen.getByText(/100 dmg/)).toBeInTheDocument();
      expect(screen.getByText(/200 dmg/)).toBeInTheDocument();
      expect(screen.getByText('0.00s')).toBeInTheDocument();
      expect(screen.getByText('0.60s')).toBeInTheDocument();
      expect(screen.getByText('2.40s')).toBeInTheDocument();
      expect(screen.getByText('Total 300 dmg')).toBeInTheDocument();
      expect(screen.getByText(/victory|fight ended/i)).toBeInTheDocument();
    });
  });

  it('persists history across fight resets', async () => {
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogPanel />
      </>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.logAttack({
        id: 'nail-strike',
        label: 'Nail Strike',
        category: 'nail',
        damage: 50,
        timestamp: 500,
      });
      actions?.endFight(900);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/fight ended/i).length).toBeGreaterThan(0);
    });

    act(() => {
      actions?.resetLog();
    });

    await waitFor(() => {
      expect(screen.getByText('Fight reset')).toBeInTheDocument();
    });

    act(() => {
      actions?.logAttack({
        id: 'vengeful-spirit',
        label: 'Vengeful Spirit',
        category: 'spell',
        damage: 90,
        timestamp: 1_400,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Vengeful Spirit')).toBeInTheDocument();
      expect(screen.getAllByText(/fight ended/i).length).toBeGreaterThan(0);
    });
  });
});
