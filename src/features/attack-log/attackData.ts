export type NailArtId = 'great-slash' | 'dash-slash' | 'cyclone-slash-hit';

export interface NailArtConfig {
  id: NailArtId;
  label: string;
  multiplier: number;
  baseDescription: string;
}

export const NAIL_ARTS: readonly NailArtConfig[] = [
  {
    id: 'great-slash',
    label: 'Great Slash',
    multiplier: 2.5,
    baseDescription: 'Nail Art damage.',
  },
  {
    id: 'dash-slash',
    label: 'Dash Slash',
    multiplier: 2,
    baseDescription: 'Nail Art damage.',
  },
  {
    id: 'cyclone-slash-hit',
    label: 'Cyclone Slash (per hit)',
    multiplier: 1,
    baseDescription: 'Log each Cyclone Slash hit individually.',
  },
] as const;

export const NAIL_ART_IDS = new Set<NailArtId>(NAIL_ARTS.map((art) => art.id));
