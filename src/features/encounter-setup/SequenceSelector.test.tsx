import { render, screen, within } from '@testing-library/react';
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
    category: 'Pantheons',
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
  };

  const trialSequence: SequenceSelectorProps['bossSequences'][number] = {
    id: 'trial-1',
    name: 'Trial of the Warrior',
    category: 'Trials',
    entries: [createEntry('trial-1', 'Massive Moss Charger')],
    conditions: [
      {
        id: 'double-damage',
        label: 'Double damage mode',
        description: 'Take twice the damage per hit.',
        defaultEnabled: true,
      },
    ],
  };

  const renderSelector = (overrides: Partial<SequenceSelectorProps> = {}) => {
    const defaultProps: SequenceSelectorProps = {
      title: 'Sequence run',
      description: 'Configure a full Godhome run.',
      placeholder: 'Select a Godhome sequence',
      bossSequences: [pantheonSequence, trialSequence],
      sequenceSelectValue: '',
      onSequenceChange: vi.fn(),
      sequenceEntries: [],
      cappedSequenceIndex: 0,
      onStageSelect: vi.fn(),
      sequenceConditionValues: {},
      onConditionToggle: vi.fn(),
      ...overrides,
    };

    const user = userEvent.setup();
    return {
      user,
      onSequenceChange: defaultProps.onSequenceChange,
      onStageSelect: defaultProps.onStageSelect,
      onConditionToggle: defaultProps.onConditionToggle,
      ...render(<SequenceSelector {...defaultProps} />),
    };
  };

  it('groups sequences by category and renders headings', () => {
    renderSelector();

    expect(
      screen.getByRole('heading', { name: 'Pantheons', level: 4 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trials', level: 4 })).toBeInTheDocument();

    expect(screen.getByLabelText(/Select a Godhome sequence/i)).toBeChecked();
  });

  it('exposes sequence conditions while disabling unselected options', async () => {
    const { user, onConditionToggle } = renderSelector({
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

    const trialOption = screen
      .getByText('Trial of the Warrior')
      .closest('.sequence-selector__option');
    expect(trialOption).not.toBeNull();

    const trialToggle = within(trialOption as HTMLElement).getByRole('checkbox', {
      name: /Double damage mode/i,
    });
    expect(trialToggle).toBeDisabled();
    expect(trialToggle).toBeChecked();
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
