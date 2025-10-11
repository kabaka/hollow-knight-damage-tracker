import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BossSequenceEntry, BossTarget } from '../../data/types';
import { SequenceSelector, type SequenceSelectorProps } from './SequenceSelector';

const createTarget = (id: string, bossName: string): BossTarget => ({
  id,
  bossId: id,
  bossName,
  location: 'Godhome',
  description: `${bossName} encounter`,
  hp: 1000,
  version: {
    id: `${id}-version`,
    title: bossName,
    hp: 1000,
    type: 'godhome',
    targetId: id,
  },
});

const createEntry = (id: string, bossName: string): BossSequenceEntry => ({
  id,
  target: createTarget(id, bossName),
});

describe('SequenceSelector', () => {
  const pantheonSequence: SequenceSelectorProps['bossSequences'][number] = {
    id: 'pantheon-1',
    name: 'Pantheon of the Master',
    category: 'Godhome Pantheons',
    entries: [
      createEntry('p1-vengefly', 'Vengefly King'),
      createEntry('p1-gruz', 'Gruz Mother'),
    ],
    conditions: [
      {
        id: 'include-grey-prince',
        label: 'Include Grey Prince Zote',
        description: 'Adds Zote as the final fight.',
        defaultEnabled: false,
      },
    ],
    bindings: [
      {
        id: 'nail-binding',
        label: 'Nail Binding',
        description: 'Reduce Nail damage to 80%.',
        defaultEnabled: false,
      },
      {
        id: 'charms-binding',
        label: 'Charms Binding',
        description: 'Disable all charm effects.',
        defaultEnabled: false,
      },
    ],
  };

  const trialSequence: SequenceSelectorProps['bossSequences'][number] = {
    id: 'trial-1',
    name: 'Trial of the Warrior',
    category: 'Boss Rushes',
    entries: [createEntry('trial-1', 'Massive Moss Charger')],
    conditions: [
      {
        id: 'double-damage',
        label: 'Double damage mode',
        description: 'Take twice the damage per hit.',
        defaultEnabled: true,
      },
    ],
    bindings: [],
  };

  const renderSelector = (overrides: Partial<SequenceSelectorProps> = {}) => {
    let currentProps: SequenceSelectorProps = {
      title: 'Sequence run',
      description: 'Configure a full sequence run.',
      placeholder: 'Select a sequence',
      bossSequences: [pantheonSequence, trialSequence],
      sequenceSelectValue: '',
      onSequenceChange: vi.fn(),
      sequenceEntries: [],
      cappedSequenceIndex: 0,
      onStageSelect: vi.fn(),
      sequenceConditionValues: {},
      onConditionToggle: vi.fn(),
      sequenceBindingValues: {},
      onBindingToggle: vi.fn(),
      ...overrides,
    };

    const user = userEvent.setup();
    const view = render(<SequenceSelector {...currentProps} />);

    const rerenderWith = (nextOverrides: Partial<SequenceSelectorProps> = {}) => {
      currentProps = { ...currentProps, ...nextOverrides };
      view.rerender(<SequenceSelector {...currentProps} />);
    };

    return {
      user,
      rerenderWith,
      onSequenceChange: currentProps.onSequenceChange,
      onStageSelect: currentProps.onStageSelect,
      onConditionToggle: currentProps.onConditionToggle,
      onBindingToggle: currentProps.onBindingToggle,
      ...view,
    };
  };

  it('groups sequences by category and renders headings', () => {
    renderSelector();

    expect(
      screen.getByRole('heading', { name: 'Godhome Pantheons', level: 4 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Boss Rushes', level: 4 }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Select a sequence/i)).toBeChecked();
  });

  it('provides a hidden native select fallback for the legacy selector', async () => {
    const { user, onSequenceChange } = renderSelector();

    const fallbackSelect = screen.getByLabelText(/sequence run/i, {
      selector: 'select',
    });
    expect(fallbackSelect).toHaveClass('sr-only');
    expect(fallbackSelect).toHaveValue('');

    await user.selectOptions(fallbackSelect, pantheonSequence.id);
    expect(onSequenceChange).toHaveBeenCalledWith(pantheonSequence.id);
  });

  it('syncs the native select fallback with the selected sequence', () => {
    renderSelector({
      sequenceSelectValue: pantheonSequence.id,
    });

    const fallbackSelect = screen.getByLabelText(/sequence run/i, {
      selector: 'select',
    });
    expect(fallbackSelect).toHaveValue(pantheonSequence.id);
  });

  it('renders sequence conditions only for the active sequence', async () => {
    const { user, onConditionToggle, rerenderWith } = renderSelector({
      sequenceSelectValue: pantheonSequence.id,
      sequenceEntries: pantheonSequence.entries,
      sequenceConditionValues: {
        'include-grey-prince': true,
        'double-damage': false,
      },
    });

    const pantheonToggle = screen.getByRole('checkbox', {
      name: /Include Grey Prince Zote/i,
    });
    expect(pantheonToggle).toBeEnabled();
    expect(pantheonToggle).toBeChecked();

    await user.click(pantheonToggle);
    expect(onConditionToggle).toHaveBeenCalledWith('include-grey-prince', false);

    expect(
      screen.queryByRole('checkbox', { name: /Double damage mode/i }),
    ).not.toBeInTheDocument();

    rerenderWith({
      sequenceSelectValue: trialSequence.id,
      sequenceEntries: trialSequence.entries,
      sequenceConditionValues: {
        'include-grey-prince': false,
        'double-damage': true,
      },
    });

    const trialToggle = screen.getByRole('checkbox', {
      name: /Double damage mode/i,
    });
    expect(trialToggle).toBeEnabled();
    expect(trialToggle).toBeChecked();
  });

  it('renders Pantheon bindings and toggles their state when interactive', async () => {
    const alternatePantheon: SequenceSelectorProps['bossSequences'][number] = {
      ...pantheonSequence,
      id: 'pantheon-2',
      name: 'Pantheon of the Artist',
      entries: [createEntry('p2-gorb', 'Gorb')],
      bindings: pantheonSequence.bindings?.map((binding) => ({ ...binding })) ?? [],
    };

    const { user, onBindingToggle, rerenderWith } = renderSelector({
      bossSequences: [pantheonSequence, alternatePantheon, trialSequence],
      sequenceSelectValue: pantheonSequence.id,
      sequenceEntries: pantheonSequence.entries,
      sequenceBindingValues: {
        'nail-binding': true,
        'charms-binding': false,
      },
    });

    expect(screen.getAllByRole('checkbox', { name: /Nail Binding/i })).toHaveLength(1);

    const nailBindingToggle = screen.getByRole('checkbox', { name: /Nail Binding/i });
    expect(nailBindingToggle).toBeEnabled();
    expect(nailBindingToggle).toBeChecked();

    await user.click(nailBindingToggle);
    expect(onBindingToggle).toHaveBeenCalledWith('nail-binding', false);

    rerenderWith({
      sequenceSelectValue: alternatePantheon.id,
      sequenceEntries: alternatePantheon.entries,
      sequenceBindingValues: {
        'nail-binding': false,
        'charms-binding': true,
      },
    });

    expect(screen.getAllByRole('checkbox', { name: /Nail Binding/i })).toHaveLength(1);

    const alternateNailBindingToggle = screen.getByRole('checkbox', {
      name: /Nail Binding/i,
    });
    expect(alternateNailBindingToggle).toBeEnabled();
    expect(alternateNailBindingToggle).not.toBeChecked();
  });

  it('shows the selected sequence preview using resolved entries', async () => {
    const onStageSelect = vi.fn();
    const { user, onSequenceChange } = renderSelector({
      sequenceSelectValue: pantheonSequence.id,
      sequenceEntries: pantheonSequence.entries,
      cappedSequenceIndex: 1,
      onStageSelect,
    });

    const stageButton = screen.getByRole('button', {
      name: /Gruz Mother/i,
    });
    expect(stageButton).toHaveAttribute('aria-current', 'true');

    await user.click(stageButton);
    expect(onStageSelect).toHaveBeenCalledWith(1);

    await user.click(screen.getByLabelText(/Trial of the Warrior/i));
    expect(onSequenceChange).toHaveBeenCalledWith('trial-1');

    expect(
      screen.queryByRole('button', { name: /Massive Moss Charger/i }),
    ).not.toBeInTheDocument();
  });
});
