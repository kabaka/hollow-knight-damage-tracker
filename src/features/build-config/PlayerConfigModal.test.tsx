import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import {
  CHARM_FLIGHT_TIMEOUT_MS,
  CharmFlightSprite,
  PlayerConfigModal,
} from './PlayerConfigModal';

const openModal = () => {
  window.localStorage.clear();
  return renderWithFightProvider(<PlayerConfigModal isOpen onClose={() => {}} />);
};

const baseAnimation = {
  key: 'flight',
  charmId: 'shaman-stone',
  direction: 'equip' as const,
  icon: '/charms/shaman-stone.png',
  from: { x: 5, y: 10 },
  to: { x: 20, y: 40 },
  size: { width: 32, height: 32 },
} as const;

describe('PlayerConfigModal tabs', () => {
  it('activates the requested panel when its tab is selected', async () => {
    const user = userEvent.setup();
    openModal();
    await Promise.resolve();

    const spellsTab = screen.getByRole('tab', { name: /spells/i });
    const charmsTab = screen.getByRole('tab', { name: /charms/i });
    await user.click(spellsTab);

    await waitFor(() => {
      expect(spellsTab).toHaveAttribute('aria-selected', 'true');
    });
    expect(charmsTab).toHaveAttribute('aria-selected', 'false');

    const tabPanels = screen.getAllByRole('tabpanel', { hidden: true });
    const findPanelByTab = (tabId: string | null) =>
      tabPanels.find((panel) => panel.getAttribute('aria-labelledby') === tabId);

    const spellsPanel = findPanelByTab(spellsTab.id);
    expect(spellsPanel).toBeDefined();
    expect(spellsPanel).not.toHaveAttribute('hidden');

    const charmsPanel = findPanelByTab(charmsTab.id);
    expect(charmsPanel).toBeDefined();
    expect(charmsPanel).toHaveAttribute('hidden');
  });

  it('supports roving focus and selection via keyboard navigation', async () => {
    const user = userEvent.setup();
    openModal();
    await Promise.resolve();

    const charmsTab = screen.getByRole('tab', { name: /charms/i });
    charmsTab.focus();
    expect(charmsTab).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    const synergiesTab = screen.getByRole('tab', { name: /charm synergies/i });
    expect(synergiesTab).toHaveFocus();
    expect(synergiesTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{End}');
    const bossTab = screen.getByRole('tab', { name: /boss fight/i });
    expect(bossTab).toHaveFocus();
    expect(bossTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}');
    const spellsTab = screen.getByRole('tab', { name: /spells/i });
    expect(spellsTab).toHaveFocus();
    expect(spellsTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('PlayerConfigModal charms', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retains rapid charm selections without dropping earlier choices', async () => {
    const user = userEvent.setup();
    openModal();

    const compassButton = screen.getByRole('button', {
      name: /wayward compass/i,
    });
    const swarmButton = screen.getByRole('button', {
      name: /gathering swarm/i,
    });

    await user.click(compassButton);
    await user.click(swarmButton);

    const equippedList = screen.getByRole('list', { name: /equipped charms/i });
    await waitFor(() => {
      const equippedItems = within(equippedList).getAllByRole('listitem');
      expect(equippedItems).toHaveLength(2);
      expect(equippedItems[0]).toHaveTextContent(/wayward compass/i);
      expect(equippedItems[1]).toHaveTextContent(/gathering swarm/i);
    });
  });

  it('recovers hidden equipped slots when flights are interrupted mid-transition', async () => {
    const user = userEvent.setup();
    openModal();

    const modal = screen.getByRole('dialog', { name: /player loadout/i });
    const clickCharm = async (pattern: RegExp) => {
      const buttons = within(modal).getAllByRole('button', { name: pattern });
      const target =
        buttons.find((button) => button.getAttribute('aria-pressed') === 'true') ??
        buttons[0];
      await user.click(target);
    };

    await clickCharm(/fragile heart/i);
    await clickCharm(/unbreakable heart/i);
    await clickCharm(/fragile heart/i);

    await waitFor(
      () => {
        expect(screen.queryAllByTestId('charm-flight-sprite')).toHaveLength(0);
      },
      { timeout: CHARM_FLIGHT_TIMEOUT_MS + 400 },
    );

    const equippedList = within(modal).getByRole('list', { name: /equipped charms/i });
    await waitFor(() => {
      const equippedItems = within(equippedList).getAllByRole('listitem');
      expect(equippedItems).toHaveLength(1);
      expect(equippedItems[0]).toHaveTextContent(/fragile heart/i);
      expect(equippedItems[0]).not.toHaveClass('equipped-panel__item--hidden');
    });
  });

  it('reveals equipped charms after real flight durations', async () => {
    const user = userEvent.setup();
    openModal();

    const modal = screen.getByRole('dialog', { name: /player loadout/i });
    const [fragileButton] = within(modal).getAllByRole('button', {
      name: /fragile heart/i,
    });

    const clickVariant = async (pattern: RegExp) => {
      const buttons = within(modal).getAllByRole('button', { name: pattern });
      const active = buttons.find(
        (button) => button.getAttribute('aria-pressed') === 'true',
      );
      const target = active ?? buttons[0];
      await user.click(target);
    };

    await user.click(fragileButton);
    await waitFor(() => {
      expect(screen.queryAllByTestId('charm-flight-sprite')).toHaveLength(0);
    });
    await waitFor(() => {
      const equippedItems = within(modal).queryAllByRole('listitem');
      for (const item of equippedItems) {
        expect(item).not.toHaveClass('equipped-panel__item--hidden');
      }
    });

    await clickVariant(/unbreakable heart/i);
    await waitFor(() => {
      expect(screen.queryAllByTestId('charm-flight-sprite')).toHaveLength(0);
    });
    await waitFor(() => {
      const equippedItems = within(modal).queryAllByRole('listitem');
      for (const item of equippedItems) {
        expect(item).not.toHaveClass('equipped-panel__item--hidden');
      }
    });
    const equippedList = within(modal).getByRole('list', { name: /equipped charms/i });
    const equippedItems = within(equippedList).getAllByRole('listitem');
    expect(equippedItems).toHaveLength(1);
    expect(equippedItems[0]).toHaveTextContent(/unbreakable heart/i);
    expect(
      within(modal).queryByRole('listitem', { name: /fragile heart/i }),
    ).not.toBeInTheDocument();

    await clickVariant(/unbreakable heart/i);
    await waitFor(() => {
      expect(screen.queryAllByTestId('charm-flight-sprite')).toHaveLength(0);
    });
    await waitFor(() => {
      const equippedItems = within(modal).queryAllByRole('listitem');
      for (const item of equippedItems) {
        expect(item).not.toHaveClass('equipped-panel__item--hidden');
      }
    });
    await waitFor(() => {
      expect(within(equippedList).queryAllByRole('listitem')).toHaveLength(0);
    });
  });
});

describe('CharmFlightSprite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for a second animation frame before moving to the destination', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const requestSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const onComplete = vi.fn();

    const view = render(
      <CharmFlightSprite animation={baseAnimation} onComplete={onComplete} />,
    );

    const element = screen.getByTestId('charm-flight-sprite') as HTMLImageElement;
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: baseAnimation.size.width,
      height: baseAnimation.size.height,
      top: 10,
      left: 20,
      bottom: 42,
      right: 52,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);

    expect(rafCallbacks).toHaveLength(1);
    expect(element).toHaveStyle({ transform: 'translate(5px, 10px)' });

    act(() => {
      rafCallbacks[0](0);
    });

    expect(rectSpy).toHaveBeenCalledTimes(1);
    expect(rafCallbacks).toHaveLength(2);

    act(() => {
      rafCallbacks[1](16);
    });

    expect(element).toHaveStyle({ transform: 'translate(20px, 40px)' });
    expect(onComplete).not.toHaveBeenCalled();

    view.unmount();

    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(cancelSpy).toHaveBeenCalledWith(1);
    expect(cancelSpy).toHaveBeenCalledWith(2);
  });

  it('completes immediately when no movement is needed', () => {
    const requestSpy = vi.spyOn(window, 'requestAnimationFrame');
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const onComplete = vi.fn();

    render(
      <CharmFlightSprite
        animation={{
          ...baseAnimation,
          key: 'static-flight',
          from: { x: 12, y: 18 },
          to: { x: 12, y: 18 },
        }}
        onComplete={onComplete}
      />,
    );

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'static-flight' }),
    );
    expect(requestSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });
});
