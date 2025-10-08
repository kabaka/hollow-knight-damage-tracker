import type { BossPhaseDefinition } from './types';

const phase = (id: string, name: string, hp: number, description?: string) => ({
  id,
  name,
  hp,
  description,
});

export const bossPhaseData: BossPhaseDefinition[] = [
  {
    targetId: 'the-hollow-knight__standard',
    phases: [
      phase('phase-1', 'Phase 1 – Opening duel', 425, 'Uses basic attacks.'),
      phase('phase-2', 'Phase 2 – Blob barrage', 175, 'Adds blob barrage.'),
      phase(
        'phase-3',
        'Phase 3 – Flame pillars',
        250,
        'Adds flame pillars and self-stab.',
      ),
      phase(
        'phase-4',
        'Phase 4 – Frenzied leap',
        400,
        'Adds bounce attack; self-stab damage reduced to 1.',
      ),
    ],
  },
  {
    targetId: 'troupe-master-grimm__standard',
    phases: [
      phase('phase-1', 'Phase 1 – Opening performance', 250),
      phase('phase-2', 'Phase 2 – After 75%', 250, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 250, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final act', 250, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'troupe-master-grimm__attuned',
    phases: [
      phase('phase-1', 'Phase 1 – Opening performance', 250),
      phase('phase-2', 'Phase 2 – After 75%', 250, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 250, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final act', 250, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'troupe-master-grimm__ascended',
    phases: [
      phase('phase-1', 'Phase 1 – Opening performance', 300),
      phase('phase-2', 'Phase 2 – After 75%', 300, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 300, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final act', 300, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'troupe-master-grimm__radiant',
    phases: [
      phase('phase-1', 'Phase 1 – Opening performance', 300),
      phase('phase-2', 'Phase 2 – After 75%', 300, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 300, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final act', 300, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'nightmare-king-grimm__standard',
    phases: [
      phase('phase-1', 'Phase 1 – Infernal opening', 375),
      phase('phase-2', 'Phase 2 – After 75%', 375, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 375, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final flames', 375, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'nightmare-king-grimm__attuned',
    phases: [
      phase('phase-1', 'Phase 1 – Infernal opening', 375),
      phase('phase-2', 'Phase 2 – After 75%', 375, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 375, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final flames', 375, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'nightmare-king-grimm__ascended',
    phases: [
      phase('phase-1', 'Phase 1 – Infernal opening', 450),
      phase('phase-2', 'Phase 2 – After 75%', 450, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 450, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final flames', 450, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'nightmare-king-grimm__radiant',
    phases: [
      phase('phase-1', 'Phase 1 – Infernal opening', 450),
      phase('phase-2', 'Phase 2 – After 75%', 450, 'First pufferfish transition.'),
      phase('phase-3', 'Phase 3 – After 50%', 450, 'Second pufferfish transition.'),
      phase('phase-4', 'Phase 4 – Final flames', 450, 'Third pufferfish transition.'),
    ],
  },
  {
    targetId: 'mantis-lords__standard',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Solo duel', 210, 'Fight the first Mantis Lord.'),
      phase(
        'phase-2',
        'Phase 2 – Twin assault',
        320,
        'Fight the remaining pair together.',
      ),
    ],
  },
  {
    targetId: 'mantis-lords__attuned',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Solo duel', 280, 'Fight the first Mantis Lord.'),
      phase(
        'phase-2',
        'Phase 2 – Twin assault',
        420,
        'Fight the remaining pair together.',
      ),
    ],
  },
  {
    targetId: 'mantis-lords__ascended',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Solo duel', 350, 'Fight the first Mantis Lord.'),
      phase(
        'phase-2',
        'Phase 2 – Twin assault',
        530,
        'Fight the remaining pair together.',
      ),
    ],
  },
  {
    targetId: 'mantis-lords__radiant',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Solo duel', 350, 'Fight the first Mantis Lord.'),
      phase(
        'phase-2',
        'Phase 2 – Twin assault',
        530,
        'Fight the remaining pair together.',
      ),
    ],
  },
  {
    targetId: 'sisters-of-battle__standard',
    discardOverkill: true,
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Solo sister',
        300,
        'Initial duel before the full chorus arrives.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Battle chorus',
        600,
        'All sisters join and fight until the end.',
      ),
    ],
  },
  {
    targetId: 'sisters-of-battle__attuned',
    discardOverkill: true,
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Solo sister',
        250,
        'Initial duel before the full chorus arrives.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Battle chorus',
        500,
        'All sisters join and fight until the end.',
      ),
    ],
  },
  {
    targetId: 'sisters-of-battle__ascended',
    discardOverkill: true,
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Solo sister',
        300,
        'Initial duel before the full chorus arrives.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Battle chorus',
        600,
        'All sisters join and fight until the end.',
      ),
    ],
  },
  {
    targetId: 'sisters-of-battle__radiant',
    discardOverkill: true,
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Solo sister',
        300,
        'Initial duel before the full chorus arrives.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Battle chorus',
        600,
        'All sisters join and fight until the end.',
      ),
    ],
  },
  {
    targetId: 'oblobbles__standard',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Twin volley', 140, 'Both Oblobbles attack together.'),
      phase(
        'phase-2',
        'Phase 2 – Frenzied survivor',
        190,
        'The remaining Oblobble heals 50 HP and attacks faster.',
      ),
    ],
  },
  {
    targetId: 'oblobbles__attuned',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Twin volley', 220, 'Both Oblobbles attack together.'),
      phase(
        'phase-2',
        'Phase 2 – Frenzied survivor',
        270,
        'The remaining Oblobble heals 50 HP and attacks faster.',
      ),
    ],
  },
  {
    targetId: 'oblobbles__ascended',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Twin volley', 264, 'Both Oblobbles attack together.'),
      phase(
        'phase-2',
        'Phase 2 – Frenzied survivor',
        314,
        'The remaining Oblobble heals 50 HP and attacks faster.',
      ),
    ],
  },
  {
    targetId: 'oblobbles__radiant',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Twin volley', 264, 'Both Oblobbles attack together.'),
      phase(
        'phase-2',
        'Phase 2 – Frenzied survivor',
        314,
        'The remaining Oblobble heals 50 HP and attacks faster.',
      ),
    ],
  },
  {
    targetId: 'the-radiance__standard',
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 450, 'Ground arena attacks.'),
      phase('phase-2', 'Phase 2 – Spike floor', 350, 'Spike floor patterns.'),
      phase('phase-3', 'Phase 3 – Platform dance', 250, 'Platform arena rotation.'),
      phase('phase-4', 'Phase 4 – Final stand', 650, 'Final stand after the climb.'),
    ],
  },
  {
    targetId: 'absolute-radiance__standard',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 540),
      phase('phase-2', 'Phase 2 – Spike floor', 480),
      phase('phase-3', 'Phase 3 – Platform dance', 300),
      phase('phase-4', 'Phase 4 – Winged barrage', 480),
      phase('phase-5', 'Phase 5 – Final radiance', 840),
    ],
  },
  {
    targetId: 'absolute-radiance__attuned',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 450),
      phase('phase-2', 'Phase 2 – Spike floor', 400),
      phase('phase-3', 'Phase 3 – Platform dance', 250),
      phase('phase-4', 'Phase 4 – Winged barrage', 400),
      phase('phase-5', 'Phase 5 – Final radiance', 700),
    ],
  },
  {
    targetId: 'absolute-radiance__ascended',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 540),
      phase('phase-2', 'Phase 2 – Spike floor', 480),
      phase('phase-3', 'Phase 3 – Platform dance', 300),
      phase('phase-4', 'Phase 4 – Winged barrage', 480),
      phase('phase-5', 'Phase 5 – Final radiance', 840),
    ],
  },
  {
    targetId: 'absolute-radiance__radiant',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 540),
      phase('phase-2', 'Phase 2 – Spike floor', 480),
      phase('phase-3', 'Phase 3 – Platform dance', 300),
      phase('phase-4', 'Phase 4 – Winged barrage', 480),
      phase('phase-5', 'Phase 5 – Final radiance', 840),
    ],
  },
];
