import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CHARM_FLIGHT_TIMEOUT_MS } from '../features/build-config/PlayerConfigModal';

import { App } from './App';
import { formatSequenceHeaderLabel } from './formatSequenceHeaderLabel';

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
    const changeEncounter = screen.getByRole('button', { name: /setup/i });
    expect(changeEncounter).toHaveAttribute('aria-expanded', 'false');
    const banner = screen.getByRole('banner');
    expect(
      within(banner).getByRole('progressbar', { name: /boss hp/i }),
    ).toBeInTheDocument();
    expect(within(banner).getByText(/forgotten crossroads/i)).toBeInTheDocument();
    const mobileHud = screen.getByRole('group', {
      name: /boss status/i,
      hidden: true,
    });
    expect(within(mobileHud).getByText(/forgotten crossroads/i)).toBeInTheDocument();
  });

  it('allows selecting a custom boss target and updating HP from the HUD', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /setup/i }));
    const optionsToggle = screen.getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    await user.click(screen.getByRole('radio', { name: /custom/i }));
    const hpInput = await screen.findByLabelText(/custom target hp/i);
    await user.click(hpInput);
    await user.keyboard('{Control>}a{/Control}');
    await user.keyboard('{Backspace}');
    await user.type(hpInput, '500');

    expect(
      within(screen.getByRole('banner')).getByText(/500\s*\/\s*500/),
    ).toBeInTheDocument();
  });

  it('displays the sequence context in the header when running a sequence', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /setup/i }));
    await user.click(screen.getByRole('tab', { name: /sequence run/i }));

    const sequenceSelect = await screen.findByLabelText(/sequence/i, {
      selector: 'select',
    });
    await user.selectOptions(
      sequenceSelect,
      within(sequenceSelect).getByRole('option', { name: /pantheon of the master/i }),
    );

    const banner = screen.getByRole('banner');
    await waitFor(() => {
      expect(
        within(banner).getByText(/pantheon of the master \(1\/\d+\)/i),
      ).toBeInTheDocument();
    });
    expect(within(banner).queryByText(/forgotten crossroads/i)).not.toBeInTheDocument();
    const mobileHud = screen.getByRole('group', {
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

    await user.click(screen.getByRole('button', { name: /setup/i }));
    const search = await screen.findByLabelText(/search bosses/i);

    await user.type(search, 'rdnc');

    expect(
      await screen.findByRole('radio', { name: /the radiance/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /gruz mother/i })).not.toBeInTheDocument();

    await user.clear(search);
    expect(screen.getByRole('radio', { name: /gruz mother/i })).toBeInTheDocument();
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /setup/i }));
    await user.click(screen.getByRole('radio', { name: /gruz mother/i }));
    const optionsToggle = screen.getByRole('button', {
      name: /toggle advanced target options/i,
    });
    await user.click(optionsToggle);
    const versionSelect = await screen.findByLabelText(/boss version/i);
    await user.selectOptions(versionSelect, 'gruz-mother__ascended');

    expect(
      within(screen.getByRole('banner')).getByText(/945\s*\/\s*945/),
    ).toBeInTheDocument();
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
    expect(longnailButton).not.toBeDisabled();
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
    const modalBody = modal.querySelector('.modal__body') as HTMLElement | null;
    if (!modalBody) {
      throw new Error('Expected the modal body to be present');
    }

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
    const modalBody = modal.querySelector('.modal__body') as HTMLElement | null;
    if (!modalBody) {
      throw new Error('Expected the modal body to be present');
    }

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

    const waitForNoFlights = async () => {
      await waitFor(
        () => {
          expect(modal.querySelectorAll('.charm-flight')).toHaveLength(0);
        },
        { timeout: CHARM_FLIGHT_TIMEOUT_MS + 200 },
      );
    };

    const getEquippedItem = (pattern: RegExp) =>
      within(modal).queryByRole('listitem', { name: pattern });

    await user.click(within(modal).getAllByRole('button', { name: /fragile heart/i })[0]);
    await waitForNoFlights();
    expect(getEquippedItem(/fragile heart/i)).not.toBeNull();

    await user.click(
      within(modal).getAllByRole('button', { name: /unbreakable heart/i })[0],
    );
    await waitForNoFlights();
    expect(getEquippedItem(/unbreakable heart/i)).not.toBeNull();
    expect(getEquippedItem(/fragile heart/i)).toBeNull();

    await user.click(
      within(modal).getAllByRole('button', { name: /unbreakable heart/i })[0],
    );
    await waitForNoFlights();
    expect(within(modal).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('surfaces sequence conditions in the setup tray when selecting a pantheon', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /setup/i }));
    await user.click(screen.getByRole('tab', { name: /sequence run/i }));
    const sequencePanel = screen.getByRole('tabpanel', { name: /sequence run/i });

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

    const selectedOption = within(sequencePanel)
      .getByText(/pantheon of the sage/i)
      .closest('.sequence-selector__option');
    expect(selectedOption).not.toBeNull();

    const checkbox = within(selectedOption as HTMLElement).getByRole('checkbox', {
      name: /include grey prince zote/i,
    });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
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
