import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEffect } from 'react';

import { CombatStatsPanel } from './CombatStatsPanel';
import { type AttackInput, useFightState } from '../fight-state/FightStateContext';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { bossMap, DEFAULT_BOSS_ID, nailUpgrades } from '../../data';

const baseNailDamage = nailUpgrades[0]?.damage ?? 5;
const defaultBossTarget = bossMap.get(DEFAULT_BOSS_ID);

if (!defaultBossTarget) {
  throw new Error('Expected default boss target to be defined for tests');
}

const ActionRegistrar = ({
  onReady,
}: {
  onReady: (logAttack: (input: AttackInput) => void) => void;
}) => {
  const {
    actions: { logAttack },
  } = useFightState();

  useEffect(() => {
    onReady(logAttack);
  }, [logAttack, onReady]);

  return null;
};

describe('CombatStatsPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('estimates remaining fight time using observed DPS', async () => {
    let logAttack: ((input: AttackInput) => void) | null = null;

    renderWithFightProvider(
      <>
        <ActionRegistrar onReady={(logger) => (logAttack = logger)} />
        <CombatStatsPanel />
      </>,
    );

    await waitFor(() => {
      expect(logAttack).not.toBeNull();
    });

    const estimateRow = screen
      .getByText('Estimated Time Remaining')
      .closest('.data-list__item');

    expect(estimateRow).not.toBeNull();
    expect(within(estimateRow as HTMLElement).getByText('—')).toBeInTheDocument();

    act(() => {
      logAttack?.({
        id: 'test-hit-1',
        label: 'Test Hit',
        damage: baseNailDamage,
        category: 'nail',
        timestamp: 0,
      });
      logAttack?.({
        id: 'test-hit-2',
        label: 'Test Hit',
        damage: baseNailDamage,
        category: 'nail',
        timestamp: 3000,
      });
    });

    const totalDamage = baseNailDamage * 2;
    const remainingHp = Math.max(0, defaultBossTarget.hp - totalDamage);
    const elapsedMs = 3000;
    const dps = totalDamage / (elapsedMs / 1000);
    const estimatedMs = Math.round((remainingHp / dps) * 1000);
    const totalSeconds = Math.floor(estimatedMs / 1000);
    const expectedMinutes = Math.floor(totalSeconds / 60);
    const expectedSeconds = (totalSeconds % 60).toString().padStart(2, '0');
    const expectedLabel = `${expectedMinutes}:${expectedSeconds}`;

    expect(
      within(estimateRow as HTMLElement).getByText(expectedLabel),
    ).toBeInTheDocument();
  });

  it('renders sparklines to visualize damage trends', async () => {
    let logAttack: ((input: AttackInput) => void) | null = null;

    renderWithFightProvider(
      <>
        <ActionRegistrar onReady={(logger) => (logAttack = logger)} />
        <CombatStatsPanel />
      </>,
    );

    await waitFor(() => {
      expect(logAttack).not.toBeNull();
    });

    act(() => {
      logAttack?.({
        id: 'spark-hit-1',
        label: 'Test Hit',
        damage: baseNailDamage,
        category: 'nail',
        timestamp: 0,
      });
      logAttack?.({
        id: 'spark-hit-2',
        label: 'Test Hit',
        damage: baseNailDamage * 2,
        category: 'nail',
        timestamp: 5000,
      });
    });

    expect(
      screen.getByRole('img', { name: /total damage dealt over time/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /remaining health over time/i }),
    ).toBeInTheDocument();
  });

  it('scales sparklines using elapsed fight time', async () => {
    let logAttack: ((input: AttackInput) => void) | null = null;

    renderWithFightProvider(
      <>
        <ActionRegistrar onReady={(logger) => (logAttack = logger)} />
        <CombatStatsPanel />
      </>,
    );

    await waitFor(() => {
      expect(logAttack).not.toBeNull();
    });

    act(() => {
      logAttack?.({
        id: 'time-hit-1',
        label: 'Test Hit',
        damage: baseNailDamage,
        category: 'nail',
        timestamp: 0,
      });
      logAttack?.({
        id: 'time-hit-2',
        label: 'Test Hit',
        damage: baseNailDamage,
        category: 'nail',
        timestamp: 1000,
      });
    });

    const sparkline = screen.getByRole('img', {
      name: /total damage dealt over time/i,
    }) as SVGElement;
    const polyline = sparkline.querySelector('polyline');

    expect(polyline).not.toBeNull();

    const pointsAttribute = polyline?.getAttribute('points');
    expect(pointsAttribute).toBeTruthy();

    const points = (pointsAttribute ?? '').trim().split(/\s+/).filter(Boolean);

    expect(points.length).toBeGreaterThan(2);

    const parseX = (point: string) => Number.parseFloat(point.split(',')[0] ?? '0');

    const firstX = parseX(points[0] ?? '0,0');
    const lastX = parseX(points[points.length - 1] ?? '0,0');

    expect(firstX).toBeCloseTo(2, 1);
    expect(lastX).toBeCloseTo(86, 1);
  });
});
