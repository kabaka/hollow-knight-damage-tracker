import type { FC } from 'react';

import { PageLayout } from '../components/PageLayout';
import { AttackLogPanel } from '../features/attack-log/AttackLogPanel';
import { BuildConfigPanel } from '../features/build-config/BuildConfigPanel';
import { CombatStatsPanel } from '../features/combat-stats/CombatStatsPanel';

const SECTIONS = [
  {
    id: 'build-config',
    title: 'Configure Your Build',
    description: 'Select key upgrades so the tracker can estimate your modifiers.',
    content: <BuildConfigPanel />,
  },
  {
    id: 'attack-log',
    title: 'Log Attacks',
    description: 'Record each strike to reduce the boss health target in real time.',
    content: <AttackLogPanel />,
  },
  {
    id: 'combat-stats',
    title: 'Combat Overview',
    description: 'Track your progress and efficiency throughout the encounter.',
    content: <CombatStatsPanel />,
  },
] as const;

export const App: FC = () => {
  return (
    <PageLayout sections={SECTIONS}>
      <div>
        <p className="page__title">Hollow Knight Damage Tracker</p>
        <p className="page__subtitle">
          Plan your build, record every strike, and monitor fight-ending damage stats in
          real time. This early prototype focuses on layout and accessibility while core
          logic is built out.
        </p>
      </div>
    </PageLayout>
  );
};
