import type { FightState } from './fightReducer';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const E2E_SCENARIO_QUERY_KEY = 'e2e-scenario';

export const SIMULATED_FIGHT_SCENARIO_ID = 'simulated-radiance-fight';

const simulatedFightState: FightState = {
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
  damageLog: [
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
  ],
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceRedoStacks: {},
  sequenceConditions: {},
};

export const SIMULATED_FIGHT_EXPECTED_TOTAL_DAMAGE = 649;
export const SIMULATED_FIGHT_EXPECTED_ATTACKS = 13;

const scenarioFactories = new Map<string, () => FightState>([
  [SIMULATED_FIGHT_SCENARIO_ID, () => clone(simulatedFightState)],
]);

export const getScenarioFightState = (
  scenarioId: string | null | undefined,
): FightState | null => {
  if (!scenarioId) {
    return null;
  }

  const factory = scenarioFactories.get(scenarioId);
  return factory ? factory() : null;
};
