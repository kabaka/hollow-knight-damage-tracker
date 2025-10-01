import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { PlayerConfigModal } from './PlayerConfigModal';

const openModal = () =>
  renderWithFightProvider(<PlayerConfigModal isOpen onClose={() => {}} />);

describe('PlayerConfigModal charms', () => {
  it('retains rapid charm selections without dropping earlier choices', () => {
    openModal();

    const compassButton = screen.getByRole('button', {
      name: /wayward compass/i,
    });
    const swarmButton = screen.getByRole('button', {
      name: /gathering swarm/i,
    });

    act(() => {
      fireEvent.click(compassButton);
      fireEvent.click(swarmButton);
    });

    const equippedList = screen.getByRole('list');
    const equippedItems = within(equippedList).getAllByRole('listitem');

    expect(equippedItems).toHaveLength(2);
    expect(equippedItems[0]).toHaveTextContent(/wayward compass/i);
    expect(equippedItems[1]).toHaveTextContent(/gathering swarm/i);
  });
});
