import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Charm, CharmSynergy } from '../data';
import { CharmSynergyList, type CharmSynergyStatus } from './CharmSynergyList';

const createCharm = (overrides: Partial<Charm>): Charm => ({
  id: 'charm-id',
  name: 'Example Charm',
  cost: 1,
  description: 'Example description',
  origin: 'Test',
  effects: [],
  ...overrides,
});

const createSynergy = (overrides: Partial<CharmSynergy>): CharmSynergy => ({
  id: 'synergy-id',
  name: 'Example Synergy',
  category: 'movement',
  charmIds: ['charm-a'],
  description: 'Example synergy description',
  effects: [],
  ...overrides,
});

const charmDetails = new Map<string, Charm>([
  [
    'charm-a',
    createCharm({
      id: 'charm-a',
      name: 'Dashmaster',
    }),
  ],
  [
    'charm-b',
    createCharm({
      id: 'charm-b',
      name: 'Sharp Shadow',
    }),
  ],
]);

const iconMap = new Map<string, string>([
  ['charm-a', '/icons/dashmaster.png'],
  ['charm-b', '/icons/sharp-shadow.png'],
]);

const statuses: CharmSynergyStatus[] = [
  {
    synergy: createSynergy({
      id: 'movement-synergy',
      name: 'Fleet Footed',
      category: 'movement',
      charmIds: ['charm-a'],
      description: 'Dashmaster boosts movement speed.',
    }),
    isActive: true,
  },
  {
    synergy: createSynergy({
      id: 'combat-synergy',
      name: 'Shadow Clash',
      category: 'combat',
      charmIds: ['charm-a', 'charm-b'],
      description: 'Dashmaster and Sharp Shadow combine for extra damage.',
    }),
    isActive: false,
  },
];

describe('CharmSynergyList', () => {
  it('hides inactive synergies and category headings by default', () => {
    render(
      <CharmSynergyList
        statuses={statuses}
        charmDetails={charmDetails}
        iconMap={iconMap}
      />,
    );

    expect(screen.getByText('Fleet Footed')).toBeInTheDocument();
    expect(screen.queryByText('Shadow Clash')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Movement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Combat' })).not.toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: 'Show all synergies' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals inactive synergies and headings when toggled', () => {
    render(
      <CharmSynergyList
        statuses={statuses}
        charmDetails={charmDetails}
        iconMap={iconMap}
      />,
    );

    const toggleButton = screen.getByRole('button', { name: 'Show all synergies' });
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(toggleButton).toHaveTextContent('Show active synergies');
    expect(screen.getByText('Shadow Clash')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Movement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Combat' })).toBeInTheDocument();
  });
});
