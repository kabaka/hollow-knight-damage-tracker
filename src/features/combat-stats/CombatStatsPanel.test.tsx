import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SparklinePoint } from './Sparkline';
import { CombatStatsPanel } from './CombatStatsPanel';
import type { DerivedStats } from '../fight-state/FightStateContext';

interface SparklineRecord {
  length: number;
  first?: SparklinePoint;
  last?: SparklinePoint;
  sample?: SparklinePoint[];
  bucketAtOneSecond?: SparklinePoint | null;
  valueDomain?: [number, number];
}

const sparklineRecords = new Map<string, SparklineRecord>();

vi.mock('./Sparkline', () => ({
  Sparkline: ({
    ariaLabel,
    data,
    valueDomain,
  }: {
    ariaLabel: string;
    data: SparklinePoint[];
    valueDomain?: [number, number];
  }) => {
    const record: SparklineRecord = {
      length: data.length,
      first: data[0],
      last: data.length > 0 ? data[data.length - 1] : undefined,
      valueDomain,
    };

    if (data.length <= 10) {
      record.sample = data.slice();
    } else {
      record.sample = data.slice(0, 10);
    }

    if (ariaLabel === 'Damage per second trend') {
      record.bucketAtOneSecond =
        data.find((point) => Math.round(point.time) === 1000) ?? null;
    }

    sparklineRecords.set(ariaLabel, record);

    return (
      <svg role="img" aria-label={ariaLabel}>
        <title>{ariaLabel}</title>
      </svg>
    );
  },
}));

const mockDamageLog: Array<{ timestamp: number; damage: number }> = [];
const baseDerivedStats: DerivedStats = {
  targetHp: 2000,
  totalDamage: 0,
  remainingHp: 2000,
  attacksLogged: 0,
  averageDamage: null,
  elapsedMs: null,
  dps: null,
  actionsPerMinute: null,
  estimatedTimeRemainingMs: null,
  fightStartTimestamp: null,
  fightEndTimestamp: null,
  isFightInProgress: false,
  isFightComplete: false,
  frameTimestamp: 0,
};
const mockDerivedStats: DerivedStats = { ...baseDerivedStats };

const setDamageLog = (entries: Array<{ timestamp: number; damage: number }>) => {
  mockDamageLog.length = 0;
  mockDamageLog.push(...entries);
};

const setDerivedStats = (overrides: Partial<DerivedStats>) => {
  Object.assign(mockDerivedStats, baseDerivedStats, overrides);
};

vi.mock('../fight-state/FightStateContext', () => ({
  useFightState: () => ({ state: { damageLog: mockDamageLog } }),
  useFightDerivedStats: () => mockDerivedStats,
}));

describe('CombatStatsPanel', () => {
  beforeEach(() => {
    sparklineRecords.clear();
    setDamageLog([]);
    setDerivedStats({});
  });

  afterEach(() => {
    sparklineRecords.clear();
  });

  it('omits redundant fight timer stats from the overview', () => {
    render(<CombatStatsPanel />);

    expect(screen.queryByText('Elapsed')).toBeNull();
    expect(screen.queryByText('Estimated Time Remaining')).toBeNull();
    expect(screen.queryByText('Est. Remaining')).toBeNull();
  });

  it('charts average damage per hit using attack count', () => {
    setDamageLog([
      { timestamp: 0, damage: 220 },
      { timestamp: 2000, damage: 180 },
      { timestamp: 4000, damage: 210 },
    ]);
    setDerivedStats({
      targetHp: 2000,
      totalDamage: 610,
      remainingHp: 1390,
      attacksLogged: 3,
      averageDamage: 203.33,
      fightStartTimestamp: 0,
      fightEndTimestamp: 4000,
    });

    render(<CombatStatsPanel />);

    const sparkline = sparklineRecords.get('Damage dealt per logged attack');
    expect(sparkline?.sample?.length).toBe(3);
    expect(sparkline?.sample?.map((point) => point.time)).toEqual([1, 2, 3]);
  });

  it('buckets the dps trend by second', () => {
    setDamageLog([
      { timestamp: 0, damage: 150 },
      { timestamp: 1500, damage: 300 },
    ]);
    setDerivedStats({
      targetHp: 2000,
      totalDamage: 450,
      remainingHp: 1550,
      attacksLogged: 2,
      averageDamage: 225,
      fightStartTimestamp: 0,
      fightEndTimestamp: 1500,
    });

    render(<CombatStatsPanel />);

    const sparkline = sparklineRecords.get('Damage per second trend');
    expect(sparkline?.bucketAtOneSecond?.value).toBeCloseTo(150, 5);
    expect(sparkline?.last?.value).toBeCloseTo(600, 5);
  });

  it('locks remaining health chart to the target health domain', () => {
    setDamageLog([
      { timestamp: 0, damage: 400 },
      { timestamp: 2500, damage: 300 },
    ]);
    setDerivedStats({
      targetHp: 2000,
      totalDamage: 700,
      remainingHp: 1300,
      attacksLogged: 2,
      averageDamage: 350,
      fightStartTimestamp: 0,
      fightEndTimestamp: 2500,
    });

    render(<CombatStatsPanel />);

    const sparkline = sparklineRecords.get('Remaining health over time');
    expect(sparkline?.valueDomain).toEqual([0, 2000]);
  });
});
