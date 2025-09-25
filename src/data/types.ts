export interface CharmEffect {
  type: string;
  effect: string;
  value: number | Record<string, number> | null;
  notes?: string;
}

export interface Charm {
  id: string;
  name: string;
  cost: number;
  description: string;
  origin: string;
  effects: CharmEffect[];
}

export interface NailUpgradeCost {
  geo: number;
  pale_ore: number;
}

export interface NailUpgrade {
  id: string;
  name: string;
  damage: number;
  cost: NailUpgradeCost;
  origin: string;
}

export interface SpellVariant {
  name: string;
  key: string;
  damage?: number;
  totalDamage?: number;
  hits?: number;
  notes?: string;
  origin?: string;
  damageBreakdown?: Array<{ source: string; damage: number }>;
}

export interface Spell {
  id: string;
  name: string;
  soulCost: number;
  origin: string;
  base: SpellVariant;
  upgrade?: SpellVariant;
}

export interface Boss {
  id: string;
  name: string;
  hp: number;
  location: string;
  notes?: string;
}
