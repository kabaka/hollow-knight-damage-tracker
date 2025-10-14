import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const realSessionStorage = window.sessionStorage;

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
  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: realSessionStorage,
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: realSessionStorage,
    });
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('shows all synergies and category headings by default', () => {
    render(
      <CharmSynergyList
        statuses={statuses}
        charmDetails={charmDetails}
        iconMap={iconMap}
      />,
    );

    expect(screen.getByText('Fleet Footed')).toBeInTheDocument();
    expect(screen.getByText('Shadow Clash')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Movement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Combat' })).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();

    const toggleButton = screen.getByRole('button', { name: 'Show active synergies' });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists the toggled preference via sessionStorage', async () => {
    const storage = new Map<string, string>();
    const mockSessionStorage: Storage = {
      get length() {
        return storage.size;
      },
      clear: vi.fn(() => {
        storage.clear();
      }),
      getItem: vi.fn((key: string) => {
        return storage.get(key) ?? null;
      }),
      key: vi.fn((index: number) => {
        return Array.from(storage.keys())[index] ?? null;
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
    };

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: mockSessionStorage,
    });

    const { unmount } = render(
      <CharmSynergyList
        statuses={statuses}
        charmDetails={charmDetails}
        iconMap={iconMap}
      />,
    );

    const toggleButton = screen.getByRole('button', { name: 'Show active synergies' });
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => {
      expect(mockSessionStorage.setItem).toHaveBeenLastCalledWith(
        'hkdt.synergyFilter',
        'active',
      );
    });
    expect(storage.get('hkdt.synergyFilter')).toBe('active');

    unmount();

    render(
      <CharmSynergyList
        statuses={statuses}
        charmDetails={charmDetails}
        iconMap={iconMap}
      />,
    );

    expect(screen.getByRole('button', { name: 'Show all synergies' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('hkdt.synergyFilter');
    expect(screen.queryByText('Shadow Clash')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Movement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Combat' })).not.toBeInTheDocument();
  });
});
