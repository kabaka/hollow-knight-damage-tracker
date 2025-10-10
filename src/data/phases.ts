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
  {
    targetId: 'false-knight__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase(
        'armor-1',
        'Armor Stage 1',
        360,
        'Break the armor shell to expose the maggot.',
      ),
      phase(
        'maggot-1',
        'Maggot Stage 1',
        60,
        'Punish the maggot before the armor reforms.',
      ),
      phase('armor-2', 'Armor Stage 2', 360, 'Repeat the duel against the armor.'),
      phase('maggot-2', 'Maggot Stage 2', 40, 'Second stagger window on the maggot.'),
      phase('armor-3', 'Armor Stage 3', 360, 'Final armor phase prior to the escape.'),
      phase('maggot-3', 'Maggot Stage 3', 40, 'Chase the exposed maggot again.'),
      phase(
        'maggot-4',
        'Maggot Stage 4',
        40,
        'Finish the fleeing maggot once the armor is shattered.',
      ),
    ],
  },
  {
    targetId: 'failed-champion__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase(
        'armor-1',
        'Armor Stage 1',
        360,
        'Shatter the armor to reveal the enraged maggot.',
      ),
      phase(
        'maggot-1',
        'Maggot Stage 1',
        60,
        'Strike the exposed maggot before it reclaims the armor.',
      ),
      phase(
        'armor-2',
        'Armor Stage 2',
        360,
        'Second armor phase with increased aggression.',
      ),
      phase('maggot-2', 'Maggot Stage 2', 40, 'Brief stagger window against the maggot.'),
      phase(
        'armor-3',
        'Armor Stage 3',
        360,
        'Final armor phase before the maggot erupts.',
      ),
      phase('maggot-3', 'Maggot Stage 3', 40, 'Penultimate stagger against the maggot.'),
      phase(
        'maggot-4',
        'Maggot Stage 4',
        40,
        'Chase down the maggot one last time to end the fight.',
      ),
    ],
  },
  {
    targetId: 'gorb__pantheon-of-hallownest',
    phases: [
      phase('phase-1', 'Phase 1 – Opening chants', 125, 'Single spear rings.'),
      phase(
        'phase-2',
        'Phase 2 – Dual volleys',
        125,
        'At 70% HP, Gorb fires two alternating waves.',
      ),
      phase(
        'phase-3',
        'Phase 3 – Triple barrages',
        166,
        'At 40% HP, Gorb fires three waves of spears.',
      ),
    ],
  },
  {
    targetId: 'brothers-oro-mato__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase('phase-1', "Phase 1 – Oro's duel", 500, 'Face Oro alone.'),
      phase(
        'phase-2',
        'Phase 2 – Brothers united',
        1600,
        'Oro returns with 600 HP and Mato joins with 1000 HP.',
      ),
    ],
  },
  {
    targetId: 'soul-master__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Aerial assault', 900, 'Floating spell barrages.'),
      phase(
        'phase-2',
        'Phase 2 – Ground slam',
        600,
        'The arena collapses and the battle continues below.',
      ),
    ],
  },
  {
    targetId: 'oblobbles__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Twin volley', 750, 'Both Oblobbles attack together.'),
      phase(
        'phase-2',
        'Phase 2 – Frenzied survivor',
        750,
        'The surviving Oblobble enrages after its partner falls.',
      ),
    ],
  },
  {
    targetId: 'sisters-of-battle__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Solo sister',
        600,
        'Duel a lone sister to open the fight.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Battle chorus',
        2850,
        'All three sisters join with the remaining trio of health pools.',
      ),
    ],
  },
  {
    targetId: 'galien__pantheon-of-hallownest',
    phases: [
      phase('phase-1', 'Phase 1 – Great scythe', 156, 'Galien fights alone.'),
      phase(
        'phase-2',
        'Phase 2 – One orbiting scythe',
        156,
        'At 70% HP, a small scythe appears.',
      ),
      phase(
        'phase-3',
        'Phase 3 – Dual orbiting scythes',
        208,
        'At 40% HP, a second scythe joins.',
      ),
    ],
  },
  {
    targetId: 'paintmaster-sheo__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Tight canvas',
        237,
        'The arena has limited paint coverage.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Expanding palette',
        238,
        'At 75% HP, attacks paint more of the arena.',
      ),
      phase(
        'phase-3',
        'Phase 3 – Saturated canvas',
        475,
        'At 50% HP, the paintable area expands further.',
      ),
    ],
  },
  {
    targetId: 'hive-knight__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Opening charges',
        301,
        'Standard attacks before the swarm.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Swarm release',
        549,
        'At 549 HP remaining, Hive Knight begins using Swarm Release.',
      ),
    ],
  },
  {
    targetId: 'the-collector__attuned',
    notes: 'After its HP reaches 0, 15 additional hits are required to free the jars.',
    phases: [
      phase('phase-1', 'Phase 1 – Trickle of jars', 450, 'Drops 1–2 jars at a time.'),
      phase('phase-2', 'Phase 2 – Chaotic hoard', 450, 'Drops 2–3 jars at a time.'),
    ],
  },
  {
    targetId: 'winged-nosk__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Ground pursuit',
        375,
        'Standard attacks before the downpour.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Downpour assault',
        375,
        'At 50% HP, Winged Nosk adds the Downpour attack.',
      ),
    ],
  },
  {
    targetId: 'hornet-sentinel__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Agile duel',
        320,
        'Standard arsenal of slashes and throws.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Sting shard traps',
        480,
        'At 480 HP remaining, Hornet deploys spike traps.',
      ),
    ],
  },
  {
    targetId: 'lost-kin__pantheon-of-hallownest',
    phases: [
      phase('phase-1', 'Phase 1 – Opening flurry', 100, 'Standard balloon spawn rate.'),
      phase(
        'phase-2',
        'Phase 2 – Aggressive infection',
        1150,
        'At 1150 HP remaining, Infected Balloons spawn more frequently.',
      ),
    ],
  },
  {
    targetId: 'no-eyes__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Lamenting spirits',
        420,
        'Spirits spawn every 2.25 seconds.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Rising chorus',
        60,
        'At 150 HP, spirits spawn every 1.75 seconds.',
      ),
      phase(
        'phase-3',
        'Phase 3 – Haunting crescendo',
        90,
        'At 90 HP, spirits spawn every 1.25 seconds.',
      ),
    ],
  },
  {
    targetId: 'soul-tyrant__attuned',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Relentless barrage', 900, 'Floating spell assault.'),
      phase(
        'phase-2',
        'Phase 2 – Pursuit of the past',
        350,
        'After the first phase, the fight resumes with 350 HP.',
      ),
    ],
  },
  {
    targetId: 'markoth__attuned',
    phases: [
      phase(
        'phase-1',
        'Phase 1 – Lone shield',
        325,
        'Single rotating shield with nail storms.',
      ),
      phase(
        'phase-2',
        'Phase 2 – Twin shields',
        325,
        'At 50% HP, a second shield appears and attack rate increases.',
      ),
    ],
  },
  {
    targetId: 'pure-vessel__pantheon-of-hallownest',
    phases: [
      phase('phase-1', 'Phase 1 – Bladed ritual', 544, 'Standard moveset.'),
      phase(
        'phase-2',
        'Phase 2 – Focused ascension',
        528,
        'At 66% HP, gains the Soul Pillar attack.',
      ),
      phase(
        'phase-3',
        'Phase 3 – Void cascade',
        528,
        'At 33% HP, adds the exploding orb attack.',
      ),
    ],
  },
  {
    targetId: 'absolute-radiance__pantheon-of-hallownest',
    discardOverkill: true,
    phases: [
      phase('phase-1', 'Phase 1 – Ground assault', 400),
      phase('phase-2', 'Phase 2 – Spike floor', 450),
      phase('phase-3', 'Phase 3 – Platform dance', 300),
      phase('phase-4', 'Phase 4 – Winged barrage', 750),
      phase(
        'phase-5',
        'Phase 5 – Climb',
        280,
        'Ascend the vertical shaft with beam attacks.',
      ),
      phase(
        'phase-6',
        'Phase 6 – Final strike',
        1,
        'Deliver the last hit after the climb.',
      ),
    ],
  },
];
