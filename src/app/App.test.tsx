import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CHARM_FLIGHT_TIMEOUT_MS } from '../features/build-config/PlayerConfigModal';

import { App } from './App';
import { formatSequenceHeaderLabel } from './formatSequenceHeaderLabel';

const openLoadoutModal = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /open loadout configuration/i }));
  return screen.findByRole('dialog', { name: /player loadout/i });
};

const openBossFightPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  const modal = await openLoadoutModal(user);
  const bossTab = within(modal).getByRole('tab', { name: /boss fight/i });
  await user.click(bossTab);
  const panel = within(modal).getByRole('tabpanel', { name: /boss fight/i });
  return { modal, panel };
};

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the HUD banner and panels', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /damage tracker/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /attack/i, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: /combat log/i, level: 2 })).toBeVisible();
    expect(
      screen.getByRole('button', { name: /open loadout configuration/i }),
    ).toBeVisible();
    const banner = screen.getByRole('banner', { name: /damage tracker/i });
    expect(
      within(banner).getByRole('progressbar', { name: /boss hp/i }),
    ).toBeInTheDocument();
    expect(within(banner).getByText(/forgotten crossroads/i)).toBeInTheDocument();
    const mobileHud = screen.getByRole('button', {
      name: /boss status/i,
      hidden: true,
    });
    expect(within(mobileHud).getByText(/forgotten crossroads/i)).toBeInTheDocument();
  });

  it('allows selecting a custom boss target and updating HP from the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    const { panel } = await openBossFightPanel(user);
    const optionsToggle = within(panel).getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    await user.click(within(panel).getByRole('radio', { name: /custom/i }));
    const hpInput = await within(panel).findByLabelText(/custom target hp/i);
    await user.click(hpInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(hpInput, '500');

    const banner = screen.getByRole('banner', { name: /damage tracker/i });
    const bossChip = within(banner).getByRole('group', { name: /boss hp/i });
    await waitFor(() => {
      expect(within(bossChip).getByText(/500\s*\/\s*500/)).toBeInTheDocument();
    });
  });

  it('displays the sequence context in the header when running a sequence', async () => {
    const user = userEvent.setup();
    render(<App />);

    const { panel } = await openBossFightPanel(user);
    await user.click(within(panel).getByRole('tab', { name: /sequence run/i }));

    const sequenceSelect = await within(panel).findByLabelText(/sequence/i, {
      selector: 'select',
    });
    await user.selectOptions(sequenceSelect, 'pantheon-of-the-master');

    const banner = screen.getByRole('banner', { name: /damage tracker/i });
    await waitFor(() => {
      expect(
        within(banner).getByText(/pantheon of the master \(1\/\d+\)/i),
      ).toBeInTheDocument();
    });
    expect(within(banner).queryByText(/forgotten crossroads/i)).not.toBeInTheDocument();
    const mobileHud = screen.getByRole('button', {
      name: /boss status/i,
      hidden: true,
    });
    expect(
      within(mobileHud).getByText(/pantheon of the master \(1\/\d+\)/i),
    ).toBeInTheDocument();
    expect(
      within(mobileHud).queryByText(/forgotten crossroads/i),
    ).not.toBeInTheDocument();
  });

  it('filters the boss list with fuzzy search', async () => {
    const user = userEvent.setup();
    render(<App />);

    const { panel } = await openBossFightPanel(user);
    const search = await within(panel).findByLabelText(/search bosses/i);

    await user.type(search, 'rdnc');

    expect(
      await within(panel).findByRole('radio', { name: /the radiance/i }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole('radio', { name: /gruz mother/i }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    expect(
      within(panel).getByRole('radio', { name: /gruz mother/i }),
    ).toBeInTheDocument();
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();
    render(<App />);

    const { panel } = await openBossFightPanel(user);
    await user.click(within(panel).getByRole('radio', { name: /gruz mother/i }));
    const optionsToggle = within(panel).getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    const versionSelect = await within(panel).findByLabelText(/boss version/i);
    await user.selectOptions(versionSelect, 'gruz-mother__ascended');

    const banner = screen.getByRole('banner', { name: /damage tracker/i });
    const bossChip = within(banner).getByRole('group', { name: /boss hp/i });
    await waitFor(() => {
      const progressbar = within(bossChip).getByRole('progressbar', {
        name: /boss hp/i,
      });
      expect(progressbar).toHaveAttribute('aria-valuemax', '945');
      expect(within(bossChip).getByText(/945\s*\/\s*945/)).toBeInTheDocument();
    });
  });

  it('applies charm presets and enforces overcharm limits', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open loadout configuration/i }));

    const modal = await screen.findByRole('dialog', { name: /player loadout/i });

    await user.click(
      within(modal).getByRole('button', {
        name: /spellcaster \(shaman \+ twister\)/i,
      }),
    );

    const getCharmButton = (pattern: RegExp) =>
      within(modal)
        .getAllByRole('button', { name: pattern })
        .find(
          (button) => button.getAttribute('aria-pressed') !== null,
        ) as HTMLButtonElement;

    expect(getCharmButton(/shaman stone/i)).toHaveAttribute('aria-pressed', 'true');
    expect(getCharmButton(/spell twister/i)).toHaveAttribute('aria-pressed', 'true');

    const notchSlider = within(modal).getByRole('slider', { name: /notch limit/i });
    fireEvent.change(notchSlider, { target: { value: '5' } });

    const longnailButton = getCharmButton(/longnail/i);
    expect(longnailButton).toBeEnabled();
    await user.click(longnailButton);
    await within(modal).findByRole('button', { name: /longnail/i, pressed: true });
    expect(within(modal).getByRole('status')).toHaveTextContent(/overcharmed/i);

    const fragileStrengthButton = getCharmButton(/fragile strength/i);
    expect(fragileStrengthButton).toBeDisabled();
  });

  it('preserves the loadout modal scroll position while editing settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open loadout configuration/i }));
    const modal = await screen.findByRole('dialog', { name: /player loadout/i });
    const modalBody = within(modal).getByTestId('modal-body');

    modalBody.scrollTop = 200;

    await user.selectOptions(
      within(modal).getByLabelText(/nail upgrade/i),
      'channelled-nail',
    );

    expect(modalBody.scrollTop).toBe(200);
  });

  it('does not scroll the loadout modal to the top when selecting a charm', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open loadout configuration/i }));
    const modal = await screen.findByRole('dialog', { name: /player loadout/i });
    const modalBody = within(modal).getByTestId('modal-body');

    modalBody.scrollTop = 200;

    const [compassButton] = within(modal).getAllByRole('button', {
      name: /wayward compass/i,
    });
    await user.click(compassButton);

    await waitFor(() => {
      expect(modalBody.scrollTop).toBe(200);
    });
  });

  it('cleans up charm flights when cycling multi-state charms', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /open loadout configuration/i }));
    const modal = await screen.findByRole('dialog', { name: /player loadout/i });

    const getEquippedList = () =>
      within(modal).getByRole('list', { name: /equipped charms/i });

    const waitForNoFlights = async () => {
      await waitFor(
        () => {
          expect(screen.queryAllByTestId('charm-flight-sprite')).toHaveLength(0);
        },
        { timeout: CHARM_FLIGHT_TIMEOUT_MS + 400 },
      );
      await waitFor(
        () => {
          const equippedItems = within(getEquippedList()).queryAllByRole('listitem');
          for (const item of equippedItems) {
            expect(item).not.toHaveClass('equipped-panel__item--hidden');
          }
        },
        { timeout: CHARM_FLIGHT_TIMEOUT_MS + 400 },
      );
    };

    const getEquippedItem = (pattern: RegExp) =>
      within(getEquippedList()).queryByRole('listitem', { name: pattern });

    await user.click(within(modal).getAllByRole('button', { name: /fragile heart/i })[0]);
    await waitForNoFlights();
    expect(getEquippedItem(/fragile heart/i)).toBeInTheDocument();

    await user.click(
      within(modal).getAllByRole('button', { name: /unbreakable heart/i })[0],
    );
    await waitForNoFlights();
    expect(getEquippedItem(/unbreakable heart/i)).toBeInTheDocument();
    expect(getEquippedItem(/fragile heart/i)).not.toBeInTheDocument();

    await user.click(
      within(modal).getAllByRole('button', { name: /unbreakable heart/i })[0],
    );
    await waitForNoFlights();
    expect(within(getEquippedList()).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('surfaces sequence conditions in the setup tray when selecting a pantheon', async () => {
    const user = userEvent.setup();
    render(<App />);

    const { panel } = await openBossFightPanel(user);
    await user.click(within(panel).getByRole('tab', { name: /sequence run/i }));
    const sequencePanel = await within(panel).findByRole('tabpanel', {
      name: /sequence run/i,
    });

    const sequenceChoices = within(sequencePanel).getByRole('radiogroup', {
      name: /sequence run/i,
    });
    expect(
      within(sequenceChoices).getByRole('radio', { name: /select a sequence/i }),
    ).toBeChecked();

    await user.click(
      within(sequenceChoices).getByRole('radio', {
        name: /pantheon of the sage/i,
      }),
    );

    const conditionToggles = within(sequencePanel).getAllByRole('checkbox', {
      name: /include grey prince zote/i,
    });
    const interactiveCheckbox = conditionToggles.find((input) => !input.disabled);
    if (!interactiveCheckbox) {
      throw new Error('Expected an interactive sequence condition toggle');
    }
    expect(interactiveCheckbox).not.toBeChecked();

    await user.click(interactiveCheckbox);
    expect(interactiveCheckbox).toBeChecked();
  });
});

describe('formatSequenceHeaderLabel', () => {
  it('formats the sequence name with progress counts', () => {
    expect(
      formatSequenceHeaderLabel('Pantheon of the Master', { current: 1, total: 5 }),
    ).toBe('Pantheon of the Master (1/5)');
  });

  it('clamps invalid progress values into the displayed range', () => {
    expect(formatSequenceHeaderLabel('Trial', { current: 0, total: 0 })).toBe(
      'Trial (1/1)',
    );
    expect(formatSequenceHeaderLabel('Trial', { current: 8, total: 3 })).toBe(
      'Trial (3/3)',
    );
  });
});
